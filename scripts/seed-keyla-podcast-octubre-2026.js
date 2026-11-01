// Keyla Ariana Pin Bello (usuarios.id 41) participó en los 3 podcasts de octubre 2026 junto con Alisson
// (id 42), pero solo se registró a Alisson. Copia el desglose de horas de Alisson para esos episodios;
// quedan 'pendiente' de aprobación (default de la tabla). Idempotente (video_id+usuario_id UNIQUE).
// Uso: node --env-file=.env.local scripts/seed-keyla-podcast-octubre-2026.js
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const KEYLA_ID = 41;
const ALISSON_ID = 42;
const VIDEOS = ['video_1792682068009', 'video_1792682652132', 'video_1792682950912']; // 7, 14 y 21 oct

async function run() {
  for (const videoId of VIDEOS) {
    const [insertada] = await sql`
      INSERT INTO horas_podcast_pasante
        (video_id, usuario_id, tipo_podcast, panelistas_internos_adicionales, panelistas_externos_adicionales,
         audiencia_alcanzada, horas_base, horas_bono_panelistas, horas_bono_audiencia, horas_total)
      SELECT video_id, ${KEYLA_ID}, tipo_podcast, panelistas_internos_adicionales, panelistas_externos_adicionales,
             audiencia_alcanzada, horas_base, horas_bono_panelistas, horas_bono_audiencia, horas_total
      FROM horas_podcast_pasante WHERE video_id = ${videoId} AND usuario_id = ${ALISSON_ID}
      ON CONFLICT (video_id, usuario_id) DO NOTHING
      RETURNING id, horas_total::float AS horas, estado_aprobacion`;
    console.log(videoId, insertada ? `insertada ${JSON.stringify(insertada)}` : 'ya existía o Alisson sin fila');
  }
}
run().catch(e => { console.error(e); process.exit(1); });
// Rollback: DELETE FROM horas_podcast_pasante WHERE usuario_id = 41 AND video_id IN ('video_1792682068009','video_1792682652132','video_1792682950912');
