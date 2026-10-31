import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionCookieValue, createSessionCookieValue, SESSION_COOKIE, type AppSession } from '@/lib/session';
import { puedeGestionarVinculacion, puedeSupervisarVinculacion, puedeGestionarInvestigacion, esSecretaria, esColaborador, puedeUsarUtilidades, RUTAS_SECRETARIA, RUTAS_COLABORADOR } from '@/lib/modulos';

// Expiración "sliding": reemite la cookie con maxAge completo (8h, ver
// lib/session.ts) en cada request autenticado que pasa por el middleware —
// así el usuario se mantiene logueado mientras siga visitando el Portal al
// menos una vez cada 8 horas, en vez de expirar a fecha fija desde el login.
async function conSesionRenovada(response: NextResponse, session: AppSession): Promise<NextResponse> {
  const cookieValue = await createSessionCookieValue(session);
  response.cookies.set({
    name: SESSION_COOKIE.name,
    value: cookieValue,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_COOKIE.maxAge,
    path: '/',
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas que requieren estar autenticado (Portal unificado).
  // OJO: '/vinculacion/dinamicas-linguisticas' es contenido publico (nunca requirio login)
  // y '/registro' es la pagina de alta de cuenta — no puede exigir sesion previa.
  const protectedRoutes = [
    '/portal/dashboard',
    '/portal/perfil',
    '/portal/subir-video',
    '/portal/mi-avance',
    '/portal/proyecto',
    '/portal/aprobaciones',
    '/portal/rollup',
    '/portal/tutoriales',
    '/vinculacion/dinamicas-linguisticas/asistencia',
    '/vinculacion/espacios',
    '/vinculacion/asistencia',
    '/vinculacion/registrar-evaluar',
    '/vinculacion/pasantes',
    '/vinculacion/horas',
    '/vinculacion/topes-horas',
    '/vinculacion/proyeccion-horas',
    '/vinculacion/supervisar',
    '/vinculacion/difusion',
    '/vinculacion/evaluacion-final',
    '/vinculacion/encuesta',
    '/vinculacion/investigacion-actividades',
    '/vinculacion/actividades-autonomas',
    '/investigacion/informes',
    '/investigacion/mis-aportes',
    '/investigacion/proyectos',
    '/gestion-carrera',
    '/pine-dashboard',
    '/contribuciones',
    '/utilidades',
    '/superadmin',
  ];

  // Whitelist de emails para /superadmin — mismo hardcode que
  // lib/superadmin-auth.ts (no se puede importar Node/@neondatabase acá
  // porque el middleware corre en Edge runtime; se duplica a propósito,
  // ambos deben mantenerse en sync).
  const SUPERADMIN_EMAILS = ['arturo.rodriguez@uleam.edu.ec'];

  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtected) {
    const session = await verifySessionCookieValue(request.cookies.get(SESSION_COOKIE.name)?.value);

    if (!session) {
      const loginUrl = new URL('/portal/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Secretaria: solo Mi Perfil, Utilidades y el dashboard. Cualquier otra ruta protegida
    // se le niega por defecto (no depende de que cada chequeo de abajo la excluya).
    if (esSecretaria(session) && !RUTAS_SECRETARIA.some(ruta => pathname.startsWith(ruta))) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    // Colaborador de Investigación: solo su dashboard, su perfil y sus aportes (default-deny).
    if (esColaborador(session) && !RUTAS_COLABORADOR.some(ruta => pathname.startsWith(ruta))) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    // Aportes de Investigación: docentes y colaboradores (un pasante de Vinculación nunca es aportante).
    // La administración del equipo es de docentes; el permiso por proyecto lo valida cada API.
    if (
      pathname.startsWith('/investigacion/mis-aportes') &&
      !['profesor', 'admin', 'colaborador'].includes(session.rol)
    ) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }
    if (pathname.startsWith('/investigacion/proyectos') && !['profesor', 'admin'].includes(session.rol)) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (
      (pathname.startsWith('/vinculacion/espacios') ||
       pathname.startsWith('/vinculacion/asistencia') ||
       pathname.startsWith('/vinculacion/registrar-evaluar') ||
       pathname.startsWith('/vinculacion/evaluacion-final') ||
       pathname.startsWith('/vinculacion/encuesta')) &&
      !['profesor', 'admin', 'estudiante'].includes(session.rol)
    ) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    // Gestión (crear espacios, administrar pasantes): solo líder de Vinculación / superadmin.
    if (
      (pathname.startsWith('/vinculacion/pasantes') || pathname.startsWith('/vinculacion/espacios') || pathname.startsWith('/vinculacion/horas') || pathname.startsWith('/vinculacion/topes-horas') || pathname.startsWith('/vinculacion/proyeccion-horas')) &&
      !puedeGestionarVinculacion(session)
    ) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (
      pathname.startsWith('/vinculacion/supervisar') &&
      !puedeSupervisarVinculacion(session)
    ) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (
      pathname.startsWith('/portal/subir-video') &&
      !['profesor', 'admin'].includes(session.rol) &&
      !(session.rol === 'estudiante' && session.modulos_acceso.includes('subir_video'))
    ) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (
      pathname.startsWith('/vinculacion/investigacion-actividades') &&
      !(session.rol === 'estudiante' && session.modulos_acceso.includes('investigacion'))
    ) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (pathname.startsWith('/vinculacion/actividades-autonomas') && session.rol !== 'estudiante') {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (
      pathname.startsWith('/investigacion/informes') &&
      !puedeGestionarInvestigacion(session)
    ) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    // Panel de proyecto (líderes/colíderes): solo docentes. Qué proyecto puede administrar cada quien lo
    // decide la API en cada petición (proyecto_miembros), no esta redirección.
    if (pathname.startsWith('/portal/proyecto') && !['profesor', 'admin'].includes(session.rol)) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    // Mis aprobaciones (Sesión 53, profesor responsable): solo docentes; el detalle de qué puede
    // aprobar cada uno lo decide la API (profesores_responsables), no esta redirección.
    if (pathname.startsWith('/portal/aprobaciones') && !['profesor', 'admin'].includes(session.rol)) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    // Generador de roll up (todos los docentes): el roll up no se guarda, todo ocurre en el navegador.
    if (pathname.startsWith('/portal/rollup') && !['profesor', 'admin'].includes(session.rol)) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (pathname.startsWith('/gestion-carrera') && !['profesor', 'admin'].includes(session.rol)) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (pathname.startsWith('/pine-dashboard') && !['profesor', 'admin'].includes(session.rol)) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    // Listado, wizard y edición de contribuciones: cualquier docente autenticado.
    // Editar (autor/coautor/creador) se valida además en la API — ver
    // lib/permisosContribucion.ts. Borrar sigue siendo solo admin/superadmin.
    if (pathname.startsWith('/contribuciones') && !['profesor', 'admin'].includes(session.rol)) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    // Utilidades: generadores de documentos (Acta Técnica, Oficios, Convocatorias,
    // PAT Maestría, Pares Lectores) — abierto a cualquier docente, no ligado a modulos_acceso.
    if (pathname.startsWith('/utilidades') && !puedeUsarUtilidades(session)) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    // Superadmin: acceso absoluto a la Neon (explorador de tablas + SQL crudo).
    // Doble candado — modulos_acceso Y email hardcodeado — ver lib/superadmin-auth.ts.
    if (
      pathname.startsWith('/superadmin') &&
      (!session.modulos_acceso.includes('superadmin') || !SUPERADMIN_EMAILS.includes(session.email))
    ) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    return conSesionRenovada(NextResponse.next(), session);
  }

  // Panel admin legacy (gestion de contenido estatico del sitio) — ahora vive
  // bajo la misma sesion unificada del Portal, requiere modulo 'contenido_sitio'
  // (distinto de 'admin', que solo controla /pine-dashboard). Restringido a
  // lider/colider de este proyecto especifico.
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const session = await verifySessionCookieValue(request.cookies.get(SESSION_COOKIE.name)?.value);
    // /admin/roles (asignar módulos a cada persona) exige además el módulo 'admin'.
    if (session && pathname.startsWith('/admin/roles') && !session.modulos_acceso.includes('admin')) {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }
    if (!session || !session.modulos_acceso.includes('contenido_sitio')) {
      const loginUrl = new URL('/portal/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return conSesionRenovada(NextResponse.next(), session);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|files).*)'],
};
