// Noticia del IV Congreso Internacional INEDUS (28-30 oct 2026) contextualizada para el proyecto, y
// ajuste del nombre/edición/organizador del evento en las 8 ponencias ya cargadas.
// Uso: node --env-file=.env.local scripts/seed-noticia-congreso-inedus-2026.js
import { PrismaClient } from '@prisma/client'
import { neon } from '@neondatabase/serverless'

const prisma = new PrismaClient()
const OLD_EVENT_NAME = 'Congreso de Innovación Educativa, Inclusión y Sostenibilidad en Educación Superior (INEDUS)'
const EVENT_NAME = 'IV Congreso Internacional de Innovación Educativa, Inclusión y Sostenibilidad en la Educación Superior (INEDUS)'
const NOTICIA_TITLE = 'ULEAM inaugura el IV Congreso Internacional de Innovación Educativa, Inclusión y Sostenibilidad en la Educación Superior'
const NOTICIA_BODY =
  'La Universidad Laica Eloy Alfaro de Manabí (ULEAM), a través de la Facultad de Educación y Turismo, inauguró el 28 de octubre de 2026 el IV Congreso Internacional «Innovación Educativa, Inclusión y Sostenibilidad en la Educación Superior» (INEDUS), que se desarrolló hasta el 30 de octubre en modalidad presencial y virtual. ' +
  'La Carrera de Pedagogía de los Idiomas Nacionales y Extranjeros, a la que pertenece el Proyecto de Innovaciones Pedagógicas e Internacionalización, forma parte de la organización del congreso, y la Universidad del País Vasco (UPV/EHU), una de sus principales aliadas, es sede del encuentro junto con la ULEAM. ' +
  'El acto inaugural contó con la presencia del Vicerrector Académico (s), Dr. Cristian Mera Macías, y del decano de la Facultad de Educación y Turismo, Dr. Pedro Quijije Anchundia, además de docentes, estudiantes y ponentes nacionales e internacionales. ' +
  'Bajo el lema «Un diálogo entre los formadores de docentes de Iberoamérica», el congreso tuvo dos sedes presenciales, en la UPV/EHU (España) y en la ULEAM (Manta), y abordó tres líneas temáticas: trabajos teóricos o empíricos, experiencias prácticas de innovación, e innovación curricular y comunitaria. ' +
  'Integrantes del proyecto participaron con ponencias sobre inteligencia artificial en la educación, escritura académica, microaprendizaje, pódcast en proyectos de investigación, educación sexual integral, inclusión y bienestar psicoeducativo. ' +
  'Con esta iniciativa, la ULEAM fortalece la cooperación académica internacional y reafirma su compromiso con la calidad educativa, la innovación pedagógica y la formación docente.'

async function main() {
  const sql = neon(process.env.DATABASE_URL)
  const updated = await prisma.contribution.updateMany({
    where: { nombreEvento: OLD_EVENT_NAME },
    data: {
      nombreEvento: EVENT_NAME,
      edicionEvento: 'IV',
      organizadorEvento: 'Facultad de Educación y Turismo, ULEAM, con la Universidad del País Vasco (UPV/EHU)',
    },
  })
  console.log(`ponencias actualizadas: ${updated.count}`)

  const exists = await sql`select id from actividades_difusion where titulo = ${NOTICIA_TITLE}`
  if (exists.length) return console.log('= noticia ya existe')
  await sql`
    insert into actividades_difusion
      (titulo, tipo, fecha, registrador_id, categoria, descripcion, profesores_responsables, periodo_academico,
       origen, photos, aprobado_sitio, aprobado_por, fecha_aprobacion, area_sustantiva, proyecto_id, proyectos,
       publicar_noticias, publicar_actividades)
    values
      (${NOTICIA_TITLE}, 'evento_fisico', '2026-10-28', 1, 'investigacion', ${NOTICIA_BODY}, ${[1]}, '2026-2',
       'difusion', ${[]}, true, 1, now(), 'investigacion', 'internacionalizacion', ${['internacionalizacion']}, true, false)`
  console.log('+ noticia insertada')
}

main().finally(() => prisma.$disconnect())
