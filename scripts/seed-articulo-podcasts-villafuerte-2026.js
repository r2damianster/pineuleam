// Artículo «University students' perceptions of the use of podcasts…» (Asian Journal of Contemporary Education, 22-oct-2026),
// coautoría de Jhonny Villafuerte, registrado en el proyecto de Innovaciones e Internacionalización.
// Uso: node --env-file=.env.local scripts/seed-articulo-podcasts-villafuerte-2026.js
import { PrismaClient } from '@prisma/client'
import { neon } from '@neondatabase/serverless'

const prisma = new PrismaClient()
const TITLE = "University students' perceptions of the use of podcasts as an educational resource in different disciplines"
const DOI_URL = 'https://doi.org/10.55493/5052.v10i2.6309'

const externalAuthor = (authorName) => ({ authorName, isCarreraAuthor: false, esEstudiante: false, usuarioId: null })

async function main() {
  const exists = await prisma.contribution.findFirst({ where: { titulo: TITLE } })
  if (exists) return console.log('= ya existe')
  const sql = neon(process.env.DATABASE_URL)
  const [jhonny] = await sql`select cedula from usuarios where id = 13`
  const cedula = jhonny?.cedula
  const authors = [
    externalAuthor('Doris Patricia Cevallos Zambrano'),
    externalAuthor('María Teresa Martín Palomo'),
    { authorName: 'Jhonny Saulo Villafuerte Holguín', isCarreraAuthor: true, esEstudiante: false, usuarioId: 13 },
    externalAuthor('Jenniffer Sobeida Moreira Choez'),
    externalAuthor('Carlos Eduardo Mendoza Tubay'),
  ].map((author, authorIndex) => ({ ...author, order: authorIndex + 1 }))

  await prisma.contribution.create({
    data: {
      tipoPublicacion: 'ARTICULO_REGIONAL',
      tipoArticulo: 'Revista',
      codigoPublicacion: DOI_URL,
      proyecto: 'Lograr la innovación pedagógica e internacionalización del proceso de formación inicial y continua de docentes para el desarrollo humano y sostenible.',
      proyectoId: 'internacionalizacion',
      titulo: TITLE,
      nombreRevista: 'Asian Journal of Contemporary Education',
      issn: '2617-1252',
      fechaPublicacion: new Date('2026-10-22T05:00:00.000Z'),
      campoDetallado:
        'Estudio cuantitativo, transversal y descriptivo-explicativo con 171 estudiantes de ocho disciplinas de tres universidades de Ecuador y España (muestreo no probabilístico por conveniencia). Con dos cuestionarios validados evalúa la percepción del uso de pódcast como recurso educativo: motivación, comprensión, utilidad percibida y perspectiva de género. La percepción fue mayoritariamente positiva, sobre todo cuando el docente acompaña el proceso, y la valoración de la perspectiva de género predice significativamente la utilidad percibida del pódcast.',
      estado: 'PUBLICADO',
      linkPublicacion: DOI_URL,
      linkRevista: 'https://www.aessweb.com',
      filiacion: 'Universidad Laica Eloy Alfaro de Manabí',
      identificacionParticipante: cedula && /^\d{10}$/.test(cedula) ? `${cedula.slice(0, 9)}-${cedula.slice(9)}` : cedula || null,
      participacion: 'Coautor',
      lineaInvestigacion: 'Educación y Nuevos Escenarios de la Formación Profesional',
      periodoAcademico: '2026-2',
      creadoPorId: 13,
      origen: 'docente',
      aprobada: true,
      authors: { create: authors },
    },
  })
  console.log('+ artículo registrado')
}

main().finally(() => prisma.$disconnect())
