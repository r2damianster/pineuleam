// Estandariza la descripción de /publicaciones: «Tema en una frase. Fuente (revista o editorial, vol(n), pp.).» — máx. ~220 caracteres.
// Los datos de fuente salen de las descripciones previas, del DOI y de Contribuciones; el tema, del título.
// Uso: node --env-file=.env.local scripts/fix-publicaciones-descripciones.js
import { neon } from '@neondatabase/serverless'
import { PrismaClient } from '@prisma/client'

const descriptions = {
  pub_81: 'Revisión narrativa de 32 estudios sobre cómo el servicio comunitario fortalece la expresión oral en inglés. Recale, 14(2).',
  pub_79: 'Revisión bibliográfica teórica sobre la aprensión lectora de estudiantes de bachillerato en clases de inglés, desde la experiencia de las prácticas preprofesionales. Ciencia Latina Revista Multidisciplinar, 10(4).',
  pub_75: 'Mentoría en la enseñanza de inglés para fortalecer la confianza y el discurso formal de estudiantes de bachillerato. Journal of English Language Teaching and Applied Linguistics, 8(8), 142–156.',
  pub_76: 'Práctica de la fluidez oral en inglés mediante tareas comunicativas innovadoras. Education Quarterly Reviews, 9(3).',
  pub_62: 'Estrategia Total Physical Response (TPR) para mejorar la expresión oral de estudiantes principiantes de inglés en una escuela rural ecuatoriana. Revista Imaginario Social, 9(2).',
  pub_78: 'Desafíos comunicativos y miedo escénico en docentes de inglés en formación, y el papel de la preparación. Education Quarterly Reviews, 9(2).',
  pub_80: 'El storytelling digital como estrategia para mejorar la fluidez oral de estudiantes de inglés como lengua extranjera.',
  pub_73: 'Estrategias lúdico-creativas para despertar la escritura de microcuentos en Educación General Básica. Ciencia Latina Revista Multidisciplinar, 10(2).',
  pub_61: 'Principales causas de la baja interacción estudiantil en clases de expresión oral en inglés como lengua extranjera. Ciencia y Reflexión, Revista Multidisciplinaria, 5(1).',
  pub_71: 'Libro ilustrado sobre el complejo de inferioridad. Ediciones ULEAM.',
  pub_3: 'Compilación de experiencias de vinculación social, prácticas preprofesionales e investigación. Co-publicado por RED LEA, ULEAM, UTEG y Universidad de Concepción del Uruguay. ISBN 978-9942-614-37-7.',
  pub_74: 'Condicionantes institucionales en el uso de tecnologías en el aula, desde un análisis multivariado. Revista San Gregorio, 1(65), 22–31.',
  pub_60: 'Microenseñanza con tecnologías emergentes para fortalecer la expresión oral en el aula. Ciencia Latina Revista Multidisciplinar, 10(1), 7709–7729.',
  pub_77: 'Efectividad del método TEACCH en las habilidades sociales de niños con trastorno del espectro autista. Revista Científica Multidisciplinaria SAPIENTIAE, 9(19).',
  pub_65: 'Revisión sobre el uso de pódcast para desarrollar liderazgo e inteligencia emocional. Education Quarterly Reviews, 9(1), 1–11.',
  pub_58: 'Comparación del nivel de lectura funcional entre estudiantes de segundo y cuarto grado de Educación General Básica. Revista Científica Cumbres, 11(2).',
  pub_72: 'Revisión bibliográfica sobre TikTok y el aprendizaje de inglés en distintos grupos de edad. Revista Imaginario Social, 9(3).',
  pub_64: 'Resultado de la integración de proyectos de investigación sobre innovación educativa con podcast e innovación pedagógica e internacionalización, de la carrera PINE. Ediciones ULEAM.',
  pub_69: 'Implementación del aprendizaje basado en proyectos en clases de inglés. Education Quarterly Reviews, 8(3), 127–139.',
  pub_66: 'Comunicación asertiva y gamificación en docentes y su efecto en el desarrollo psicomotor de niños con síndrome de Down. Profesorado, Revista de Currículum y Formación del Profesorado, 29(2).',
  pub_67: 'Revisión sistemática sobre educación inclusiva y el uso de tecnologías asistivas. Education Quarterly Reviews, 8(2), 1–14.',
  pub_63: 'Experiencia con gamificación en la transición de la enseñanza regular del inglés a la educación bilingüe. Education Quarterly Reviews, 8(2), 159–171.',
  pub_68: 'Tiempo efectivo de enseñanza con tecnología educativa durante las prácticas preprofesionales. Sapienza: International Journal of Interdisciplinary Studies, 6(1).',
  pub_70: 'Uso del pódcast para sensibilizar sobre equidad de género en docentes de inglés en formación. Technium Education and Humanities, 12, 95–109.',
}

const podcastArticleSummary =
  'Estudio con 171 estudiantes de ocho disciplinas en Ecuador y España: percepción mayoritariamente positiva del pódcast como recurso educativo. Asian Journal of Contemporary Education, 10(2), 115–128.'

const sql = neon(process.env.DATABASE_URL)
for (const [id, description] of Object.entries(descriptions)) {
  const [updated] = await sql`update publications set abstract = ${description}, updated = now() where id = ${id} returning id`
  console.log(updated ? `~ ${id} (${description.length})` : `! no existe ${id}`)
}
const prisma = new PrismaClient()
const result = await prisma.contribution.updateMany({
  where: { titulo: { startsWith: "University students' perceptions of the use of podcasts" } },
  data: { campoDetallado: podcastArticleSummary },
})
console.log(`contribución del pódcast: ${result.count}`)
await prisma.$disconnect()
