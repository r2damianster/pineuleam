// Corrige el orden de autoría de ponencias de octubre 2026: Arturo y Jhonny Villafuerte van al final en estas.
// Uso: node --env-file=.env.local scripts/fix-orden-autores-ponencias-octubre-2026.js
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const orderedAuthorsByTitleStart = {
  'Intervención basada en TEACCH y ABA': ['Adamarys Dayanara Moreira Macías', 'Johana Elizabeth Bello Piguave', 'Arturo Damián Rodríguez Zambrano'],
  'Aportes a la educación sexual integral': ['Dayana Guerrero Macías', 'Johana Elizabeth Bello Piguave', 'Arturo Damián Rodríguez Zambrano'],
  'Efectividad del microaprendizaje': ['Estefi Elhyz Arteaga Loor', 'Arturo Damián Rodríguez Zambrano'],
  'Mindfulness como estrategia psicoeducativa': ['Johana Elizabeth Bello Piguave', 'Nahia Idoiaga-Mondragón', 'Israel Alonso', 'Jhonny Saulo Villafuerte Holguín'],
}

for (const [titleStart, orderedNames] of Object.entries(orderedAuthorsByTitleStart)) {
  const contribution = await prisma.contribution.findFirst({ where: { titulo: { startsWith: titleStart } }, include: { authors: true } })
  if (!contribution) { console.log(`! no encontrada: ${titleStart}`); continue }
  const missing = orderedNames.filter((name) => !contribution.authors.some((author) => author.authorName === name))
  if (missing.length || contribution.authors.length !== orderedNames.length) { console.log(`! autores no coinciden en ${titleStart}: ${missing.join(', ')}`); continue }
  for (const [orderIndex, name] of orderedNames.entries()) {
    const author = contribution.authors.find((candidate) => candidate.authorName === name)
    await prisma.contributionAuthor.update({ where: { id: author.id }, data: { order: orderIndex + 1 } })
  }
  console.log(`~ ${titleStart}: ${orderedNames.join(' | ')}`)
}
await prisma.$disconnect()
