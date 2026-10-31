// Podcast «Más allá del lienzo: ¿por qué a los humanos nos gusta tanto el terror?» (28-oct-2026, 11:00):
// noticia en actividades_difusion + video en la categoría «Más Allá del Lienzo» (cat_4), vinculados.
// Uso: node --env-file=.env.local scripts/seed-podcast-lienzo-terror-2026-10-28.js
import { neon } from '@neondatabase/serverless'

const TITLE = 'Más allá del lienzo: ¿por qué a los humanos nos gusta tanto el terror?'
const EMBED_ID = 'E5_LJTmQSgU'
const DESCRIPTION =
  'El 28 de octubre de 2026, a las 11:00 h, se difundió por Radio ULEAM el podcast “Más allá del lienzo: ¿por qué a los humanos nos gusta tanto el terror?”, alcanzando a una audiencia de 145 participantes, en el marco del proyecto de investigación “Innovaciones Pedagógicas e Internacionalización”. El episodio forma parte del debate interdisciplinario entre Pedagogía de Idiomas y Artes sobre arte, ética y cultura.'

const sql = neon(process.env.DATABASE_URL)
const existing = await sql`select id from videos where embed_id = ${EMBED_ID}`
if (existing.length) {
  console.log('= video ya existe')
} else {
  const [activity] = await sql`
    insert into actividades_difusion
      (titulo, tipo, fecha, hora, registrador_id, categoria, descripcion, profesores_responsables, periodo_academico,
       origen, photos, aprobado_sitio, aprobado_por, fecha_aprobacion, area_sustantiva, proyecto_id, proyectos,
       publicar_noticias, publicar_actividades, external_link, audiencia_alcanzada)
    values
      (${TITLE}, 'podcast', '2026-10-28', '11:00', 1, 'investigacion', ${DESCRIPTION}, ${[1]}, '2026-2',
       'difusion', ${[]}, true, 1, now(), 'investigacion', 'internacionalizacion', ${['internacionalizacion']},
       true, false, ${'https://youtu.be/' + EMBED_ID}, 145)
    returning id`
  const videoId = `video_${Date.now()}`
  await sql`
    insert into videos
      (id, title, youtube_url, embed_id, description, category, published_date, "order", is_featured, tags,
       area_sustantiva, asignaturas, activo, aprobado_sitio, propuesto_por, aprobado_por, fecha_aprobacion,
       proyecto_id, audiencia_alcanzada, profesores_responsables, actividad_difusion_id)
    values
      (${videoId}, ${TITLE}, ${'https://youtu.be/' + EMBED_ID}, ${EMBED_ID}, ${DESCRIPTION}, 'cat_4', '2026-10-28', 0, false,
       ${['investigacion']}, 'investigacion', ${[]}, true, true, 1, 1, now(),
       ${['internacionalizacion']}, 145, ${[1]}, ${activity.id})`
  console.log(`+ actividad ${activity.id} + video ${videoId}`)
}
