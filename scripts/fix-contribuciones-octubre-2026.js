// Correcciones del 31-oct-2026 a las ponencias/conferencias de octubre (ver seed-contribuciones-octubre-2026.js y seed-unesum-octubre-2026.js).
// Uso: node --env-file=.env.local scripts/fix-contribuciones-octubre-2026.js
import { PrismaClient } from '@prisma/client'
import { neon } from '@neondatabase/serverless'

const prisma = new PrismaClient()
const OLD_VIRTUAL_TITLE = 'Brecha generacional: la etiqueta de «nativos digitales» frente a la evidencia'
const NEW_VIRTUAL_TITLE = 'Desarrollo y uso de aplicaciones en la universidad: perspectiva crítica desde la brecha generacional'
const PRESENCIAL_TITLE = 'Transformar para quién: aprendizaje, una aproximación al aprendizaje intergeneracional en la universidad'
const INEDUS = 'Congreso de Innovación Educativa, Inclusión y Sostenibilidad en Educación Superior (INEDUS)'

async function main() {
  const sql = neon(process.env.DATABASE_URL)
  const octoberRange = { gte: new Date('2026-10-01T00:00:00Z'), lt: new Date('2026-11-01T00:00:00Z') }

  // Solo fueron presentadas: estado OTRO (no PUBLICADO) en todas las memorias de octubre.
  const estadoResult = await prisma.contribution.updateMany({
    where: { tipoPublicacion: 'MEMORIA_EVENTO', fechaPublicacion: octoberRange },
    data: { estado: 'OTRO' },
  })
  const eventoResult = await prisma.contribution.updateMany({
    where: { nombreEvento: 'Jornada académica conjunta UPV/EHU–ULEAM' },
    data: { nombreEvento: INEDUS },
  })
  console.log(`estado→OTRO: ${estadoResult.count}, evento INEDUS: ${eventoResult.count}`)

  // Sexto autor del pódcast: Jhonny Moreira Moreira (estudiante, usuarios.id 261). Supera el tope de 5 del wizard.
  const podcast = await prisma.contribution.findFirst({ where: { titulo: { startsWith: 'Ejecución del pódcast interdisciplinario' } }, include: { authors: true } })
  if (podcast && !podcast.authors.some((author) => author.usuarioId === 261)) {
    await prisma.contributionAuthor.create({
      data: { contributionId: podcast.id, authorName: 'Jhonny Moreira Moreira', order: 6, isCarreraAuthor: true, esEstudiante: true, usuarioId: 261 },
    })
    console.log('autor añadido: Jhonny Moreira Moreira')
  }

  // Charla virtual UNESUM: título real.
  await prisma.contribution.updateMany({
    where: { titulo: OLD_VIRTUAL_TITLE },
    data: { titulo: NEW_VIRTUAL_TITLE, nombrePonencia: NEW_VIRTUAL_TITLE },
  })
  await sql`update actividades_difusion set titulo = ${NEW_VIRTUAL_TITLE}, audiencia_alcanzada = 15,
    descripcion = ${'El 30 de octubre de 2026, a las 14h00 y en modalidad virtual, el Dr. Arturo Rodríguez Zambrano dictó la charla «Desarrollo y uso de aplicaciones en la universidad: perspectiva crítica desde la brecha generacional» en la semana de capacitación «Innovación y gestión del conocimiento en la transformación educativa», organizada por la Carrera de Desarrollo de Software de la Universidad Estatal del Sur de Manabí (UNESUM). Participaron 15 docentes de la carrera. La exposición contrastó la etiqueta de «nativos digitales» con la evidencia disponible sobre la brecha generacional en el aprendizaje.'}
    where titulo = ${OLD_VIRTUAL_TITLE}`
  await sql`update actividades_difusion set audiencia_alcanzada = 200,
    descripcion = ${'El 22 de octubre de 2026, el Dr. Arturo Rodríguez Zambrano, líder del proyecto, dictó la conferencia magistral «Transformar para quién: aprendizaje, una aproximación al aprendizaje intergeneracional en la universidad» en el XIX Seminario de Trabajo Científico Metodológico UNESUM INNOVA 2026, de la Universidad Estatal del Sur de Manabí. La charla, de 10h30 a 12h00 en el Auditorio del Complejo Universitario, reunió a cerca de 200 asistentes y revisó cómo ha cambiado el concepto de generación a lo largo del tiempo y qué implica para la enseñanza universitaria. La participación fue por invitación de la Dirección Académica de la UNESUM.'}
    where titulo = ${PRESENCIAL_TITLE}`
  console.log('noticias UNESUM actualizadas')
}

main().finally(() => prisma.$disconnect())
