// Los pasantes que ya tenían investigación antes del Congreso suman 15 h más a lo que tenían planificado:
// tope de investigación = 15 h planificadas antes + 15 h del Congreso = 30 h (confirmado por el líder). Lo que
// falta para la meta va a clubes. El resto del perfil queda como el de por defecto (planificación 16 h, meta 96 h).
// Uso: node --env-file=.env.local scripts/ajustar-topes-investigacion-congreso-2026.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const IDS_CON_HORAS_PREVIAS = [35, 36, 38]; // Ivana Zambrano, Evelyn Barahona, Jorge Luis Cedeño
const HORAS_INVESTIGACION_PLANIFICADAS_ANTES = 15;
const HORAS_CONGRESO = 15;
const TOPE_INVESTIGACION = HORAS_INVESTIGACION_PLANIFICADAS_ANTES + HORAS_CONGRESO;

await sql.transaction(
  IDS_CON_HORAS_PREVIAS.map(usuarioId => sql`
    INSERT INTO topes_horas_pasante (usuario_id, tope_asistencia, tope_autonomas, tope_investigacion, tope_podcast, meta_total)
    VALUES (${usuarioId}, NULL, 16, ${TOPE_INVESTIGACION}, NULL, 96)
    ON CONFLICT (usuario_id) DO UPDATE SET tope_investigacion = ${TOPE_INVESTIGACION}, actualizado_en = now()`)
);
console.log(await sql`SELECT usuario_id, tope_asistencia, tope_autonomas, tope_investigacion, tope_podcast, meta_total FROM topes_horas_pasante WHERE usuario_id = ANY(${IDS_CON_HORAS_PREVIAS}) ORDER BY usuario_id`);
