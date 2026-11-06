// Enriquece revistas_diamante con temas, volumen y títulos recientes desde OpenAlex (API gratuita).
// Reanudable: solo procesa filas con openalex_estado IS NULL (o 'error' con --reintentar).
// Uso: node --env-file=.env.local scripts/enriquecer-revistas-openalex.js [--reintentar] [--limite=200]
// Datos revistas: Universitat de València (SBD), Zenodo https://zenodo.org/records/22763970
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const API = 'https://api.openalex.org';
const CORREO = process.env.OPENALEX_MAILTO || 'arturo.rodriguez@uleam.edu.ec'; // "polite pool" de OpenAlex
const TAMANO_LOTE = 25;           // revistas por consulta de /sources
const CLAVE_API = process.env.OPENALEX_API_KEY; // sin clave, OpenAlex limita por IP (presupuesto diario compartido)
const PAUSA_MS = CLAVE_API ? 120 : 400;
const MAX_TEMAS = 15;
const MAX_TITULOS = 10;

const args = process.argv.slice(2);
const reintentar = args.includes('--reintentar');
const limite = Number((args.find((a) => a.startsWith('--limite=')) || '').split('=')[1]) || Infinity;

const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pedirJson(url, intentos = 6) {
  for (let intento = 1; intento <= intentos; intento += 1) {
    try {
      const respuesta = await fetch(url);
      if (respuesta.status === 429 || respuesta.status >= 500) throw new Error(`HTTP ${respuesta.status}`);
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} en ${url}`);
      return await respuesta.json();
    } catch (error) {
      if (intento === intentos) throw error;
      await pausa(5000 * intento);
    }
  }
}

const normalizarIssn = (valor) => (valor ? String(valor).trim().toUpperCase() : null);

async function procesarLote(revistas) {
  const issnsLote = [...new Set(revistas.flatMap((revista) => [revista.issn, revista.eissn]).map(normalizarIssn).filter(Boolean))];
  const url = `${API}/sources?filter=issn:${issnsLote.join('|')}&per-page=200&mailto=${encodeURIComponent(CORREO)}${CLAVE_API ? `&api_key=${CLAVE_API}` : ''}`;
  const { results: fuentes } = await pedirJson(url);

  // Índice ISSN -> fuente de OpenAlex
  const fuentePorIssn = new Map();
  for (const fuente of fuentes) {
    for (const issn of fuente.issn || []) fuentePorIssn.set(normalizarIssn(issn), fuente);
    if (fuente.issn_l) fuentePorIssn.set(normalizarIssn(fuente.issn_l), fuente);
  }

  for (const revista of revistas) {
    const fuente = fuentePorIssn.get(normalizarIssn(revista.issn)) || fuentePorIssn.get(normalizarIssn(revista.eissn));
    if (!fuente) {
      await sql`UPDATE revistas_diamante SET openalex_estado = 'no_encontrada', enriquecido_en = now() WHERE id = ${revista.id}`;
      continue;
    }

    const temas = (fuente.topics || []).slice(0, MAX_TEMAS).map((tema) => ({
      nombre: tema.display_name,
      subcampo: tema.subfield?.display_name || null,
      campo: tema.field?.display_name || null,
      cantidad: tema.count || 0,
    }));

    let titulosRecientes = [];
    try {
      const idCorto = String(fuente.id).split('/').pop();
      const obras = await pedirJson(
        `${API}/works?filter=primary_location.source.id:${idCorto}&sort=publication_date:desc&per-page=${MAX_TITULOS}&select=title&mailto=${encodeURIComponent(CORREO)}${CLAVE_API ? `&api_key=${CLAVE_API}` : ''}`,
      );
      titulosRecientes = (obras.results || []).map((obra) => obra.title).filter(Boolean);
      await pausa(PAUSA_MS);
    } catch {
      // Sin títulos recientes la revista igual se rankea por temas/subjects.
    }

    const perfilTexto = [
      revista.titulo,
      ...(revista.subjects || []),
      ...temas.flatMap((tema) => [tema.nombre, tema.subcampo, tema.campo]),
      ...titulosRecientes,
    ].filter(Boolean).join(' ');

    await sql`
      UPDATE revistas_diamante SET
        openalex_id = ${fuente.id}, temas = ${JSON.stringify(temas)}::jsonb,
        obras_total = ${fuente.works_count ?? null}, citas_total = ${fuente.cited_by_count ?? null},
        titulos_recientes = ${titulosRecientes}, perfil_texto = ${perfilTexto},
        openalex_estado = 'ok', enriquecido_en = now()
      WHERE id = ${revista.id}`;
  }
}

async function main() {
  const pendientes = await sql`
    SELECT id, titulo, issn, eissn, subjects FROM revistas_diamante
    WHERE openalex_estado IS NULL ${reintentar ? sql`OR openalex_estado = 'error'` : sql``}
    ORDER BY id`;
  const aProcesar = pendientes.slice(0, limite);
  console.log(`Pendientes: ${pendientes.length}. Procesando: ${aProcesar.length}`);

  for (let inicio = 0; inicio < aProcesar.length; inicio += TAMANO_LOTE) {
    const lote = aProcesar.slice(inicio, inicio + TAMANO_LOTE);
    try {
      await procesarLote(lote);
    } catch (error) {
      console.error(`Lote desde ${inicio} falló: ${error.message}`);
      const ids = lote.map((revista) => revista.id);
      await sql`UPDATE revistas_diamante SET openalex_estado = 'error' WHERE id = ANY(${ids}) AND openalex_estado IS NULL`;
    }
    console.log(`  ${Math.min(inicio + TAMANO_LOTE, aProcesar.length)}/${aProcesar.length}`);
    await pausa(PAUSA_MS);
  }

  const resumen = await sql`SELECT openalex_estado AS estado, count(*)::int AS n FROM revistas_diamante GROUP BY 1 ORDER BY 1`;
  console.table(resumen);
}

main().catch((error) => { console.error(error); process.exit(1); });
