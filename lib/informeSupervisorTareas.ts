// Datos del "Informe de Seguimiento de Tareas (Supervisor)" — formato institucional.
// Las tareas salen de proyecto_actividades_plan (marco lógico) y cada una se calcula desde su `fuente`.
import type { NeonQueryFunction } from '@neondatabase/serverless';
import { clasificarRangoEdad } from './informesVinculacion';
import { construirPeriodo, type PeriodoProyecto } from './periodosProyecto';
import { horasNoClubPorUsuario } from './horasNoClubPasante';

type Sql = NeonQueryFunction<false, false>;

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MAXIMO_FOTOS = 6;

export interface ContextoSupervisor {
  supervisorId: number;
  espaciosClubIds: number[];
  espaciosInvestigacionIds: number[];
  pasantesIds: number[];
  /** Docentes responsables cuyos eventos cuentan (supervisor: solo él; proyecto: todos). */
  docentesIds?: number[];
}

export interface RegistrosFuente {
  cantidad: number | null; // valor medido contra la meta (espacios, programas, %…)
  pasantesIds: number[];
  sesiones: number;
  horas: number;
  detalle: string;
  audiencia?: number; // audiencia alcanzada (podcasts y eventos)
}

export interface TareaInforme {
  codigo: string;
  nombre: string;
  meta: number | null;
  unidad: string;
  fuente: string;
  realizado: number | null;
  avance: number | null; // 0-100
  alumnos: number;
  audiencia: number;
  productos_sociales: string;
  productos_academicos: string;
  observaciones: string;
  mesInicio: number | null;
  mesFin: number | null;
  ejecucionPorMes: Record<number, boolean>;
}

export const dosDigitos = (valor: number) => String(valor).padStart(2, '0');

function calcularAvance(realizado: number | null, meta: number | null): number | null {
  if (realizado == null || meta == null || meta <= 0) return null;
  return Math.min(100, Math.round((realizado / meta) * 100));
}

function mesDeFecha(valor: unknown): number | null {
  const texto = String(valor ?? '');
  const coincidencia = /^\d{4}-(\d{2})/.exec(texto);
  return coincidencia ? Number(coincidencia[1]) : null;
}

