// Asigna 15 h de investigación (apoyo logístico y académico al Congreso, 28-30 oct 2026) a 12 pasantes,
// ya aprobadas, a nombre de su supervisor titular. Un registro por pasante, repartidos 4/4/4 entre los tres
// proyectos; quien ya tenía horas de investigación suma al mismo proyecto. Idempotente.
// Uso: node --env-file=.env.local scripts/asignar-horas-congreso-2026.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const HORAS = 15;
const FECHA = '2026-10-30';
const DESCRIPCION =
  'Apoyo logístico y académico en el Congreso (28, 29 y 30 de octubre de 2026). ' +
  'Horas de investigación asignadas por la coordinación del proyecto por este concepto.';

const PROYECTO_POR_PASANTE = {
  35: 'mentoring', // Ivana Zambrano (ya aportaba a mentoring)
  36: 'mentoring', // Evelyn Barahona (ya aportaba a mentoring)
  38: 'internacionalizacion', // Jorge Luis Cedeño (ya aportaba a internacionalización)
  41: 'internacionalizacion', // Keyla Pin (podcast)
  42: 'internacionalizacion', // Alisson Michelle Parrales (podcast)
  37: 'internacionalizacion', // Britany Alcívar
  39: 'desarrollo_habilidades', // Melina Lucas
  40: 'desarrollo_habilidades', // Dixiana Rojas
  44: 'desarrollo_habilidades', // José Pin
  45: 'desarrollo_habilidades', // Ludys Vera
  46: 'mentoring', // Jelenny Solórzano
  50: 'mentoring', // Ammy Parrales
};
const IDS_SOLO_PODCAST = [41, 42]; // tope de investigación 0 → se habilitan 15 h para que cuenten

const consultas = [];
for (const [usuarioIdTexto, proyectoId] of Object.entries(PROYECTO_POR_PASANTE)) {
  const usuarioId = Number(usuarioIdTexto);
  const [supervisor] = await sql`
    SELECT e.profesor_id FROM espacio_instructores ei JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
    WHERE ei.usuario_id = ${usuarioId} AND ei.tipo = 'titular' AND e.area = 'vinculacion' LIMIT 1`;
  if (!supervisor) throw new Error(`Sin supervisor titular: ${usuarioId}`);
  const [existente] = await sql`SELECT id FROM actividades_investigacion_pasante WHERE usuario_id = ${usuarioId} AND descripcion = ${DESCRIPCION}`;
  if (existente) { console.log('ya existe', usuarioId); continue; }
  consultas.push(sql`
    INSERT INTO actividades_investigacion_pasante
      (usuario_id, fecha, descripcion, horas, proyecto_id, estado_aprobacion, aprobado_por, fecha_aprobacion)
    VALUES (${usuarioId}, ${FECHA}, ${DESCRIPCION}, ${HORAS}, ${proyectoId}, 'aprobado', ${supervisor.profesor_id}, now())`);
}
for (const usuarioId of IDS_SOLO_PODCAST) {
  consultas.push(sql`
    INSERT INTO topes_horas_pasante (usuario_id, tope_asistencia, tope_autonomas, tope_investigacion, tope_podcast, meta_total)
    VALUES (${usuarioId}, 0, 0, ${HORAS}, 96 - ${HORAS}, 96)
    ON CONFLICT (usuario_id) DO UPDATE SET tope_investigacion = GREATEST(COALESCE(topes_horas_pasante.tope_investigacion, 0), ${HORAS})`);
}
await sql.transaction(consultas);
console.log(await sql`
  SELECT a.usuario_id, u.nombres, a.proyecto_id, a.horas::float AS horas, a.estado_aprobacion, a.aprobado_por
  FROM actividades_investigacion_pasante a JOIN usuarios u ON u.id = a.usuario_id
  WHERE a.descripcion = ${DESCRIPCION} ORDER BY a.proyecto_id, a.usuario_id`);
console.log(await sql`SELECT * FROM topes_horas_pasante WHERE usuario_id = ANY(${IDS_SOLO_PODCAST})`);
