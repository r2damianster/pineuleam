// Ponencias de octubre 2026 (jornada EHU–ULEAM, Manta) de Arturo Rodríguez y Jhonny Villafuerte.
// Uso: node --env-file=.env.local scripts/seed-contribuciones-octubre-2026.js [--apply]
// Sin --apply solo muestra lo que insertaría. Idempotente: omite títulos ya existentes.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const shouldApply = process.argv.includes('--apply')

const PROYECTO_NOMBRE_OFICIAL =
  'Lograr la innovación pedagógica e internacionalización del proceso de formación inicial y continua de docentes para el desarrollo humano y sostenible.'
const NOMBRE_EVENTO = 'Congreso de Innovación Educativa, Inclusión y Sostenibilidad en Educación Superior (INEDUS)'
const ARTURO = { authorName: 'Arturo Damián Rodríguez Zambrano', isCarreraAuthor: true, esEstudiante: false, usuarioId: 1 }
const JHONNY = { authorName: 'Jhonny Saulo Villafuerte Holguín', isCarreraAuthor: true, esEstudiante: false, usuarioId: 13 }
const JOHANA = { authorName: 'Johana Elizabeth Bello Piguave', isCarreraAuthor: true, esEstudiante: false, usuarioId: 125 }
const externalAuthor = (authorName) => ({ authorName, isCarreraAuthor: false, esEstudiante: false, usuarioId: null })

// day = día de octubre 2026; time/place = hora de Manta y espacio
const ponencias = [
  {
    day: 28, time: '14h00', place: 'Aula 208, ULEAM',
    titulo: 'Mapeo bibliométrico de la integridad en la autoría y la escritura académica asistida por IA generativa',
    participant: ARTURO,
    coauthors: [{ authorName: 'Jorge Luis Cedeño Lucas', isCarreraAuthor: true, esEstudiante: true, usuarioId: 38 }],
  },
  {
    day: 28, time: '14h45', place: 'Cine, ULEAM (simposio de doctorandos de la EHU en la ULEAM)',
    titulo: 'Percepción docente sobre el uso de la inteligencia artificial en la cohorte digital en transición universitaria',
    participant: ARTURO, coauthors: [],
  },
  {
    day: 28, time: '17h00', place: 'Centro de Cómputo, ULEAM (sesión English Language)',
    titulo: 'Teacher as Toolmaker: AI-Assisted Development of Custom Learning Environments in Higher Education',
    participant: ARTURO,
    coauthors: [externalAuthor('Genny Andrea Quijije Franco')],
  },
  {
    day: 29, time: '15h00', place: 'Aula 206, ULEAM',
    titulo: 'Efectividad del microaprendizaje en la adquisición y retención de conocimientos: una revisión crítica basada en PRISMA',
    participant: ARTURO,
    coauthors: [externalAuthor('Estefi Elhyz Arteaga Loor')],
  },
  {
    day: 29, time: '15h00', place: 'Aula 209, ULEAM',
    titulo: 'Ejecución del pódcast interdisciplinario «Más allá del lienzo» en proyectos de investigación',
    participant: ARTURO,
    // Máximo 5 autores por contribución: queda fuera Jhonny Moreira Moreira.
    coauthors: [
      { authorName: 'Diana Noemi Cedeño Sánchez', isCarreraAuthor: true, esEstudiante: true, usuarioId: 258 },
      externalAuthor('Andrea León Mero'),
      externalAuthor('Florera Vera Baque'),
      externalAuthor('Robert Castro Mieles'),
    ],
  },
  {
    day: 29, time: '16h00', place: 'Aula 211, ULEAM',
    titulo: 'Aportes a la educación sexual integral en el bachillerato desde las prácticas preprofesionales en psicología educativa',
    participant: ARTURO,
    coauthors: [externalAuthor('Dayana Guerrero Macías'), JOHANA],
  },
  {
    day: 30, time: '15h45', place: 'Aula 206, ULEAM (simposio Psicología educativa y bienestar)',
    titulo: 'Intervención basada en TEACCH y ABA para favorecer la autorregulación conductual en un estudiante con TEA',
    participant: ARTURO,
    coauthors: [externalAuthor('Adamarys Dayanara Moreira Macías'), JOHANA],
  },
  {
    day: 28, time: '16h00', place: 'Auditorio de Medicina, ULEAM',
    titulo: 'Mindfulness como estrategia psicoeducativa para la reducción de la sintomatología ansioso-depresiva en estudiantes universitarios',
    participant: JHONNY,
    coauthors: [
      JOHANA,
      externalAuthor('Nahia Idoiaga-Mondragón'),
      externalAuthor('Israel Alonso'),
    ],
  },
]

const buildContribution = (ponencia) => {
  const { participant } = ponencia
  const isArturo = participant.usuarioId === 1
  const authors = [participant, ...ponencia.coauthors].map((author, authorIndex) => ({ ...author, order: authorIndex + 1 }))
  return {
    tipoPublicacion: 'MEMORIA_EVENTO',
    proyecto: PROYECTO_NOMBRE_OFICIAL,
    proyectoId: 'internacionalizacion',
    titulo: ponencia.titulo,
    nombrePonencia: ponencia.titulo,
    nombreEvento: NOMBRE_EVENTO,
    organizadorEvento: 'Universidad Laica Eloy Alfaro de Manabí (ULEAM) y Universidad del País Vasco (UPV/EHU)',
    pais: 'Ecuador',
    ciudad: 'Manta',
    fechaPublicacion: new Date(`2026-10-${ponencia.day}T05:00:00.000Z`),
    campoDetallado: `Ponencia presentada el ${ponencia.day} de octubre de 2026, ${ponencia.time} (hora de Manta), en ${ponencia.place}.`,
    estado: 'OTRO',
    filiacion: 'Universidad Laica Eloy Alfaro de Manabí',
    identificacionParticipante: isArturo ? '131041753-8' : null,
    categoria: isArturo ? 'AUXILIAR_I' : null,
    participacion: 'Ponente',
    lineaInvestigacion: 'Educación y Nuevos Escenarios de la Formación Profesional',
    periodoAcademico: '2026-2',
    creadoPorId: 1,
    origen: 'docente',
    aprobada: true,
    authors: { create: authors },
  }
}

async function main() {
  for (const ponencia of ponencias) {
    const data = buildContribution(ponencia)
    const alreadyExists = await prisma.contribution.findFirst({ where: { titulo: data.titulo } })
    const label = `${data.fechaPublicacion.toISOString().slice(0, 10)} ${ponencia.time} — ${data.titulo.slice(0, 60)}`
    if (alreadyExists) {
      console.log(`= ya existe: ${label}`)
      continue
    }
    console.log(`${shouldApply ? '+ insertando' : '~ insertaría'}: ${label} (${data.authors.create.length} autores)`)
    if (shouldApply) await prisma.contribution.create({ data })
  }
}

main().finally(() => prisma.$disconnect())
