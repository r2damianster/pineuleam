// Registra en Contribuciones (proyecto Innovaciones e Internacionalización) las publicaciones antiguas
// que solo existían en la tabla `publications`, para que cuenten por periodo y proyecto.
// Uso: node --env-file=.env.local scripts/seed-contribuciones-desde-publicaciones.js [--apply]
// Sin --apply solo muestra lo que insertaría. Idempotente: omite títulos ya existentes.
import { neon } from '@neondatabase/serverless'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const shouldApply = process.argv.includes('--apply')

const PROYECTO_NOMBRE_OFICIAL =
  'Lograr la innovación pedagógica e internacionalización del proceso de formación inicial y continua de docentes para el desarrollo humano y sostenible.'

// pub_71 y pub_64 son libros que ya están en Contribuciones con otro título: no se duplican.
const journalByPublicationId = {
  pub_79: 'Ciencia Latina Revista Multidisciplinar',
  pub_75: 'Journal of English Language Teaching and Applied Linguistics',
  pub_76: 'Education Quarterly Reviews',
  pub_80: null,
  pub_72: 'Revista Imaginario Social',
  pub_69: 'Education Quarterly Reviews',
  pub_66: 'Profesorado, Revista de Currículum y Formación del Profesorado',
  pub_67: 'Education Quarterly Reviews',
  pub_63: 'Education Quarterly Reviews',
  pub_68: 'Sapienza: International Journal of Interdisciplinary Studies',
  pub_70: 'Technium Education and Humanities',
}

const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const LINKED_USERS = [
  { id: 1, surname: 'rodriguez zambrano' },
  { id: 13, surname: 'villafuerte' },
  { id: 16, surname: 'mena' },
]

// "Palma Macías, S. S., & Mena Sánchez, L. M." -> [{ authorName: 'S. S. Palma Macías', ... }]
function parseAuthors(authorsText) {
  const authors = []
  for (const match of authorsText.matchAll(/([^,&]+?),\s*((?:[A-ZÁÉÍÓÚÑ]\.\s?)+)/g)) {
    const surname = match[1].replace(/^\s*(&|y)\s*/, '').trim()
    const initials = match[2].trim()
    const linkedUser = LINKED_USERS.find((user) => normalize(surname).startsWith(user.surname))
    authors.push({
      authorName: `${initials} ${surname}`,
      order: authors.length + 1,
      isCarreraAuthor: Boolean(linkedUser),
      esEstudiante: false,
      usuarioId: linkedUser?.id ?? null,
    })
  }
  return authors
}

const periodOfDate = (isoDate) => {
  const [year, month] = isoDate.split('-').map(Number)
  return `${year}-${month >= 9 ? 2 : 1}`
}

async function main() {
  const sql = neon(process.env.DATABASE_URL)
  const publications = await sql`select id, title, authors, abstract, publication_date::date::text as fecha, doi_link, category
    from publications where id = any(${Object.keys(journalByPublicationId)}) order by publication_date desc`
  for (const publication of publications) {
    const authors = parseAuthors(publication.authors)
    const label = `${publication.id} ${publication.fecha} ${publication.title.slice(0, 55)} (${authors.length} autores)`
    if (authors.length === 0 || authors.length > 6) { console.log(`! revisar autores: ${label}`); continue }
    if (await prisma.contribution.findFirst({ where: { titulo: publication.title } })) { console.log(`= ya existe: ${label}`); continue }
    console.log(`${shouldApply ? '+' : '~'} ${label} -> ${authors.map((author) => author.authorName).join(' | ')}`)
    if (!shouldApply) continue
    await prisma.contribution.create({
      data: {
        tipoPublicacion: publication.category === 'impacto' ? 'ARTICULO_ALTO_IMPACTO' : 'ARTICULO_REGIONAL',
        tipoArticulo: 'Revista',
        codigoPublicacion: publication.doi_link,
        linkPublicacion: publication.doi_link,
        proyecto: PROYECTO_NOMBRE_OFICIAL,
        proyectoId: 'internacionalizacion',
        titulo: publication.title,
        nombreRevista: journalByPublicationId[publication.id],
        fechaPublicacion: new Date(`${publication.fecha}T05:00:00.000Z`),
        campoDetallado: publication.abstract,
        estado: 'PUBLICADO',
        filiacion: 'Universidad Laica Eloy Alfaro de Manabí',
        lineaInvestigacion: 'Educación y Nuevos Escenarios de la Formación Profesional',
        periodoAcademico: periodOfDate(publication.fecha),
        creadoPorId: 1,
        origen: 'docente',
        aprobada: true,
        authors: { create: authors },
      },
    })
  }
}

main().finally(() => prisma.$disconnect())
