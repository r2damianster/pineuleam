// Importa zenodo.xlsx (lista de revistas diamante) a revistas_diamante.
// FUENTE (citar siempre): Universitat de València, Servei de Biblioteques i Documentació (2026).
// Revistas Diamante. Revisión septiembre 2026 / Diamond Journals. Update September 2026 (v6) [Dataset].
// Zenodo. https://zenodo.org/records/22763970 — curación: Grupo Apoyo a la Investigación (SBD);
// gestión de datos: Manuel Álvarez Vizcaino y Nieves Marina Cano.
// Idempotente: upsert por id. NO pisa columnas de enriquecimiento OpenAlex.
// Uso: node --env-file=.env.local scripts/import-revistas-diamante.js [ruta.xlsx]
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const rutaExcel = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'zenodo.xlsx');

const limpiar = (valor) => {
  const texto = String(valor ?? '').trim();
  return texto === '' ? null : texto;
};

async function main() {
  const libro = XLSX.readFile(rutaExcel);
  const filas = XLSX.utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]], { defval: '' });
  console.log(`Leídas ${filas.length} filas de ${rutaExcel}`);

  let importadas = 0;
  for (const fila of filas) {
    const subjects = String(fila.subjects || '')
      .split(';').map((subject) => subject.trim()).filter(Boolean);
    const perfilBase = [fila.titulo, ...subjects].join(' ');

    await sql`
      INSERT INTO revistas_diamante
        (id, titulo, url, issn, eissn, pais, editor, sello_fecyt, q_jcr, q_sjr, q_idr, subjects, perfil_texto)
      VALUES
        (${Number(fila.id)}, ${String(fila.titulo).trim()}, ${limpiar(fila.url)}, ${limpiar(fila.issn)},
         ${limpiar(fila.eissn)}, ${limpiar(fila.country)}, ${limpiar(fila.editor)}, ${limpiar(fila.fecytseal)},
         ${limpiar(fila.Best_Quartil_JCR)}, ${limpiar(fila.Best_Quartil_SJR)}, ${limpiar(fila.Best_Quartil_IDR)},
         ${subjects}, ${perfilBase})
      ON CONFLICT (id) DO UPDATE SET
        titulo = EXCLUDED.titulo, url = EXCLUDED.url, issn = EXCLUDED.issn, eissn = EXCLUDED.eissn,
        pais = EXCLUDED.pais, editor = EXCLUDED.editor, sello_fecyt = EXCLUDED.sello_fecyt,
        q_jcr = EXCLUDED.q_jcr, q_sjr = EXCLUDED.q_sjr, q_idr = EXCLUDED.q_idr, subjects = EXCLUDED.subjects`;
    importadas += 1;
    if (importadas % 500 === 0) console.log(`  ${importadas}/${filas.length}`);
  }

  // Revistas aún sin enriquecer: perfil = título + subjects (el enriquecimiento lo amplía luego).
  await sql`UPDATE revistas_diamante
            SET perfil_texto = titulo || ' ' || array_to_string(subjects, ' ')
            WHERE openalex_estado IS NULL`;

  const [conteo] = await sql`SELECT count(*)::int AS n FROM revistas_diamante`;
  console.log(`✓ Importadas ${importadas}. Total en tabla: ${conteo.n}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
