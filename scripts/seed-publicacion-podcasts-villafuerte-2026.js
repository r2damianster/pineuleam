// Publicación del sitio (tabla publications) del artículo sobre pódcast en Asian Journal of Contemporary Education.
// Uso: node --env-file=.env.local scripts/seed-publicacion-podcasts-villafuerte-2026.js
import { neon } from '@neondatabase/serverless'

const TITLE = "University students' perceptions of the use of podcasts as an educational resource in different disciplines"
const sql = neon(process.env.DATABASE_URL)
const exists = await sql`select id from publications where title = ${TITLE}`
if (exists.length) {
  console.log(`= ya existe (${exists[0].id})`)
} else {
  const [last] = await sql`select substring(id from 5)::int as n from publications where id ~ '^pub_[0-9]{1,6}$' order by 1 desc limit 1`
  const id = `pub_${last.n + 1}`
  await sql`
    insert into publications (id, title, authors, abstract, publication_date, doi_link, type, category)
    values (${id}, ${TITLE},
      ${'Cevallos Zambrano, D. P., Martín Palomo, M. T., Villafuerte-Holguín, J. S., Moreira Choez, J. S., & Mendoza Tubay, C. E.'},
      ${'Estudio cuantitativo con 171 estudiantes de ocho disciplinas de tres universidades de Ecuador y España sobre la percepción del pódcast como recurso educativo. La percepción fue mayoritariamente positiva, sobre todo cuando el docente acompaña el proceso, y la valoración de la perspectiva de género predice la utilidad percibida del pódcast.'},
      '2026-10-22', 'https://archive.aessweb.com/index.php/5052/article/view/6309', 'article', 'regional')`
  console.log(`+ ${id}`)
}
