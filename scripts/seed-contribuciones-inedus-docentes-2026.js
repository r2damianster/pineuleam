// Ponencias INEDUS (28-29 oct 2026) de Jorge Corral, Laura Mena y Verónica Chávez, cada una en el proyecto que le corresponde.
// Uso: node --env-file=.env.local scripts/seed-contribuciones-inedus-docentes-2026.js [--apply]
// Sin --apply solo muestra lo que insertaría. Idempotente: omite títulos ya existentes.
import { PrismaClient } from '@prisma/client'
import { neon } from '@neondatabase/serverless'

const prisma = new PrismaClient()
const shouldApply = process.argv.includes('--apply')

const EVENT_NAME = 'IV Congreso Internacional de Innovación Educativa, Inclusión y Sostenibilidad en la Educación Superior (INEDUS)'
const EVENT_ORGANIZER = 'Facultad de Educación y Turismo, ULEAM, con la Universidad del País Vasco (UPV/EHU)'
const PROYECTO_HABILIDADES = 'Desarrollo de las habilidades lingüísticas del idioma inglés en estudiantes de educación superior en Ecuador.'
const PROYECTO_INNOVACION =
  'Lograr la innovación pedagógica e internacionalización del proceso de formación inicial y continua de docentes para el desarrollo humano y sostenible.'
const PROYECTO_MENTORING = 'Desarrollo Humano y perfil profesional en la formación de docentes: Mentoría y Aprendizaje Socioemocional'

const externalAuthor = (authorName) => ({ authorName, isCarreraAuthor: false, esEstudiante: false, usuarioId: null })

const ponencias = [
  {
    usuarioId: 18, authorName: 'Jorge Corral Joniaux', proyectoId: 'desarrollo_habilidades', proyecto: PROYECTO_HABILIDADES,
    day: 28, time: '15h15', place: 'Cine, ULEAM (simposio Problemáticas educativas contemporáneas: doctorandos de la EHU en la ULEAM)',
    categoriaCongreso: 'Innovación',
    titulo: 'Alfabetización en inteligencia artificial: perspectivas éticas en la formación inicial de docentes',
    coauthors: [externalAuthor('Paola Moreira')],
  },
  {
    usuarioId: 16, authorName: 'Laura Mena Sánchez', proyectoId: 'internacionalizacion', proyecto: PROYECTO_INNOVACION,
    day: 28, time: '16h00', place: 'Cine, ULEAM (simposio Problemáticas educativas contemporáneas: doctorandos de la EHU en la ULEAM)',
    categoriaCongreso: 'Inglés',
    titulo: 'Competencias de los futuros docentes de inglés para la enseñanza en la primera infancia',
    coauthors: [externalAuthor('Marielena Montesdeoca'), externalAuthor('Claudia Acebo')],
  },
  {
    usuarioId: 20, authorName: 'Verónica Vanessa Chávez Zambrano', proyectoId: 'mentoring', proyecto: PROYECTO_MENTORING,
    day: 29, time: '14h45', place: 'Auditorio de Educación, ULEAM',
    categoriaCongreso: 'Innovación',
    titulo: 'Desarrollo humano y perfil profesional: mentorías y aprendizaje socioemocional (Project experiences)',
    // Verónica figura como tercera autora.
    coauthorsBefore: [externalAuthor('Erick Geovanny López Proaño'), externalAuthor('Carlos David Cañarte Véliz')],
    coauthors: [],
  },
]

const formatCedula = (cedula) => (cedula && /^\d{10}$/.test(cedula) ? `${cedula.slice(0, 9)}-${cedula.slice(9)}` : cedula || null)

async function main() {
  const sql = neon(process.env.DATABASE_URL)
  for (const ponencia of ponencias) {
    const exists = await prisma.contribution.findFirst({ where: { titulo: ponencia.titulo } })
    const label = `${ponencia.authorName} — ${ponencia.titulo.slice(0, 55)} [${ponencia.proyectoId}]`
    if (exists) { console.log(`= ya existe: ${label}`); continue }
    const [user] = await sql`select cedula from usuarios where id = ${ponencia.usuarioId}`
    const participant = { authorName: ponencia.authorName, isCarreraAuthor: true, esEstudiante: false, usuarioId: ponencia.usuarioId }
    const authors = [...(ponencia.coauthorsBefore ?? []), participant, ...ponencia.coauthors].map((author, authorIndex) => ({ ...author, order: authorIndex + 1 }))
    console.log(`${shouldApply ? '+' : '~'} ${label} (${authors.length} autores, orden propio ${authors.findIndex((author) => author.usuarioId === ponencia.usuarioId) + 1})`)
    if (!shouldApply) continue
    await prisma.contribution.create({
      data: {
        tipoPublicacion: 'MEMORIA_EVENTO',
        proyecto: ponencia.proyecto,
        proyectoId: ponencia.proyectoId,
        titulo: ponencia.titulo,
        nombrePonencia: ponencia.titulo,
        nombreEvento: EVENT_NAME,
        edicionEvento: 'IV',
        organizadorEvento: EVENT_ORGANIZER,
        pais: 'Ecuador',
        ciudad: 'Manta',
        fechaPublicacion: new Date(`2026-10-${ponencia.day}T05:00:00.000Z`),
        campoDetallado: `Ponencia presentada el ${ponencia.day} de octubre de 2026, ${ponencia.time} (hora de Manta), en ${ponencia.place}. Categoría del congreso: ${ponencia.categoriaCongreso}.`,
        estado: 'OTRO',
        filiacion: 'Universidad Laica Eloy Alfaro de Manabí',
        identificacionParticipante: formatCedula(user?.cedula),
        participacion: 'Ponente',
        lineaInvestigacion: 'Educación y Nuevos Escenarios de la Formación Profesional',
        periodoAcademico: '2026-2',
        creadoPorId: ponencia.usuarioId,
        origen: 'docente',
        aprobada: true,
        authors: { create: authors },
      },
    })
  }
}

main().finally(() => prisma.$disconnect())
