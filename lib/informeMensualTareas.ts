// Datos del informe MENSUAL de Vinculación (líder y supervisor) — Sesión 57.
// Distinto del informe SEMESTRAL (informeSupervisorTareas.ts/informeLiderTareas.ts, marco
// lógico por tarea/meta): este es el formato simple que ya usaba el proyecto en Word a mano
// ("INFORME MENSUAL DEL SUPERVISOR/LÍDER DEL PROYECTO DE VINCULACIÓN") — actividades narrativas
// del mes, beneficiarios y zona por espacio, evidencias fotográficas, observaciones. Ambos
// formatos conviven: el semestral no se reemplaza, este es adicional.
import type { NeonQueryFunction } from '@neondatabase/serverless';
import { elegirFotos } from './informeSupervisorTareas';
import { horasNoClubPorUsuario } from './horasNoClubPasante';

type Sql = NeonQueryFunction<false, false>;

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function hoyEcuadorTexto(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export interface BeneficiariosEspacio {
  id: number;
  nombre: string;
  total: number;
  mujeres: number;
  hombres: number;
  otros: number;
  /** true si `total` es audiencia de podcast (no hay desglose por sexo, ni inscripción real). */
  esAudiencia: boolean;
  zona: { canton: string; parroquia: string; barrio: string; ubicacion: string };
}

export interface DatosInformeMensual {
  mes: string; // YYYY-MM
  etiquetaMes: string; // "Mayo 2026"
  general: {
    proyecto_nombre: string;
    unidad_academica: string;
    carrera: string;
    lider_nombre: string;
    supervisor_nombre: string;
    fecha_emision: string;
    total_beneficiarios: number;
  };
  espacios: BeneficiariosEspacio[];
  actividades: string[];
  evidencias: { url: string; fecha: string; espacio_nombre: string; num_beneficiarios: number | null; num_pasantes: number | null; es_audiencia?: boolean }[];
  observaciones: string;
  /** Horas acreditadas por pasante en el mes, agrupadas por espacio — para la tabla "Horas de los pasantes". */
  pasantes: { espacio_nombre: string; supervisor_nombre: string; estudiante_nombre: string; horas_mes: number; pendientes: number }[];
  /** Solo informe del líder: qué docente supervisa a qué pasantes, por espacio ("Distribución de estudiantes y docentes supervisores"). */
  distribucion: { espacio_nombre: string; supervisor_nombre: string; pasantes: string[] }[];
}

/** `datosSupervisorId = null` → informe del líder (todos los espacios del proyecto). */
export async function datosInformeMensual(sql: Sql, params: { supervisorId: number | null; mes: string }): Promise<DatosInformeMensual> {
  const [anioTexto, mesTexto] = params.mes.split('-');
  const anio = Number(anioTexto);
  const mesNum = Number(mesTexto);
  if (!anio || !mesNum || mesNum < 1 || mesNum > 12) throw new Error('Mes inválido, se espera formato YYYY-MM');
  const desde = `${params.mes}-01`;
  const ultimoDia = new Date(anio, mesNum, 0).getDate();
  const hoy = hoyEcuadorTexto();
  const hastaMes = `${params.mes}-${String(ultimoDia).padStart(2, '0')}`;
  const hasta = hoy < hastaMes ? hoy : hastaMes;
  const etiquetaMes = `${NOMBRES_MESES[mesNum - 1]} ${anio}`;

  const [proyecto] = await sql`SELECT id, nombre_oficial, unidad_academica, carrera, lider_id, lider_nombre FROM proyectos WHERE id = 'vinculacion'`;
  const [lider] = proyecto?.lider_id
    ? await sql`SELECT nombres, apellidos FROM usuarios WHERE id = ${proyecto.lider_id}`
    : [null];
  const [supervisor] = params.supervisorId
    ? await sql`SELECT id, nombres, apellidos, email FROM usuarios WHERE id = ${params.supervisorId}`
    : [null];

  const espacios = params.supervisorId
    ? await sql`
        SELECT id, nombre, categoria, profesor_id, zona_canton, zona_parroquia, zona_barrio, zona_ubicacion
        FROM "espacios_enseñanza" WHERE area = 'vinculacion' AND profesor_id = ${params.supervisorId} ORDER BY nombre ASC
      `
    : await sql`
        SELECT id, nombre, categoria, profesor_id, zona_canton, zona_parroquia, zona_barrio, zona_ubicacion
        FROM "espacios_enseñanza" WHERE area = 'vinculacion' ORDER BY nombre ASC
      `;
  const idsConsulta = espacios.length ? espacios.map((espacio: any) => espacio.id) : [0];

  // Beneficiarios por espacio, desglosados por sexo (mismo criterio que el informe semestral).
  const generoPorEspacio = await sql`
    SELECT ie.espacio_id, u.genero, COUNT(DISTINCT u.id)::int AS cantidad
    FROM inscripciones_espacio ie JOIN usuarios u ON ie.beneficiario_id = u.id
    WHERE ie.espacio_id = ANY(${idsConsulta})
    GROUP BY ie.espacio_id, u.genero
  `;
  const conteoPorEspacio = new Map<number, { total: number; mujeres: number; hombres: number; otros: number }>();
  espacios.forEach((espacio: any) => conteoPorEspacio.set(espacio.id, { total: 0, mujeres: 0, hombres: 0, otros: 0 }));
  generoPorEspacio.forEach((fila: any) => {
    const registro = conteoPorEspacio.get(fila.espacio_id);
    if (!registro) return;
    registro.total += fila.cantidad;
    if (fila.genero === 'femenino') registro.mujeres += fila.cantidad;
    else if (fila.genero === 'masculino') registro.hombres += fila.cantidad;
    else registro.otros += fila.cantidad;
  });

  const espaciosSalida: BeneficiariosEspacio[] = espacios.map((espacio: any) => ({
    id: espacio.id,
    nombre: espacio.nombre,
    ...(conteoPorEspacio.get(espacio.id) || { total: 0, mujeres: 0, hombres: 0, otros: 0 }),
    esAudiencia: false,
    zona: {
      canton: espacio.zona_canton || '',
      parroquia: espacio.zona_parroquia || '',
      barrio: espacio.zona_barrio || '',
      ubicacion: espacio.zona_ubicacion || '',
    },
  }));

  // Actividades narrativas del mes: una línea por sesión de club CON observaciones reales +
  // un resumen agregado por espacio cuando hay sesiones aprobadas SIN texto (caso frecuente —
  // el pasante rara vez llena observaciones) + eventos/podcasts de difusión aprobados.
  const sesionesDelMes = await sql`
    SELECT a.espacio_id, e.nombre AS espacio_nombre, to_char(a.fecha, 'DD/MM/YYYY') AS fecha, a.observaciones,
           (SELECT COUNT(*) FROM asistencia_beneficiarios ab WHERE ab.asistencia_id = a.id)::int AS num_beneficiarios
    FROM asistencia_espacio a JOIN "espacios_enseñanza" e ON e.id = a.espacio_id
    WHERE a.espacio_id = ANY(${idsConsulta}) AND a.estado_aprobacion = 'aprobado'
      AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date
    ORDER BY a.fecha ASC
  `;
  const sesionesConTexto = sesionesDelMes.filter((sesion: any) => sesion.observaciones);
  const espaciosConTexto = new Set(sesionesConTexto.map((sesion: any) => sesion.espacio_id));
  const resumenSesionesPorEspacioSinTexto = new Map<number, { nombre: string; sesiones: number; beneficiarios: number; fechas: string[] }>();
  sesionesDelMes
    .filter((sesion: any) => !espaciosConTexto.has(sesion.espacio_id))
    .forEach((sesion: any) => {
      const previo = resumenSesionesPorEspacioSinTexto.get(sesion.espacio_id) || { nombre: sesion.espacio_nombre, sesiones: 0, beneficiarios: 0, fechas: [] as string[] };
      previo.sesiones += 1;
      previo.beneficiarios += sesion.num_beneficiarios || 0;
      previo.fechas.push(sesion.fecha);
      resumenSesionesPorEspacioSinTexto.set(sesion.espacio_id, previo);
    });

  // `categoria` (no `proyecto`) es lo que marca un registro como de Vinculación — `proyecto`
  // (texto libre) solo se llena cuando categoria='investigacion' (selector de proyecto de
  // investigación), queda NULL en los de vinculación aunque sí sean de este proyecto.
  const difusionDelMes = params.supervisorId
    ? await sql`
        SELECT titulo, descripcion, tipo, audiencia_alcanzada, id FROM actividades_difusion
        WHERE aprobado_sitio = true AND categoria = 'vinculacion' AND ${params.supervisorId} = ANY(profesores_responsables)
          AND fecha BETWEEN ${desde}::date AND ${hasta}::date
      `
    : await sql`
        SELECT titulo, descripcion, tipo, audiencia_alcanzada, id FROM actividades_difusion
        WHERE aprobado_sitio = true AND categoria = 'vinculacion' AND fecha BETWEEN ${desde}::date AND ${hasta}::date
      `;
  // Actividades de investigación APROBADAS de los pasantes de estos espacios, con el proyecto
  // al que aportan (lo asigna el líder en /vinculacion/pasantes).
  const investigacionDelMes = await sql`
    SELECT u.nombres, u.apellidos, to_char(a.fecha, 'DD/MM/YYYY') AS fecha, a.descripcion, a.horas::float AS horas,
           COALESCE(py.nombre_oficial, 'Proyecto sin asignar') AS proyecto_nombre
    FROM actividades_investigacion_pasante a
    JOIN usuarios u ON u.id = a.usuario_id
    LEFT JOIN proyectos py ON py.id = a.proyecto_id
    WHERE a.estado_aprobacion = 'aprobado' AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date
      AND a.usuario_id IN (SELECT ei.usuario_id FROM espacio_instructores ei WHERE ei.espacio_id = ANY(${idsConsulta}))
    ORDER BY a.fecha ASC, a.id ASC
  `;
  const actividades = [
    ...sesionesConTexto.map((sesion: any) => `${sesion.espacio_nombre} (${sesion.fecha}): ${sesion.observaciones}`),
    ...Array.from(resumenSesionesPorEspacioSinTexto.values()).map(resumen =>
      `${resumen.nombre}: ${resumen.sesiones} sesión(es) aprobada(s) en el mes (${resumen.fechas.join(', ')}), ${resumen.beneficiarios} asistencia(s) de beneficiarios registradas.`
    ),
    ...difusionDelMes.map((actividad: any) => `${actividad.tipo === 'podcast' ? 'Podcast' : 'Evento'}: ${actividad.titulo}${actividad.descripcion ? ` — ${actividad.descripcion}` : ''}`),
    ...investigacionDelMes.map((actividad: any) =>
      `Investigación (${actividad.proyecto_nombre}) — ${actividad.nombres} ${actividad.apellidos} (${actividad.fecha}): ${actividad.descripcion} [${actividad.horas} h]`
    ),
  ];

  // Señal por defecto para Observaciones: sesiones pendientes/rechazadas del mes (algo real que
  // señalar sin depender de que el supervisor escriba algo desde cero).
  const [estadosDelMes] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE estado_aprobacion = 'pendiente')::int AS pendientes,
      COUNT(*) FILTER (WHERE estado_aprobacion = 'rechazado')::int AS rechazadas
    FROM asistencia_espacio WHERE espacio_id = ANY(${idsConsulta}) AND fecha BETWEEN ${desde}::date AND ${hasta}::date
  `;
  const observacionesPorDefecto = [
    estadosDelMes?.pendientes > 0 ? `${estadosDelMes.pendientes} sesión(es) pendiente(s) de aprobación.` : '',
    estadosDelMes?.rechazadas > 0 ? `${estadosDelMes.rechazadas} sesión(es) rechazada(s) este mes.` : '',
  ].filter(Boolean).join(' ');

  // Espacios de categoría "podcast": no tienen inscripciones_espacio (no se "inscriben"
  // beneficiarios a un podcast) — su "beneficiario" real es la audiencia alcanzada por los
  // episodios del mes, sin desglose por sexo (ese dato no se registra al publicar un episodio).
  const audienciaPodcastDelMes = difusionDelMes
    .filter((actividad: any) => actividad.tipo === 'podcast')
    .reduce((suma: number, actividad: any) => suma + (actividad.audiencia_alcanzada || 0), 0);
  espaciosSalida.forEach(espacio => {
    const espacioOriginal = espacios.find((e: any) => e.id === espacio.id);
    if (espacioOriginal?.categoria === 'podcast') {
      espacio.total = audienciaPodcastDelMes;
      espacio.mujeres = 0;
      espacio.hombres = 0;
      espacio.otros = 0;
      espacio.esAudiencia = true;
    }
  });

  // Evidencias: fotos de sesiones de club aprobadas del mes (mismo criterio que el informe
  // semestral) + fotos de eventos/podcasts de Vinculación del mes (banco `fotos`, origen
  // evento/podcast) — estas últimas SIN filtrar por `descartada`/`activo`: esos flags deciden
  // si salen en el sitio público, no si sirven de evidencia en un informe interno.
  const fotosAsistencia = await sql`
    SELECT a.foto_url AS url, to_char(a.fecha, 'DD/MM/YYYY') AS fecha, e.nombre AS espacio_nombre, a.usar_en_informe,
           (SELECT COUNT(*) FROM asistencia_beneficiarios ab WHERE ab.asistencia_id = a.id)::int AS num_beneficiarios,
           (SELECT COUNT(*) FROM asistencia_instructores ai WHERE ai.asistencia_id = a.id)::int AS num_pasantes
    FROM asistencia_espacio a JOIN "espacios_enseñanza" e ON e.id = a.espacio_id
    WHERE a.espacio_id = ANY(${idsConsulta}) AND a.estado_aprobacion = 'aprobado' AND a.foto_url IS NOT NULL
      AND NOT foto_descartada(a.foto_url)
      AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date
  `;
  const idsDifusionDelMes = difusionDelMes.map((actividad: any) => String(actividad.id));
  // Fotos de podcast/evento: no tienen sesión de asistencia, así que el pie usa los estudiantes que
  // acreditaron horas en el episodio (podcast) y la audiencia alcanzada — nunca un "0" inventado.
  const fotosDifusion = idsDifusionDelMes.length
    ? await sql`
        SELECT f.url, to_char(f.fecha_evento, 'DD/MM/YYYY') AS fecha, ad.tipo, ad.audiencia_alcanzada,
               (SELECT COUNT(DISTINCT h.usuario_id)::int FROM horas_podcast_pasante h
                 JOIN videos v ON v.id = h.video_id WHERE v.actividad_difusion_id = ad.id) AS num_pasantes
        FROM fotos f
        LEFT JOIN actividades_difusion ad ON ad.id::text = f.fuente_id
        WHERE f.origen IN ('evento', 'podcast') AND f.fuente_id = ANY(${idsDifusionDelMes})
          AND f.calidad <> 'mala' AND f.menores <> 'si'
      `
    : [];
  const fotosCandidatas = [
    ...fotosAsistencia,
    ...fotosDifusion.map((foto: any) => ({
      url: foto.url,
      fecha: foto.fecha,
      espacio_nombre: foto.tipo === 'podcast' ? 'Podcast' : 'Evento',
      usar_en_informe: false,
      num_pasantes: foto.num_pasantes > 0 ? foto.num_pasantes : null,
      num_beneficiarios: foto.audiencia_alcanzada > 0 ? foto.audiencia_alcanzada : null,
      es_audiencia: true,
    })),
  ];

  const totalBeneficiarios = espaciosSalida.reduce((suma, espacio) => suma + espacio.total, 0);

  // Docentes supervisores por espacio (uno por espacio, vía profesor_id) — para la tabla de
  // horas y, en el informe del líder, para "Distribución de estudiantes y docentes supervisores".
  const idsSupervisoresEspacio = Array.from(new Set(espacios.map((espacio: any) => espacio.profesor_id).filter(Boolean)));
  const supervisoresEspacioFilas = idsSupervisoresEspacio.length
    ? await sql`SELECT id, nombres, apellidos FROM usuarios WHERE id = ANY(${idsSupervisoresEspacio})`
    : [];
  const nombreSupervisorPorId = new Map<number, string>(supervisoresEspacioFilas.map((fila: any) => [fila.id, `${fila.nombres} ${fila.apellidos}`]));

  // Pasantes por espacio, con horas acreditadas por asistencia en el mes y sesiones aún
  // pendientes de aprobar (para poder avisar al supervisor sin que tenga que ir a buscarlo).
  const pasantesPorEspacio = await sql`
    SELECT ei.espacio_id, ei.tipo, u.id AS usuario_id, u.nombres, u.apellidos,
           COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (a.hora_fin::time - a.hora_inicio::time))/3600.0)
             FILTER (WHERE a.estado_aprobacion = 'aprobado')::numeric, 1), 0)::float AS horas_mes,
           COUNT(DISTINCT a.id) FILTER (WHERE a.estado_aprobacion = 'pendiente')::int AS sesiones_pendientes
    FROM espacio_instructores ei
    JOIN usuarios u ON u.id = ei.usuario_id
    LEFT JOIN asistencia_instructores ai ON ai.usuario_id = u.id
    LEFT JOIN asistencia_espacio a ON a.id = ai.asistencia_id
         AND a.espacio_id = ei.espacio_id AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date
    WHERE ei.espacio_id = ANY(${idsConsulta})
    GROUP BY ei.espacio_id, ei.tipo, u.id, u.nombres, u.apellidos
    ORDER BY u.apellidos, u.nombres
  `;

  // El informe muestra las horas TOTALES del pasante en el mes (clubes + podcast + investigación +
  // autónomas), no una sola categoría. Las horas fuera de club no pertenecen a un espacio de
  // asistencia (el podcast ni siquiera tiene sesiones), así que se cargan UNA sola vez por pasante,
  // en la fila de su espacio titular; las sesiones de club siguen en la fila de cada espacio.
  // Un pasante sin titular en ningún espacio (aún sin supervisor) las lleva en su primera fila.
  const idsPasantes = Array.from(new Set<number>(pasantesPorEspacio.map((fila: any) => fila.usuario_id)));
  const horasNoClub = await horasNoClubPorUsuario(sql, idsPasantes, desde, hasta);
  const conTitularEnBd = new Set<number>(
    idsPasantes.length
      ? (await sql`
          SELECT DISTINCT ei.usuario_id FROM espacio_instructores ei
          JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
          WHERE ei.usuario_id = ANY(${idsPasantes}) AND ei.tipo = 'titular' AND e.area = 'vinculacion'
        `).map((fila: any) => fila.usuario_id)
      : []
  );
  const filaDestinoNoClub = new Map<number, any>();
  for (const fila of pasantesPorEspacio) {
    if (filaDestinoNoClub.has(fila.usuario_id)) continue;
    const esDestino = fila.tipo === 'titular' || !conTitularEnBd.has(fila.usuario_id);
    if (esDestino) filaDestinoNoClub.set(fila.usuario_id, fila);
  }
  const nombreEspacioPorId = new Map<number, string>(espacios.map((espacio: any) => [espacio.id, espacio.nombre]));
  const profesorIdPorEspacio = new Map<number, number>(espacios.map((espacio: any) => [espacio.id, espacio.profesor_id]));
  const pasantes = pasantesPorEspacio.map((fila: any) => {
    const extra = filaDestinoNoClub.get(fila.usuario_id) === fila ? horasNoClub.get(fila.usuario_id) : undefined;
    return {
      espacio_nombre: nombreEspacioPorId.get(fila.espacio_id) || '',
      supervisor_nombre: nombreSupervisorPorId.get(profesorIdPorEspacio.get(fila.espacio_id) || 0) || '',
      estudiante_nombre: `${fila.nombres} ${fila.apellidos}`,
      horas_mes: Math.round((fila.horas_mes + (extra?.horas || 0)) * 10) / 10,
      pendientes: (fila.sesiones_pendientes || 0) + (extra?.pendientes || 0),
    };
  });

  // Distribución de estudiantes y docentes supervisores (solo informe del líder): un bloque por espacio.
  const distribucion = params.supervisorId
    ? []
    : espacios.map((espacio: any) => ({
        espacio_nombre: espacio.nombre,
        supervisor_nombre: nombreSupervisorPorId.get(espacio.profesor_id) || 'Sin asignar',
        pasantes: pasantesPorEspacio
          .filter((fila: any) => fila.espacio_id === espacio.id)
          .map((fila: any) => `${fila.nombres} ${fila.apellidos}`),
      })).filter((bloque: { pasantes: string[] }) => bloque.pasantes.length > 0);

  return {
    mes: params.mes,
    etiquetaMes,
    general: {
      proyecto_nombre: proyecto?.nombre_oficial || 'Dinámicas Lingüísticas en Contextos Locales',
      unidad_academica: proyecto?.unidad_academica || 'Facultad de Educación y Turismo',
      carrera: proyecto?.carrera || 'Pedagogía de los Idiomas Nacionales y Extranjeros',
      lider_nombre: lider ? `${lider.nombres} ${lider.apellidos}` : proyecto?.lider_nombre || '',
      supervisor_nombre: supervisor ? `${supervisor.nombres} ${supervisor.apellidos}` : '',
      fecha_emision: hoy,
      total_beneficiarios: totalBeneficiarios,
    },
    espacios: espaciosSalida,
    actividades,
    evidencias: elegirFotos(fotosCandidatas, 6),
    observaciones: observacionesPorDefecto,
    pasantes,
    distribucion,
  };
}
