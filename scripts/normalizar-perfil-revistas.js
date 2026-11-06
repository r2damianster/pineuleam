// Normaliza perfil_texto (minúsculas, sin tildes) para que la búsqueda full-text
// 'simple' coincida con los términos normalizados del buscador. Correr DESPUÉS de
// importar y enriquecer (o tras cualquier reimport). Idempotente.
// Uso: node --env-file=.env.local scripts/normalizar-perfil-revistas.js
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`CREATE EXTENSION IF NOT EXISTS unaccent`;
await sql`UPDATE revistas_diamante SET perfil_texto = lower(unaccent(perfil_texto))`;
const [muestra] = await sql`SELECT perfil_texto FROM revistas_diamante WHERE pais = 'Spain' LIMIT 1`;
console.log('✓ perfil_texto normalizado. Muestra:', muestra.perfil_texto.slice(0, 120));
