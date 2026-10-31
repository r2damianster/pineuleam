import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeGestionarVinculacion } from '@/lib/modulos';
import { TIPOS_HORAS, horasContables, topesPorDefectoSegunModulos, type TopesPasante, type TipoHoras } from '@/lib/topesHoras';
import { proyectarPasante, estadoDesdeProyeccion, type EstadoProyeccion as Estado } from '@/lib/proyeccionHoras';

// Proyección de cumplimiento de horas — solo líder de Vinculación / superadmin.
// GET ?periodo_id=N (por defecto el ciclo que contiene hoy, o el más reciente).
export async function GET(request: Request) {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !puedeGestionarVinculacion(usuario)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });

  const periodos = await sql`
    SELECT id, nombre, fecha_inicio::text AS fecha_inicio, fecha_fin::text AS fecha_fin
    FROM ciclos_academicos WHERE fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL ORDER BY fecha_inicio DESC`;
  if (periodos.length === 0) return NextResponse.json({ error: 'No hay períodos académicos con fechas' }, { status: 404 });

  const hoy = new Date();
  const hoyTexto = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const periodoParam = Number(new URL(request.url).searchParams.get('periodo_id'));
  const periodo =
    periodos.find((p: any) => p.id === periodoParam) ||
    periodos.find((p: any) => p.fecha_inicio <= hoyTexto && hoyTexto <= p.fecha_fin) ||
    periodos[0];

  const filas = await sql`
    SELECT u.id, u.nombres, u.apellidos, u.modulos_acceso,
      t.tope_asistencia::float AS tope_asistencia, t.tope_autonomas::float AS tope_autonomas,
      t.tope_investigacion::float AS tope_investigacion, t.tope_podcast::float AS tope_podcast,
      t.meta_total::float AS meta_total, (t.usuario_id IS NOT NULL) AS tiene_tope_propio,
      COALESCE((SELECT SUM(horas) FROM horas_asistencia_instructor WHERE usuario_id = u.id), 0)::float AS asistencia_aprobadas,
      COALESCE((SELECT SUM(horas) FROM actividades_autonomas_pasante WHERE usuario_id = u.id AND estado_aprobacion = 'aprobado'), 0)::float AS autonomas_aprobadas,
      COALESCE((SELECT SUM(horas) FROM actividades_investigacion_pasante WHERE usuario_id = u.id AND estado_aprobacion = 'aprobado'), 0)::float AS investigacion_aprobadas,
      COALESCE((SELECT SUM(horas_total) FROM horas_podcast_pasante WHERE usuario_id = u.id AND estado_aprobacion = 'aprobado'), 0)::float AS podcast_aprobadas,
      (
        COALESCE((SELECT SUM(horas) FROM actividades_autonomas_pasante WHERE usuario_id = u.id AND estado_aprobacion = 'pendiente'), 0)
        + COALESCE((SELECT SUM(horas) FROM actividades_investigacion_pasante WHERE usuario_id = u.id AND estado_aprobacion = 'pendiente'), 0)
        + COALESCE((SELECT SUM(horas_total) FROM horas_podcast_pasante WHERE usuario_id = u.id AND estado_aprobacion = 'pendiente'), 0)
      )::float AS pendientes,
      COALESCE((SELECT SUM(h.horas) FROM horas_asistencia_instructor h JOIN asistencia_espacio a ON a.id = h.asistencia_id
                WHERE h.usuario_id = u.id AND a.fecha BETWEEN ${periodo.fecha_inicio}::date AND ${periodo.fecha_fin}::date), 0)::float AS asistencia_en_ciclo,
      COALESCE((SELECT SUM(horas_total) FROM horas_podcast_pasante WHERE usuario_id = u.id AND estado_aprobacion = 'aprobado'
                AND creado_en::date BETWEEN ${periodo.fecha_inicio}::date AND ${periodo.fecha_fin}::date), 0)::float AS podcast_en_ciclo,
      COALESCE((SELECT string_agg(DISTINCT p.nombres || ' ' || p.apellidos, ', ')
                FROM espacio_instructores ei JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
                JOIN usuarios p ON p.id = e.profesor_id
                WHERE ei.usuario_id = u.id AND e.area = 'vinculacion'), '') AS supervisores
    FROM usuarios u
    LEFT JOIN topes_horas_pasante t ON t.usuario_id = u.id
    WHERE u.rol = 'estudiante' AND u.activado = true
      AND EXISTS (SELECT 1 FROM espacio_instructores ei JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
                  WHERE ei.usuario_id = u.id AND e.area = 'vinculacion')
    ORDER BY u.nombres, u.apellidos`;

  const data = filas.map((fila: any) => {
    const topes: TopesPasante = fila.tiene_tope_propio
      ? { asistencia: fila.tope_asistencia, autonomas: fila.tope_autonomas, investigacion: fila.tope_investigacion, podcast: fila.tope_podcast, meta: fila.meta_total }
      : topesPorDefectoSegunModulos(fila.modulos_acceso);
    const aprobadas: Record<TipoHoras, number> = {
      asistencia: fila.asistencia_aprobadas, autonomas: fila.autonomas_aprobadas,
      investigacion: fila.investigacion_aprobadas, podcast: fila.podcast_aprobadas,
    };
    const contables = horasContables(aprobadas, topes);
    // Modelo: horas FLEXIBLES (autónomas + investigación) el pasante las registra cuando quiera, incluso al final,
    // así que no se proyectan por ritmo: se asume que completa su tope (sin tope, solo lo ya aprobado).
    // Horas DE RITMO (clubes y podcast) sí dependen del avance: cada tipo se proyecta POR SEPARADO contra su
    // propia meta. metaRitmo = meta − flexibles asumidas es lo que reparten entre los dos.
    const flexiblesActuales = contables.porTipo.autonomas + contables.porTipo.investigacion;
    const asumida = (tipo: 'autonomas' | 'investigacion') =>
      topes[tipo] === null ? contables.porTipo[tipo] : Math.max(topes[tipo] as number, contables.porTipo[tipo]);
    const flexiblesAsumidas = asumida('autonomas') + asumida('investigacion');
    const flexiblesPorCumplir = Math.max(0, flexiblesAsumidas - flexiblesActuales);
    const metaRitmo = Math.max(0, topes.meta - flexiblesAsumidas);
    const ritmoAcumuladas = contables.total - flexiblesActuales;
    const horasFaltantes = Math.max(0, topes.meta - contables.total);
    const redondear = (valor: number) => Math.round(valor * 10) / 10;

    // Tipos de ritmo habilitados (tope 0 = no aplica). Meta de cada uno: su tope si lo tiene; si es libre,
    // lo que queda de metaRitmo tras el tope del otro. Si ambos son libres no hay forma de separarlos: se
    // proyectan juntos como "Clubes + podcast".
    // Un pasante sin tope de podcast que nunca hizo podcast ni tiene el módulo de video no proyecta podcast.
    const haceYPodcast = topes.podcast !== null || aprobadas.podcast > 0 || (fila.modulos_acceso || []).includes('subir_video');
    const tiposRitmo = (['asistencia', 'podcast'] as const).filter(tipo => topes[tipo] !== 0 && (tipo === 'asistencia' || haceYPodcast));
    const enCiclo = { asistencia: fila.asistencia_en_ciclo as number, podcast: fila.podcast_en_ciclo as number };
    const combinado = tiposRitmo.length === 2 && topes.asistencia === null && topes.podcast === null;
    const metaDe = (tipo: 'asistencia' | 'podcast'): number => {
      const tope = topes[tipo];
      if (tope !== null) return Math.min(tope, metaRitmo);
      const otro = tiposRitmo.find(candidato => candidato !== tipo);
      const topeOtro = otro && topes[otro] !== null ? Math.min(topes[otro] as number, metaRitmo) : 0;
      return Math.max(0, metaRitmo - topeOtro);
    };
    const entradasRitmo: { tipo: 'asistencia' | 'podcast' | 'combinado'; etiqueta: string; acumuladas: number; meta: number; enCiclo: number }[] = combinado
      ? [{ tipo: 'combinado', etiqueta: 'Clubes + podcast', acumuladas: ritmoAcumuladas, meta: metaRitmo, enCiclo: enCiclo.asistencia + enCiclo.podcast }]
      : tiposRitmo.map(tipo => ({
          tipo, etiqueta: tipo === 'asistencia' ? 'Clubes' : 'Podcast',
          acumuladas: contables.porTipo[tipo], meta: metaDe(tipo), enCiclo: enCiclo[tipo],
        }));
    const ritmo = entradasRitmo.map(entrada => {
      const proy = proyectarPasante({
        inicioCiclo: periodo.fecha_inicio, finCiclo: periodo.fecha_fin, hoy,
        horasAcumuladas: entrada.acumuladas, horasEnCiclo: entrada.enCiclo, meta: Math.max(entrada.meta, 0.0001),
      });
      return {
        tipo: entrada.tipo, etiqueta: entrada.etiqueta,
        acumuladas: redondear(entrada.acumuladas), meta: redondear(entrada.meta),
        horasPorSemana: proy.horasPorSemana, proyeccion: redondear(proy.proyeccionFinal),
        deficit: redondear(Math.max(0, entrada.meta - proy.proyeccionFinal)),
        horasPorSemanaRequeridas: proy.horasPorSemanaRequeridas,
        estado: estadoDesdeProyeccion(proy.proyeccionFinal, Math.max(0, entrada.meta - entrada.acumuladas), entrada.meta),
        confianzaBaja: proy.confianzaBaja, diasTranscurridos: proy.diasTranscurridos, diasRestantes: proy.diasRestantes,
      };
    });
    // Estado general: el peor de los tipos de ritmo; "completo" solo si ya alcanzó la meta total.
    const ORDEN_ESTADO: Estado[] = ['no_cumple', 'en_riesgo', 'cumple', 'completo'];
    const peor = ritmo.reduce<Estado>((acumulado, item) => (ORDEN_ESTADO.indexOf(item.estado) < ORDEN_ESTADO.indexOf(acumulado) ? item.estado : acumulado), 'completo');
    const proyeccionRitmo = ritmo.reduce((suma, item) => suma + item.proyeccion, 0);
    const requeridas = ritmo.map(item => item.horasPorSemanaRequeridas).filter((valor): valor is number => valor !== null);
    const dias = ritmo[0] ?? { diasTranscurridos: 0, diasRestantes: 0 };
    const proyeccion = {
      diasTranscurridos: dias.diasTranscurridos,
      diasRestantes: dias.diasRestantes,
      confianzaBaja: ritmo.some(item => item.confianzaBaja),
      horasPorSemana: redondear(ritmo.reduce((suma, item) => suma + item.horasPorSemana, 0)),
      proyeccionRitmo: redondear(proyeccionRitmo),
      proyeccionTotal: redondear(Math.min(topes.meta, proyeccionRitmo + flexiblesAsumidas)),
      deficitProyectado: redondear(ritmo.reduce((suma, item) => suma + item.deficit, 0)),
      horasFaltantes: redondear(horasFaltantes),
      horasPorSemanaRequeridas: requeridas.length === 0 ? null : redondear(requeridas.reduce((suma, valor) => suma + valor, 0)),
      estado: (horasFaltantes === 0 ? 'completo' : peor) as Estado,
    };
    // Cupo por tipo para reasignar: lo que aún cabe bajo el tope (0 = no habilitado, null = libre hasta la meta).
    const cupos = TIPOS_HORAS.map(({ id, etiqueta }) => {
      const tope = topes[id];
      const cupo = tope === null ? Math.max(0, topes.meta - contables.total) : Math.max(0, tope - contables.porTipo[id]);
      return { tipo: id, etiqueta, cupo: Math.round(cupo * 10) / 10 };
    }).filter(item => item.cupo > 0);
    return {
      id: fila.id, nombres: fila.nombres, apellidos: fila.apellidos, supervisores: fila.supervisores,
      meta: topes.meta, acumuladas: Math.round(contables.total * 10) / 10, pendientes: Math.round(fila.pendientes * 10) / 10,
      porTipo: contables.porTipo, cupos, ritmo, ...proyeccion,
      metaRitmo: redondear(metaRitmo),
      ritmoAcumuladas: redondear(ritmoAcumuladas),
      flexibles: {
        autonomas: { registradas: redondear(contables.porTipo.autonomas), tope: redondear(asumida('autonomas')) },
        investigacion: { registradas: redondear(contables.porTipo.investigacion), tope: redondear(asumida('investigacion')) },
      },
      flexiblesPorCumplir: redondear(flexiblesPorCumplir),
    };
  });

  return NextResponse.json({ success: true, periodo, periodos, data });
}