/** Mide lo realizado por una tarea entre `desde` y `hasta`, según su fuente. */
export async function registrosPorFuente(
  sql: Sql,
  fuente: string,
  contexto: ContextoSupervisor,
  desde: string,
  hasta: string
): Promise<RegistrosFuente> {
  const vacio: RegistrosFuente = { cantidad: 0, pasantesIds: [], sesiones: 0, horas: 0, detalle: '' };
  const { pasantesIds, espaciosClubIds, supervisorId } = contexto;
  const docentesIds = contexto.docentesIds?.length ? contexto.docentesIds : [supervisorId];
  const idsPasantes = pasantesIds.length ? pasantesIds : [0];

  if (fuente === 'asistencia_club') {
    if (!espaciosClubIds.length) return vacio;
    const [resumen] = await sql`
      SELECT COUNT(DISTINCT a.espacio_id)::int AS espacios,
             COUNT(a.id)::int AS sesiones,
             COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (a.hora_fin::time - a.hora_inicio::time))/3600.0)::numeric, 1), 0)::float AS horas
      FROM asistencia_espacio a
      WHERE a.espacio_id = ANY(${espaciosClubIds})
        AND a.estado_aprobacion = 'aprobado'
        AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date
    `;
    const instructores = await sql`
      SELECT DISTINCT ai.usuario_id
      FROM asistencia_instructores ai
      JOIN asistencia_espacio a ON a.id = ai.asistencia_id
      WHERE a.espacio_id = ANY(${espaciosClubIds})
        AND a.estado_aprobacion = 'aprobado'
        AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date
    `;
    return {
      cantidad: resumen.espacios,
      pasantesIds: instructores.map((fila: any) => fila.usuario_id),
      sesiones: resumen.sesiones,
      horas: resumen.horas,
      detalle: `${resumen.sesiones} sesiones aprobadas en ${resumen.espacios} espacio(s), ${resumen.horas} h`,
    };
  }

  if (fuente === 'autonomas_encuesta') {
    const [autonomas] = await sql`
      SELECT COUNT(*)::int AS actividades, COALESCE(SUM(horas), 0)::float AS horas
      FROM actividades_autonomas_pasante
      WHERE usuario_id = ANY(${idsPasantes}) AND estado_aprobacion = 'aprobado'
        AND fecha BETWEEN ${desde}::date AND ${hasta}::date
    `;
    const autores = await sql`
      SELECT DISTINCT usuario_id FROM actividades_autonomas_pasante
      WHERE usuario_id = ANY(${idsPasantes}) AND estado_aprobacion = 'aprobado'
        AND fecha BETWEEN ${desde}::date AND ${hasta}::date
    `;
    const espaciosSupervisor = [...espaciosClubIds, ...contexto.espaciosInvestigacionIds];
    const [encuesta] = espaciosSupervisor.length
      ? await sql`
          SELECT COUNT(*)::int AS respuestas, AVG(es.nivel_satisfaccion)::float AS promedio
          FROM encuestas_satisfaccion es
          WHERE es.beneficiario_id IN (SELECT ie.beneficiario_id FROM inscripciones_espacio ie WHERE ie.espacio_id = ANY(${espaciosSupervisor}))
            AND es.fecha BETWEEN ${desde}::date AND ${hasta}::date
        `
      : [{ respuestas: 0, promedio: null }];
    const satisfaccion = encuesta.promedio != null ? Math.round((encuesta.promedio / 5) * 1000) / 10 : null;
    if (!autonomas.actividades && satisfaccion == null) return { ...vacio, cantidad: null };
    const partes = [] as string[];
    if (autonomas.actividades) partes.push(`${autonomas.actividades} actividades de planificación/recursos (${autonomas.horas} h)`);
    partes.push(satisfaccion != null ? `satisfacción ${satisfaccion}% (${encuesta.respuestas} encuestas)` : 'sin encuestas de satisfacción aplicadas');
    return {
      cantidad: satisfaccion ?? 0,
      pasantesIds: autores.map((fila: any) => fila.usuario_id),
      sesiones: autonomas.actividades,
      horas: autonomas.horas,
      detalle: partes.join('; '),
    };
  }

  if (fuente === 'podcast') {
    const episodios = await sql`
      SELECT v.id, v.title, hp.usuario_id, COALESCE(v.audiencia_alcanzada, 0)::int AS audiencia
      FROM horas_podcast_pasante hp
      JOIN videos v ON v.id = hp.video_id
      WHERE hp.usuario_id = ANY(${idsPasantes}) AND hp.estado_aprobacion = 'aprobado'
        AND LEFT(COALESCE(v.published_date::text, v.created::text), 10)::date BETWEEN ${desde}::date AND ${hasta}::date
    `;
    const ids = Array.from(new Set(episodios.map((fila: any) => fila.id)));
    const audienciaPodcast = ids.reduce((total: number, id: any) => total + (episodios.find((fila: any) => fila.id === id)?.audiencia ?? 0), 0);
    return {
      cantidad: ids.length,
      audiencia: audienciaPodcast,
      pasantesIds: Array.from(new Set(episodios.map((fila: any) => fila.usuario_id))),
      sesiones: ids.length,
      horas: 0,
      detalle: ids.length ? `${ids.length} episodio(s) de podcast aprobados, audiencia alcanzada: ${audienciaPodcast} personas` : '',
    };
  }

  if (fuente === 'evento') {
    const eventos = await sql`
      SELECT d.id, d.titulo, d.registrador_id, COALESCE(d.audiencia_alcanzada, 0)::int AS audiencia
      FROM actividades_difusion d
      WHERE d.tipo <> 'podcast' AND d.aprobado_sitio = true
        AND d.fecha BETWEEN ${desde}::date AND ${hasta}::date
        AND (d.registrador_id = ANY(${[...idsPasantes, ...docentesIds]}) OR d.profesores_responsables && ${docentesIds}::int[])
    `;
    const audienciaEventos = eventos.reduce((total: number, fila: any) => total + fila.audiencia, 0);
    return {
      cantidad: eventos.length,
      audiencia: audienciaEventos,
      pasantesIds: Array.from(new Set(eventos.map((fila: any) => fila.registrador_id).filter((id: number) => pasantesIds.includes(id)))),
      sesiones: eventos.length,
      horas: 0,
      detalle: eventos.length ? `Eventos: ${eventos.map((fila: any) => fila.titulo).join('; ')} (audiencia alcanzada: ${audienciaEventos})` : '',
    };
  }

  if (fuente === 'investigacion') {
    const actividades = await sql`
      SELECT usuario_id, COALESCE(SUM(horas), 0)::float AS horas, COUNT(*)::int AS registros
      FROM actividades_investigacion_pasante
      WHERE usuario_id = ANY(${idsPasantes}) AND estado_aprobacion = 'aprobado'
        AND fecha BETWEEN ${desde}::date AND ${hasta}::date
      GROUP BY usuario_id
    `;
    const horas = actividades.reduce((total: number, fila: any) => total + fila.horas, 0);
    // Descripciones reales (con el proyecto al que aporta cada pasante) para que la redacción
    // con IA del informe use datos concretos y no solo conteos.
    const descripciones = actividades.length
      ? await sql`
          SELECT COALESCE(py.nombre_oficial, 'Proyecto sin asignar') AS proyecto_nombre, a.descripcion, a.horas::float AS horas
          FROM actividades_investigacion_pasante a
          LEFT JOIN proyectos py ON py.id = a.proyecto_id
          WHERE a.usuario_id = ANY(${idsPasantes}) AND a.estado_aprobacion = 'aprobado'
            AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date
          ORDER BY a.fecha ASC, a.id ASC
        `
      : [];
    const detalleDescripciones = descripciones
      .map((fila: any) => `${fila.descripcion} (${fila.horas} h, aporta a: ${fila.proyecto_nombre})`)
      .join('; ');
    return {
      cantidad: actividades.length,
      pasantesIds: actividades.map((fila: any) => fila.usuario_id),
      sesiones: actividades.reduce((total: number, fila: any) => total + fila.registros, 0),
      horas,
      detalle: actividades.length
        ? `${actividades.length} estudiante(s) con actividades de investigación aprobadas (${horas} h): ${detalleDescripciones}`
        : '',
    };
  }

  return { ...vacio, cantidad: null };
}

