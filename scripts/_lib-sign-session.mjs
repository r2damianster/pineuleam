// Helper compartido para probar el flujo real (HTTP) contra producción: firma
// una cookie de sesión válida (mismo HMAC que lib/session.ts) sin necesitar la
// contraseña del portal — usa SESSION_SECRET del .env.local local, que coincide
// con el de Vercel (confirmado en la carga de libros, Sesión 24).

export const SITE = 'https://www.pineuleam.net';

function b64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return Buffer.from(bin, 'binary').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function signSession(session) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('Falta SESSION_SECRET en el entorno');
  const payload = b64url(new TextEncoder().encode(JSON.stringify(session)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const signature = b64url(new Uint8Array(sigBuf));
  return `${payload}.${signature}`;
}

export const ARTURO_SESSION = {
  id: '1',
  email: 'arturo.rodriguez@uleam.edu.ec',
  nombres: 'ARTURO DAMIAN',
  rol: 'profesor',
  modulos_acceso: ['Proyecto_Internacionalizacion', 'admin', 'investigacion', 'vinculacion', 'utilidades', 'contenido_sitio', 'indicadores'],
};

export async function postContribucion(cookieValue, payload) {
  const res = await fetch(`${SITE}/api/contribuciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `pine_app_session=${cookieValue}` },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  return { ok: res.ok, status: res.status, body };
}
