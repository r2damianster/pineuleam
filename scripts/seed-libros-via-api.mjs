// Prueba real del flujo desplegado: firma una cookie de sesión válida (mismo
// HMAC que lib/session.ts) para Arturo y hace POST a la API en producción,
// igual que hace el wizard (app/contribuciones/new/[type]/page.tsx onSubmit).
// Así se valida auth + zod + Prisma create tal como corren en Vercel, no solo
// el schema de la base.

const SITE = 'https://pineuleam.vercel.app';
const secret = process.env.SESSION_SECRET;
if (!secret) throw new Error('Falta SESSION_SECRET en el entorno');

function b64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return Buffer.from(bin, 'binary').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signSession(session) {
  const payload = b64url(new TextEncoder().encode(JSON.stringify(session)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const signature = b64url(new Uint8Array(sigBuf));
  return `${payload}.${signature}`;
}

const session = {
  id: '1',
  email: 'arturo.rodriguez@uleam.edu.ec',
  nombres: 'ARTURO DAMIAN',
  rol: 'profesor',
  modulos_acceso: ['Proyecto_Internacionalizacion', 'admin', 'investigacion', 'vinculacion', 'utilidades', 'contenido_sitio', 'indicadores'],
};

const PROYECTO_INTERNACIONALIZACION =
  'Lograr la innovación pedagógica e internacionalización del proceso de formación inicial y continua de docentes para el desarrollo humano y sostenible.';
const FILIACION = 'Universidad Laica Eloy Alfaro de Manabí';
const LINEA = 'Educación y Nuevos Escenarios de la Formación Profesional';

const libros = [
  {
    codigoPublicacion: '78-9942-681-97-3',
    titulo: 'El tamaño de lo que sentimos: Libro ilustrado sobre el complejo de inferioridad',
    isbn: '978-9942-681-97-3',
    fechaPublicacion: '2026-06-01',
    identificacionParticipante: 'Arturo Damián Rodríguez Zambrano',
  },
  {
    codigoPublicacion: '978-9942-681-94-2',
    titulo: 'Podcast: An educational innovation in foreign language instruction',
    isbn: '978-9942-681-94-2',
    fechaPublicacion: '2026-05-01',
    identificacionParticipante: 'Jhonny Villafuerte Holguín',
  },
  {
    codigoPublicacion: '978-9942-614-37-7',
    titulo: 'INNOVACIONES EDUCATIVAS: Experiencias de vinculación social, prácticas preprofesionales, proyectos de investigación',
    isbn: '978-9942-614-37-7',
    fechaPublicacion: '2026-04-01',
    identificacionParticipante: 'Jhonny Villafuerte Holguín',
  },
];

async function run() {
  const cookieValue = await signSession(session);

  // 1) Probar que la cookie es válida contra el endpoint de sesión antes de crear nada.
  const whoami = await fetch(`${SITE}/api/auth/me`, { headers: { Cookie: `pine_app_session=${cookieValue}` } });
  console.log('GET /api/auth/me ->', whoami.status, await whoami.text());
  if (!whoami.ok) {
    throw new Error('La cookie firmada localmente no fue aceptada por producción (SESSION_SECRET distinto). Abortando.');
  }

  for (const l of libros) {
    // El wizard construye "data" con tipoPublicacion:'LIBRO' + los campos del form,
    // y en onSubmit copia payload.tituloLibro = data.titulo (ver page.tsx onSubmit).
    const payload = {
      tipoPublicacion: 'LIBRO',
      titulo: l.titulo,
      tituloLibro: l.titulo,
      lineaInvestigacion: LINEA,
      fechaPublicacion: l.fechaPublicacion,
      campoDetallado: 'Educación',
      estado: 'PUBLICADO',
      codigoPublicacion: l.codigoPublicacion,
      proyecto: PROYECTO_INTERNACIONALIZACION,
      isbn: l.isbn,
      revisadoPares: true,
      filiacion: FILIACION,
      identificacionParticipante: l.identificacionParticipante,
      participacion: 'Coautor',
      authors: [{ authorName: l.identificacionParticipante, order: 1, isCarreraAuthor: true, esEstudiante: false }],
    };

    const res = await fetch(`${SITE}/api/contribuciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `pine_app_session=${cookieValue}` },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    console.log(res.status, l.titulo.slice(0, 50), '->', res.ok ? `OK id=${body.id}` : JSON.stringify(body));
  }
}

run().catch(e => { console.error(e); process.exit(1); });
