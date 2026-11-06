// Tabla del catálogo de revistas diamante (utilidad /utilidades/revistas).
// Aditiva e idempotente: CREATE ... IF NOT EXISTS, no toca ninguna otra tabla.
// Uso: node --env-file=.env.local scripts/migrate-revistas-diamante.js
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS revistas_diamante (
      id                 INTEGER PRIMARY KEY,
      titulo             TEXT NOT NULL,
      url                TEXT,
      issn               TEXT,
      eissn              TEXT,
      pais               TEXT,
      editor             TEXT,
      sello_fecyt        TEXT,
      q_jcr              TEXT,
      q_sjr              TEXT,
      q_idr              TEXT,
      subjects           TEXT[] NOT NULL DEFAULT '{}',
      -- enriquecimiento OpenAlex (script aparte, reanudable)
      openalex_id        TEXT,
      temas              JSONB NOT NULL DEFAULT '[]',
      obras_total        INTEGER,
      citas_total        INTEGER,
      titulos_recientes  TEXT[] NOT NULL DEFAULT '{}',
      enriquecido_en     TIMESTAMPTZ,
      openalex_estado    TEXT CHECK (openalex_estado IN ('ok','no_encontrada','error')),
      creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

  // Perfil de texto para búsqueda: título + subjects + temas + títulos recientes.
  // Se mantiene por trigger-less: columna regular actualizada por los scripts.
  await sql`ALTER TABLE revistas_diamante ADD COLUMN IF NOT EXISTS perfil_texto TEXT NOT NULL DEFAULT ''`;
  await sql`CREATE INDEX IF NOT EXISTS revistas_diamante_issn_idx ON revistas_diamante (issn)`;
  await sql`CREATE INDEX IF NOT EXISTS revistas_diamante_eissn_idx ON revistas_diamante (eissn)`;
  await sql`
    CREATE INDEX IF NOT EXISTS revistas_diamante_fts_idx
    ON revistas_diamante USING GIN (to_tsvector('simple', perfil_texto))`;

  const [fila] = await sql`SELECT count(*)::int AS n FROM revistas_diamante`;
  console.log('✓ revistas_diamante lista. Filas actuales:', fila.n);
}

main().catch((error) => { console.error(error); process.exit(1); });
