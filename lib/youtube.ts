import { OAuth2Client } from 'google-auth-library';

// Redirect URI fijo, debe coincidir EXACTO con el registrado en Google Cloud
// Console (OAuth Client "PineCarrera") — no derivarlo del request para evitar
// mismatches en preview deployments.
export const YOUTUBE_REDIRECT_URI = 'https://pineuleam.vercel.app/api/youtube/oauth-callback';
export const YOUTUBE_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
export const SITE_ORIGIN = 'https://pineuleam.vercel.app';

export function getOAuthClient() {
  return new OAuth2Client(
    process.env.YOUTUBE_OAUTH_CLIENT_ID,
    process.env.YOUTUBE_OAUTH_CLIENT_SECRET,
    YOUTUBE_REDIRECT_URI
  );
}

// Refresca un access_token nuevo a partir del refresh_token guardado en
// youtube_canal_auth (una sola fila, id=1). Se refresca en cada llamada — el
// volumen de subidas es bajo, no hace falta cachear el access_token.
export async function obtenerAccessToken(sql: any): Promise<string> {
  const [fila] = await sql`SELECT refresh_token FROM youtube_canal_auth WHERE id = 1`;
  if (!fila) throw new Error('No hay canal de YouTube conectado');

  const client = getOAuthClient();
  client.setCredentials({ refresh_token: fila.refresh_token });
  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token) throw new Error('No se pudo refrescar el access_token de YouTube');
  return credentials.access_token;
}

export async function obtenerInfoCanal(accessToken: string): Promise<{ id: string; title: string } | null> {
  const res = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const canal = data.items?.[0];
  if (!canal) return null;
  return { id: canal.id, title: canal.snippet?.title ?? canal.id };
}

// Inicia una sesión de subida reanudable — el navegador hace el PUT del archivo
// completo directo a la URI devuelta, sin pasar por nuestro servidor (Vercel
// limita el body de las funciones a ~4.5MB, muy por debajo de un video real).
export async function iniciarSesionReanudable({
  accessToken,
  title,
  description,
  privacyStatus,
  fileSize,
  mimeType,
}: {
  accessToken: string;
  title: string;
  description: string;
  privacyStatus: 'unlisted' | 'public';
  fileSize: number;
  mimeType: string;
}): Promise<string> {
  const res = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(fileSize),
        // El PUT de los bytes lo hace el navegador directo a Google (no pasa
        // por Vercel, límite de ~4.5MB del body). Para que Google autorice esa
        // llamada cross-origin hay que declarar el Origin ya en esta llamada
        // inicial (server-to-server) — si no, el PUT del navegador falla con
        // CORS aunque el access_token/refresh_token sean válidos.
        Origin: SITE_ORIGIN,
      },
      body: JSON.stringify({
        snippet: { title, description },
        status: { privacyStatus },
      }),
    }
  );
  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    throw new Error(`No se pudo iniciar la subida a YouTube (${res.status}): ${detalle}`);
  }
  const uploadUrl = res.headers.get('Location');
  if (!uploadUrl) throw new Error('YouTube no devolvió la URL de subida');
  return uploadUrl;
}

export async function actualizarPrivacidad(accessToken: string, videoId: string, privacyStatus: 'unlisted' | 'public') {
  const res = await fetch('https://www.googleapis.com/youtube/v3/videos?part=status', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: videoId, status: { privacyStatus } }),
  });
  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    throw new Error(`No se pudo actualizar la privacidad del video (${res.status}): ${detalle}`);
  }
}