export function elegirFotos(candidatas: any[], maximo = MAXIMO_FOTOS): any[] {
  const mezcladas = [...candidatas].sort(() => Math.random() - 0.5);
  // Las marcadas por el supervisor primero; luego una por espacio; luego el resto al azar.
  const marcadas = mezcladas.filter(foto => foto.usar_en_informe);
  const elegidas: any[] = [];
  const espaciosUsados = new Set<string>();
  const agregar = (foto: any) => {
    if (elegidas.length < maximo && !elegidas.includes(foto)) elegidas.push(foto);
  };
  marcadas.forEach(agregar);
  marcadas.forEach(foto => espaciosUsados.add(foto.espacio_nombre));
  mezcladas.forEach(foto => {
    if (!espaciosUsados.has(foto.espacio_nombre)) {
      espaciosUsados.add(foto.espacio_nombre);
      agregar(foto);
    }
  });
  mezcladas.forEach(agregar);
  return elegidas;
}

function hoyEcuadorTexto(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function datosInformeSupervisor(
  sql: Sql,
  params: { supervisorId: number; anio: number; numero: 1 | 2 }
) {
  // Informe semestral real (periodos fijos abr–ago / sep–dic): un solo documento por periodo,
  // con corte a hoy si el periodo sigue en curso (mismo criterio que el informe del líder).
  const periodoProyecto: PeriodoProyecto = construirPeriodo(params.anio, params.numero);
  const hoy = hoyEcuadorTexto();
  const hastaCorte = hoy < periodoProyecto.hasta ? hoy : periodoProyecto.hasta;
  const desdePeriodo = periodoProyecto.desde;
  const mesesPeriodo = Array.from({ length: periodoProyecto.mesFin - periodoProyecto.mesInicio + 1 }, (_, indice) => periodoProyecto.mesInicio + indice);
  const mesCorte = Number(hastaCorte.slice(5, 7));
  const anioCorte = Number(hastaCorte.slice(0, 4));
  const etiquetaCorte = `${NOMBRES_MESES[mesCorte - 1]} ${anioCorte}`;
  const etiquetaPeriodo = `Periodo ${periodoProyecto.etiqueta} (${NOMBRES_MESES[periodoProyecto.mesInicio - 1]} a ${NOMBRES_MESES[periodoProyecto.mesFin - 1]} ${params.anio})`;

  const [proyecto] = await sql`
    SELECT id, nombre_oficial, codigo, unidad_academica, carrera, entidad_beneficiaria, zona, ods, linea_investigacion,
           to_char(vigencia_inicio, 'DD/MM/YYYY') AS vigencia_inicio, to_char(vigencia_fin, 'DD/MM/YYYY') AS vigencia_fin,
           codigo_documento_supervisor, revision_documento_supervisor, lider_id, lider_nombre
    FROM proyectos WHERE id = 'vinculacion'
  `;
  const [supervisor] = await sql`SELECT id, nombres, apellidos, email FROM usuarios WHERE id = ${params.supervisorId}`;
  const [lider] = proyecto?.lider_id
    ? await sql`SELECT nombres, apellidos FROM usuarios WHERE id = ${proyecto.lider_id}`
    : [null];
  const [ciclo] = await sql`SELECT id FROM ciclos_academicos WHERE nombre = ${periodoProyecto.etiqueta}`;

  const espacios = await sql`
    SELECT id, nombre, categoria, entidad_id FROM "espacios_enseñanza"
    WHERE area = 'vinculacion' AND profesor_id = ${params.supervisorId}
    ORDER BY nombre ASC
  `;
  const espaciosIds = espacios.map((espacio: any) => espacio.id);
  const idsConsulta = espaciosIds.length ? espaciosIds : [0];

  // Entidad(es) beneficiaria(s) reales de los espacios de este supervisor (Cross Worlds, Fundación
  // Submarino Amarillo, ULEAM-FEDU…) — el espacio ocurre DENTRO de una entidad, no es la entidad.
  // Si ningún espacio tiene entidad asignada todavía, se usa el campo general del proyecto.
  const entidadesIds = Array.from(new Set(espacios.map((espacio: any) => espacio.entidad_id).filter(Boolean)));
  const entidadesFilas = entidadesIds.length
    ? await sql`SELECT nombre FROM entidades_beneficiarias WHERE id = ANY(${entidadesIds}) ORDER BY nombre ASC`
    : [];
  const entidadBeneficiaria = entidadesFilas.length
    ? entidadesFilas.map((fila: any) => fila.nombre).join('; ')
    : (proyecto?.entidad_beneficiaria || '');

  // Pasantes asignados = los que este supervisor supervisa oficialmente (titulares); los de apoyo
  // hacen horas en sus espacios pero son de otro supervisor.
  const pasantes = await sql`
    SELECT DISTINCT u.id, u.nombres, u.apellidos
    FROM espacio_instructores ei JOIN usuarios u ON ei.usuario_id = u.id
    WHERE ei.espacio_id = ANY(${idsConsulta}) AND ei.tipo = 'titular'
    ORDER BY u.apellidos, u.nombres
  `;
  const pasantesAsignadosTotal = pasantes.length;
  const contexto: ContextoSupervisor = {
    supervisorId: params.supervisorId,
    espaciosClubIds: espacios.filter((espacio: any) => espacio.categoria === 'club').map((espacio: any) => espacio.id),
    espaciosInvestigacionIds: espacios.filter((espacio: any) => espacio.categoria === 'investigacion').map((espacio: any) => espacio.id),
    pasantesIds: pasantes.map((pasante: any) => pasante.id),
  };

  // Tareas del plan (marco lógico) del ciclo cuyo nombre coincide con el periodo fijo, p. ej. "2026-2".
  const plan = await sql`
    SELECT a.id, a.actividad, a.meta_cantidad::float AS meta, a.unidad, a.fuente,
           to_char(a.mes_inicio, 'MM')::int AS mes_inicio, to_char(a.mes_fin, 'MM')::int AS mes_fin
    FROM proyecto_actividades_plan a
    JOIN ciclos_academicos c ON c.id = a.ciclo_id
    WHERE a.activo = true AND c.nombre = ${periodoProyecto.etiqueta}
    ORDER BY a.actividad ASC
  `;

  const tareas: TareaInforme[] = await Promise.all(
    plan.map(async (actividad: any) => {
      const acumulado = await registrosPorFuente(sql, actividad.fuente, contexto, desdePeriodo, hastaCorte);
      const ejecucionPorMes: Record<number, boolean> = {};
      await Promise.all(
        mesesPeriodo.filter(mesPeriodo => mesPeriodo <= mesCorte).map(async mesPeriodo => {
          const desdeMesPeriodo = `${params.anio}-${dosDigitos(mesPeriodo)}-01`;
          const hastaMesPeriodo = `${params.anio}-${dosDigitos(mesPeriodo)}-${dosDigitos(new Date(params.anio, mesPeriodo, 0).getDate())}`;
          const delMes = await registrosPorFuente(sql, actividad.fuente, contexto, desdeMesPeriodo, hastaMesPeriodo);
          ejecucionPorMes[mesPeriodo] = (delMes.cantidad ?? 0) > 0 || delMes.sesiones > 0;
        })
      );
      const codigo = /^(\d+\.\d+)/.exec(actividad.actividad)?.[1] ?? '';
      const nombre = String(actividad.actividad).split(' Meta:')[0].replace(/^\d+\.\d+\s*/, '').trim();
      return {
        codigo,
        nombre,
        meta: actividad.meta,
        unidad: actividad.unidad || '',
        fuente: actividad.fuente,
        realizado: acumulado.cantidad,
        avance: calcularAvance(acumulado.cantidad, actividad.meta),
        // No.alumnos participantes = estudiantes asignados/inscritos con este supervisor (no
        // "los que ejecutaron esta tarea específica" — con fuentes como evento/podcast eso daba
        // 0 aunque el supervisor sí tuviera pasantes activos).
        alumnos: pasantesAsignadosTotal,
        audiencia: acumulado.audiencia ?? 0,
        productos_sociales: '',
        productos_academicos: '',
        observaciones: acumulado.detalle,
        mesInicio: actividad.mes_inicio,
        mesFin: actividad.mes_fin,
        ejecucionPorMes,
      };
    })
  );

  // Actividades no previstas (2.3): sesiones aprobadas en espacios de categoría "otro" o marcadas como no previstas,
  // más las actividades que el supervisor registra a mano en el informe.
  const idsOtro = espacios.filter((espacio: any) => espacio.categoria === 'otro').map((espacio: any) => espacio.id);
  const sesionesFueraDePlan = await sql`
    SELECT e.nombre AS espacio_nombre, to_char(a.fecha, 'DD/MM/YYYY') AS fecha, a.observaciones,
           (SELECT COUNT(*) FROM asistencia_instructores ai WHERE ai.asistencia_id = a.id)::int AS pasantes,
           (SELECT COUNT(*) FROM asistencia_beneficiarios ab WHERE ab.asistencia_id = a.id)::int AS beneficiarios_atendidos,
           ROUND(EXTRACT(EPOCH FROM (a.hora_fin::time - a.hora_inicio::time))/3600.0::numeric, 1)::float AS horas_acreditadas
    FROM asistencia_espacio a JOIN "espacios_enseñanza" e ON e.id = a.espacio_id
    WHERE a.espacio_id = ANY(${idsConsulta}) AND (a.espacio_id = ANY(${idsOtro.length ? idsOtro : [0]}) OR a.no_prevista = true)
      AND a.estado_aprobacion = 'aprobado'
      AND a.fecha BETWEEN ${desdePeriodo}::date AND ${hastaCorte}::date
    ORDER BY a.fecha ASC
  `;
  const registradasAMano = await sql`
    SELECT id, tarea, avance, alumnos, productos_sociales, productos_academicos, observaciones
    FROM informe_no_previstas
    WHERE supervisor_id = ${params.supervisorId} AND mes BETWEEN ${desdePeriodo}::date AND ${hastaCorte}::date
    ORDER BY mes ASC, id ASC
  `;
  const noPrevistas = [
    ...sesionesFueraDePlan.map((sesion: any) => ({
      id: null,
      manual: false,
      tarea: `Sesión en ${sesion.espacio_nombre} (${sesion.fecha})`,
      avance: 100,
      alumnos: sesion.pasantes ?? 0,
      // Vacíos a propósito (igual que las tareas de 2.2): la IA los redacta a partir de
      // `observaciones`, que incluye lo que el pasante escribió al registrar la sesión.
      productos_sociales: '',
      productos_academicos: '',
      observaciones: [`${sesion.horas_acreditadas ?? 0} h`, `${sesion.beneficiarios_atendidos ?? 0} beneficiarios atendidos`, sesion.observaciones].filter(Boolean).join('. '),
    })),
    ...registradasAMano.map((actividad: any) => ({ ...actividad, manual: true })),
  ];

  const [beneficiarios] = await sql`
    SELECT COUNT(DISTINCT ie.beneficiario_id)::int AS total FROM inscripciones_espacio ie WHERE ie.espacio_id = ANY(${idsConsulta})
  `;
  const generoFilas = await sql`
    SELECT u.genero, COUNT(DISTINCT u.id)::int AS cantidad
    FROM inscripciones_espacio ie JOIN usuarios u ON ie.beneficiario_id = u.id
    WHERE ie.espacio_id = ANY(${idsConsulta}) GROUP BY u.genero
  `;
  const edadFilas = await sql`
    SELECT pb.edad FROM inscripciones_espacio ie
    JOIN perfiles_beneficiarios pb ON ie.beneficiario_id = pb.usuario_id
    WHERE ie.espacio_id = ANY(${idsConsulta})
  `;
  const genero: Record<string, number> = { femenino: 0, masculino: 0, otro: 0, prefiero_no_decir: 0 };
  generoFilas.forEach((fila: any) => { const clave = fila.genero || 'prefiero_no_decir'; genero[clave] = (genero[clave] || 0) + fila.cantidad; });
  const edad: Record<string, number> = { '<18': 0, '18-25': 0, '26-35': 0, '36-50': 0, '>50': 0, 'Sin dato': 0 };
  edadFilas.forEach((fila: any) => { const rango = clasificarRangoEdad(fila.edad); edad[rango] = (edad[rango] || 0) + 1; });

  // Participación de estudiantes: horas por pasante en el periodo y agrupación por espacio.
  const horasPasantes = await sql`
    SELECT u.id, u.nombres, u.apellidos,
           COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (a.hora_fin::time - a.hora_inicio::time))/3600.0)::numeric, 1), 0)::float AS horas_periodo,
           COUNT(DISTINCT a.espacio_id)::int AS espacios
    FROM usuarios u
    LEFT JOIN asistencia_instructores ai ON ai.usuario_id = u.id
    LEFT JOIN asistencia_espacio a ON a.id = ai.asistencia_id AND a.estado_aprobacion = 'aprobado'
         AND a.fecha BETWEEN ${desdePeriodo}::date AND ${hastaCorte}::date AND a.espacio_id = ANY(${idsConsulta})
    WHERE u.id = ANY(${contexto.pasantesIds.length ? contexto.pasantesIds : [0]})
    GROUP BY u.id, u.nombres, u.apellidos ORDER BY u.apellidos, u.nombres
  `;
  // El informe muestra las horas TOTALES del pasante en el periodo: clubes + podcast + investigación + autónomas.
  const horasNoClub = await horasNoClubPorUsuario(sql, horasPasantes.map((fila: any) => fila.id), desdePeriodo, hastaCorte);
  horasPasantes.forEach((fila: any) => {
    fila.horas_periodo = Math.round((fila.horas_periodo + (horasNoClub.get(fila.id)?.horas || 0)) * 10) / 10;
  });
  const gruposEspacios = await sql`
    SELECT e.nombre, e.categoria,
           (SELECT COUNT(*) FROM espacio_instructores ei WHERE ei.espacio_id = e.id)::int AS pasantes,
           (SELECT COUNT(DISTINCT ie.beneficiario_id) FROM inscripciones_espacio ie WHERE ie.espacio_id = e.id)::int AS beneficiarios
    FROM "espacios_enseñanza" e WHERE e.id = ANY(${idsConsulta}) ORDER BY e.nombre
  `;

  // Fotos: sesiones aprobadas del mes con foto; una por espacio primero, al azar.
  const fotosCandidatas = await sql`
    SELECT a.foto_url AS url, to_char(a.fecha, 'DD/MM/YYYY') AS fecha, e.nombre AS espacio_nombre, a.usar_en_informe,
           (SELECT COUNT(*) FROM asistencia_beneficiarios ab WHERE ab.asistencia_id = a.id)::int AS num_beneficiarios,
           (SELECT COUNT(*) FROM asistencia_instructores ai WHERE ai.asistencia_id = a.id)::int AS num_pasantes
    FROM asistencia_espacio a JOIN "espacios_enseñanza" e ON e.id = a.espacio_id
    WHERE a.espacio_id = ANY(${idsConsulta}) AND a.estado_aprobacion = 'aprobado' AND a.foto_url IS NOT NULL
      AND NOT foto_descartada(a.foto_url)
      AND a.fecha BETWEEN ${desdePeriodo}::date AND ${hastaCorte}::date
  `;

  const [sesionesTotales] = await sql`
    SELECT COUNT(*)::int AS total FROM asistencia_espacio a
    WHERE a.espacio_id = ANY(${idsConsulta}) AND a.estado_aprobacion = 'aprobado'
      AND a.fecha BETWEEN ${desdePeriodo}::date AND ${hastaCorte}::date
  `;
  return {
    periodo: {
      desde: desdePeriodo, hasta: hastaCorte, etiqueta: etiquetaCorte, etiquetaPeriodo, mesesPeriodo,
      mesElegido: mesCorte, anio: params.anio, numero: params.numero, cicloId: ciclo?.id ?? null,
    },
    general: {
      proyecto_nombre: proyecto?.nombre_oficial || 'Dinámicas Lingüísticas en Contextos Locales',
      proyecto_codigo: proyecto?.codigo || '',
      unidad_academica: proyecto?.unidad_academica || 'Facultad de Educación y Turismo',
      carrera: proyecto?.carrera || 'Pedagogía de los Idiomas Nacionales y Extranjeros',
      entidad_beneficiaria: entidadBeneficiaria,
      ods: proyecto?.ods || '',
      linea_investigacion: proyecto?.linea_investigacion || '',
      vigencia: proyecto?.vigencia_inicio && proyecto?.vigencia_fin ? `${proyecto.vigencia_inicio} - ${proyecto.vigencia_fin}` : '',
      codigo_documento: proyecto?.codigo_documento_supervisor || '',
      revision_documento: proyecto?.revision_documento_supervisor || '',
      supervisor_nombre: supervisor ? `${supervisor.nombres} ${supervisor.apellidos}` : 'Supervisor',
      supervisor_email: supervisor?.email || '',
      lider_nombre: lider ? `${lider.nombres} ${lider.apellidos}` : proyecto?.lider_nombre || '',
      mes: etiquetaCorte,
      total_pasantes: pasantesAsignadosTotal,
      total_beneficiarios: beneficiarios?.total || 0,
      total_sesiones: sesionesTotales?.total || 0,
      zona: proyecto?.zona || '',
      espacios: espacios.map((espacio: any) => espacio.nombre),
    },
    tareas,
    no_previstas: noPrevistas,
    participacion: {
      pasantes: horasPasantes,
      grupos: gruposEspacios,
      genero,
      edad,
      audiencia_podcast: tareas.filter(tarea => tarea.fuente === 'podcast').reduce((total, tarea) => total + tarea.audiencia, 0),
    },
    fotos: elegirFotos(fotosCandidatas),
  };
}

/** Textos existentes del periodo (observaciones, comentarios, rechazos) para deducir obstáculos. */
export async function recopilarSenalesObstaculos(sql: Sql, supervisorId: number, anio: number, numero: 1 | 2) {
  const periodoProyecto = construirPeriodo(anio, numero);
  const hoy = hoyEcuadorTexto();
  const desde = periodoProyecto.desde;
  const hasta = hoy < periodoProyecto.hasta ? hoy : periodoProyecto.hasta;
  const sesiones = await sql`
    SELECT e.nombre AS espacio, to_char(a.fecha, 'DD/MM/YYYY') AS fecha, a.estado_aprobacion AS estado,
           a.observaciones, a.comentario_supervisor, a.motivo_rechazo
    FROM asistencia_espacio a JOIN "espacios_enseñanza" e ON e.id = a.espacio_id
    WHERE e.area = 'vinculacion' AND e.profesor_id = ${supervisorId}
      AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date
    ORDER BY a.fecha DESC
  `;
  const conTexto = sesiones
    .filter((sesion: any) => sesion.observaciones || sesion.comentario_supervisor || sesion.motivo_rechazo)
    .map((sesion: any) => ({
      espacio: sesion.espacio,
      fecha: sesion.fecha,
      texto: [sesion.observaciones, sesion.comentario_supervisor, sesion.motivo_rechazo ? `Rechazada: ${sesion.motivo_rechazo}` : ''].filter(Boolean).join(' | '),
    }));
  return {
    observaciones: conTexto,
    sesionesPendientes: sesiones.filter((sesion: any) => sesion.estado === 'pendiente').length,
    sesionesRechazadas: sesiones.filter((sesion: any) => sesion.estado === 'rechazado').length,
    sesionesTotales: sesiones.length,
  };
}
