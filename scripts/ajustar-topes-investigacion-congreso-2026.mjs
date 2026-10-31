// Los pasantes que ya tenían investigación antes del Congreso suman 15 h más a lo que tenían planificado:
// tope de investigación nuevo = horas de investigación previas registradas (aprobadas o pendientes, sin las del
// Congreso ni las rechazadas) + 15. El resto del perfil queda como el de por defecto (planificación 16 h, meta 96 h).
// Uso: node --env-file=.env.local scripts/ajustar-topes-investigacion-congreso-2026.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const IDS_CON_HORAS_PREVIAS = [35, 36, 38]; // Ivana Zambrano, Evelyn Barahona, Jorge Luis Cedeño
const HORAS_CONGRESO = 15;
const PREFIJO_CONGRESO = 'Apoyo logístico y académico en el Congreso%';

const consultas = [];
for (const usuarioId of IDS_CON_HORAS_PREVIAS) {
  const [fila] = await sql`
    SELECT COALESCE(SUM(horas), 0)::float AS previas
    FROM actividades_investigacion_pasante
    WHERE usuario_id = ${usuarioId} AND estado_aprobacion <> 'rechazado' AND descripcion NOT LIKE ${PREFIJO_CONGRESO}`;
  const topeNuevo = fila.previas + HORAS_CONGRESO;
  console.log(`usuario ${usuarioId}: previas ${fila.previas} + ${HORAS_CONGRESO} = tope ${topeNuevo}`);
  consultas.push(sql`
    INSERT INTO topes_horas_pasante (usuario_id, tope_asistencia, tope_autonomas, tope_investigacion, tope_podcast, meta_total)
    VALUES (${usuarioId}, NULL, 16, ${topeNuevo}, NULL, 96)
    ON CONFLICT (usuario_id) DO UPDATE SET tope_investigacion = ${topeNuevo}, actualizado_en = now()`);
}
await sql.transaction(consultas);
console.log(await sql`SELECT usuario_id, tope_asistencia, tope_autonomas, tope_investigacion, tope_podcast, meta_total FROM topes_horas_pasante WHERE usuario_id = ANY(${IDS_CON_HORAS_PREVIAS}) ORDER BY usuario_id`);
