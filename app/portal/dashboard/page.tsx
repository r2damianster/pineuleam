import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { neon } from '@neondatabase/serverless';
import { verifySessionCookieValue, SESSION_COOKIE } from '@/lib/session';
import { proyectosGestionables as obtenerProyectosGestionables, puedeAdministrarSitio } from '@/lib/permisosProyecto';
import { SUPERADMIN_EMAILS } from '@/lib/superadmin-auth';
import { puedeVerRegistrosVinculacion } from '@/lib/permisos-supervision';
import { obtenerTopes } from '@/lib/topesHoras';
import { proyectosComoAportante } from '@/lib/investigacionAportes';
import { esDocente as esDocenteSesion, esSecretaria as esSecretariaSesion, puedeGestionarVinculacion, puedeSupervisarVinculacion, puedeGestionarInvestigacion, tieneModulo } from '@/lib/modulos';
import { obtenerNotificaciones } from '@/lib/notificaciones';
import { tutorialesParaRol } from '@/lib/tutoriales';
import PendientesPortal from '@/components/PendientesPortal';
import Header from '@/components/Header';
import Link from 'next/link';

export default async function PortalDashboard() {
  const cookieStore = await cookies();
  const session = await verifySessionCookieValue(cookieStore.get(SESSION_COOKIE.name)?.value);

  if (!session) {
    redirect('/portal/login');
  }

  // Los módulos viajan dentro de la cookie: si /admin/roles los cambió en Neon, se re-emite la
  // cookie (app/api/auth/sync) y se vuelve aquí, sin obligar a iniciar sesión otra vez.
  {
    const sqlSync = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const [filaActual] = await sqlSync`SELECT rol, modulos_acceso FROM usuarios WHERE id = ${parseInt(session.id, 10)}`;
    if (filaActual) {
      const modulosBD = [...(filaActual.modulos_acceso || [])].sort().join(',');
      const modulosCookie = [...(session.modulos_acceso || [])].sort().join(',');
      if (modulosBD !== modulosCookie || filaActual.rol !== session.rol) {
        redirect('/api/auth/sync?redirect=/portal/dashboard');
      }
    }
  }

  const { modulos_acceso, nombres, rol, email } = session;
  const esDocente = esDocenteSesion(session);
  const esSecretaria = esSecretariaSesion(session);
  // Proyectos que esta persona administra (líder/colíder en proyecto_miembros; administración del sitio: todos).
  // Se consulta en Neon en cada carga, no con la cookie.
  let proyectosAdministrables: { id: string; nombre_oficial: string }[] = [];
  if (esDocente) {
    try {
      proyectosAdministrables = await obtenerProyectosGestionables(neon(process.env.DATABASE_URL!), session);
    } catch {
      proyectosAdministrables = [];
    }
  }

  // Proyectos de Investigación a los que esta persona aporta (docente o colaborador; nunca un pasante).
  let proyectosComoAportanteInvestigacion: { id: string; nombre_oficial: string }[] = [];
  if (esDocente || rol === 'colaborador') {
    try {
      proyectosComoAportanteInvestigacion = await proyectosComoAportante(neon(process.env.DATABASE_URL!), parseInt(session.id, 10));
    } catch {
      proyectosComoAportanteInvestigacion = [];
    }
  }

  // Horas acreditables por podcast de Vinculación (Sesión 38) — solo cuenta
  // episodios ya aprobados en /admin/videos, ver lib/horasPodcast.ts. Las
  // horas se calculan recién al aprobar (Sesión 40), no al subir — episodiosPendientes
  // cuenta cuántos le faltan por aprobar al profesor, para que el pasante
  // sepa por qué todavía no ve esas horas.
  let horasPodcastAcreditadas = 0;
  let episodiosPendientes = 0;
  let horasAsistenciaAcreditadas = 0;
  let autonomasHabilitadas = true;
  let investigacionHabilitada = true;
  if (rol === 'estudiante') {
    const sql = neon(process.env.DATABASE_URL!);
    const usuarioId = parseInt(session.id, 10);
    const [fila] = await sql`
      SELECT COALESCE(SUM(h.horas_total), 0) AS total
      FROM horas_podcast_pasante h
      WHERE h.usuario_id = ${usuarioId} AND h.estado_aprobacion = 'aprobado'
    `;
    horasPodcastAcreditadas = Number(fila?.total || 0);

    const [pendientesFila] = await sql`
      SELECT COUNT(*) AS total FROM horas_podcast_pasante
      WHERE usuario_id = ${usuarioId} AND estado_aprobacion = 'pendiente'
    `;
    episodiosPendientes = Number(pendientesFila?.total || 0);

    const [filaAsistencia] = await sql`
      SELECT COALESCE(SUM(ha.horas), 0) AS total FROM horas_asistencia_instructor ha WHERE ha.usuario_id = ${usuarioId}
    `;
    horasAsistenciaAcreditadas = Number(filaAsistencia?.total || 0);

    // Perfil de horas (topes_horas_pasante): un tipo con tope 0 no está habilitado y no se ofrece.
    const topesPasante = await obtenerTopes(sql, usuarioId);
    autonomasHabilitadas = topesPasante.autonomas !== 0;
    investigacionHabilitada = topesPasante.investigacion !== 0;
  }

  const notificaciones = await obtenerNotificaciones(session);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Bienvenido al Portal PINE</h1>
            <p className="text-gray-600 mt-2">Hola, {nombres}. Selecciona el módulo al que deseas acceder:</p>
          </div>

          <PendientesPortal notificaciones={notificaciones} />

          {/* Dashboard PINE: acceso propio y siempre visible para todo docente. */}
          {esDocente && (
            <Link
              href="/pine-dashboard"
              className="mb-6 flex items-center justify-between gap-4 rounded-xl bg-uleam-blue px-6 py-4 text-white shadow-md hover:shadow-lg transition"
            >
              <span>
                <span className="block text-lg font-bold">📊 Dashboard PINE</span>
                <span className="block text-sm text-blue-100">Metas e indicadores del proyecto en tiempo real, con filtro por período.</span>
              </span>
              <span className="text-sm font-semibold whitespace-nowrap">Abrir &rarr;</span>
            </Link>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Yo y la Carrera — perfil y contribuciones. Todo docente. El Dashboard PINE va aparte, arriba. */}
            {esDocente && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-indigo-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Yo y la Carrera</h3>
                <p className="text-gray-600 mb-4 text-sm">Tu perfil y tus contribuciones académicas.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/portal/perfil" className="text-indigo-600 hover:underline">» Ver/Editar Mi Perfil</Link>
                  <Link href="/contribuciones/new" className="text-indigo-600 hover:underline">» Registrar Contribución (artículo, libro, ponencia…)</Link>
                  <Link href="/gestion-carrera" className="text-indigo-600 hover:underline">» Registrar Evento o Podcast</Link>
                  <Link href="/contribuciones" className="text-indigo-600 hover:underline">» Ver Contribuciones Registradas</Link>
                </div>
              </div>
            )}


            {/* Vinculación — Registros: tareas diarias. Solo pasantes (rol estudiante),
                superadmin y líder de Vinculación (lib/permisos-supervision.ts). El pasante
                nunca tiene modulos_acceso:vinculacion — su acceso real es por
                espacio_instructores (lib/permisos-espacio.ts). */}
            {puedeVerRegistrosVinculacion(session) && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Registros de Vinculación</h3>
                <p className="text-gray-600 mb-4 text-sm">Registro+Pre-Test, asistencia, evaluación final y difusión de tu espacio.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/vinculacion/registrar-evaluar" className="text-blue-600 hover:underline">» Registrar y evaluar beneficiario</Link>
                  <Link href="/vinculacion/asistencia" className="text-blue-600 hover:underline">» Asistencia</Link>
                  <Link href="/vinculacion/evaluacion-final" className="text-blue-600 hover:underline">» Evaluación final del beneficiario</Link>
                  {rol === 'estudiante' && modulos_acceso.includes('subir_video') && (
                    <Link href="/vinculacion/difusion" className="text-blue-600 hover:underline">» Registrar Evento o Podcast</Link>
                  )}
                  {/* Horas del pasante (las aprueba su supervisor). Investigación exige el módulo
                      'investigacion' (se asigna en /admin/roles); las autónomas son para todo pasante. */}
                  {rol === 'estudiante' && modulos_acceso.includes('investigacion') && investigacionHabilitada && (
                    <Link href="/vinculacion/investigacion-actividades" className="text-blue-600 hover:underline">» Registrar Actividades de Investigación</Link>
                  )}
                  {rol === 'estudiante' && autonomasHabilitadas && (
                    <Link href="/vinculacion/actividades-autonomas" className="text-blue-600 hover:underline">» Registrar Horas / Actividades Autónomas</Link>
                  )}
                </div>
              </div>
            )}

            {/* Mi Avance (Sesión 40) — siempre visible para el pasante, aunque
                todavía no haya registrado nada: horas, espacios asignados,
                beneficiarios, asistencias, evaluaciones y encuestas de su
                espacio. Antes solo existía esta tarjeta de horas de podcast y
                solo aparecía si ya tenía horas>0 — quedaba sin nada que ver. */}
            {rol === 'estudiante' && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-amber-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">📊 Mi Avance</h3>
                <p className="text-gray-600 mb-2 text-sm">Tus horas acreditables, espacios asignados, beneficiarios y evaluaciones registradas.</p>
                <p className="text-3xl font-bold text-amber-600 mb-1">{horasPodcastAcreditadas + horasAsistenciaAcreditadas} h <span className="text-sm font-normal text-gray-500">acreditadas ({horasPodcastAcreditadas} podcast + {horasAsistenciaAcreditadas} asistencia)</span></p>
                {episodiosPendientes > 0 && (
                  <p className="text-xs text-orange-600 mb-3">⏳ Tienes {episodiosPendientes} episodio(s) esperando aprobación del profesor — sus horas se suman cuando se apruebe.</p>
                )}
                <Link href="/portal/mi-avance" className="text-amber-600 hover:underline">» Ver mi avance completo</Link>
              </div>
            )}

            {/* Vinculación — Gestión: solo líder de Vinculación (módulo vinculacion_gestion) o superadmin */}
            {puedeGestionarVinculacion(session) && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-purple-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Gestión de Vinculación</h3>
                <p className="text-gray-600 mb-4 text-sm">Crear espacios y administrar pasantes.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/vinculacion/espacios" className="text-purple-600 hover:underline">» Administrar Espacios</Link>
                  <Link href="/vinculacion/pasantes" className="text-purple-600 hover:underline">» Administrar Pasantes</Link>
                  <Link href="/vinculacion/topes-horas" className="text-purple-600 hover:underline">» Topes de horas por pasante</Link>
                  <Link href="/vinculacion/proyeccion-horas" className="text-purple-600 hover:underline">» Proyección de cumplimiento de horas</Link>
                  <Link href="/vinculacion/informes?tipo=lider" className="text-purple-600 hover:underline">» Generar Informes del Líder (Mensual / Semestral)</Link>
                </div>
              </div>
            )}

            {/* Vinculación — Supervisión: profesores supervisores (Sesión 49). Cada uno ve
                solo sus espacios; superadmin/líderes ven todo (esSuperAdminOLider). */}
            {puedeSupervisarVinculacion(session) && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-indigo-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Supervisión de Vinculación</h3>
                <p className="text-gray-600 mb-4 text-sm">Aprueba o rechaza asistencia, podcast e investigación de tus pasantes, y revisa sus horas.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/vinculacion/supervisar" className="text-indigo-600 hover:underline">» Supervisar actividades y horas</Link>
                  <Link href="/vinculacion/supervisar/indicadores" className="text-indigo-600 hover:underline">» Panel de Supervisión (Indicadores)</Link>
                  <Link href="/vinculacion/informes?tipo=supervisor" className="text-indigo-600 hover:underline">» Generar Informes del Supervisor (Mensual / Semestral)</Link>
                </div>
              </div>
            )}

            {/* Investigación — informes mensuales (Groq + selección de registros del período) */}
            {puedeGestionarInvestigacion(session) && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-emerald-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Gestionar Investigación</h3>
                <p className="text-gray-600 mb-4 text-sm">Informes mensuales de actividades de investigación.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/investigacion/informes" className="text-emerald-600 hover:underline">» Generar Informe Mensual de Investigación</Link>
                </div>
              </div>
            )}

            {/* Aportes de Investigación — docentes y colaboradores agregados a un proyecto. Independiente de Vinculación. */}
            {proyectosComoAportanteInvestigacion.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-emerald-400 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Mis aportes de Investigación</h3>
                <p className="text-gray-600 mb-4 text-sm">
                  Proyectos donde colaboras: {proyectosComoAportanteInvestigacion.map((proyectoAportante) => proyectoAportante.nombre_oficial).join('; ')}.
                </p>
                <div className="flex flex-col gap-2">
                  <Link href="/investigacion/mis-aportes" className="text-emerald-600 hover:underline">» Registrar y ver mis aportes</Link>
                </div>
              </div>
            )}

            {/* Administrar mi proyecto — líderes y colíderes (Fase B del plan de administración por líderes) */}
            {proyectosAdministrables.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-green-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Administrar mi proyecto</h3>
                <p className="text-gray-600 mb-4 text-sm">Fotos y contenido de tu proyecto dentro de la carrera.</p>
                <div className="flex flex-col gap-2">
                  {puedeAdministrarSitio(session) ? (
                    <Link href="/portal/proyecto" className="text-green-700 hover:underline">» Todos los proyectos</Link>
                  ) : (
                    proyectosAdministrables.map((proyectoAdministrable) => (
                      <Link key={proyectoAdministrable.id} href={`/portal/proyecto/${proyectoAdministrable.id}`} className="text-green-700 hover:underline">
                        » {proyectoAdministrable.nombre_oficial}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Secretaria y colaborador: solo perfil (Utilidades va en su tarjeta propia, abajo). */}
            {(esSecretaria || rol === 'colaborador') && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-indigo-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Mi Perfil</h3>
                <p className="text-gray-600 mb-4 text-sm">Tus datos personales y profesionales.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/portal/perfil" className="text-indigo-600 hover:underline">» Ver/Editar Mi Perfil</Link>
                </div>
              </div>
            )}

            {/* Roll up y pósters — cualquier docente */}
            {esDocente && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-orange-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Roll up y pósters</h3>
                <p className="text-gray-600 mb-4 text-sm">
                  Arma un cartel imprimible de cualquier proyecto con fotos, QR y tu tipografía favorita. No se guarda: descárgalo.
                </p>
                <div className="flex flex-col gap-2">
                  <Link href="/portal/rollup" className="text-orange-600 hover:underline">» Crear roll up</Link>
                </div>
              </div>
            )}

            {/* Utilidades — cualquier docente y la secretaria */}
            {(esDocente || esSecretaria) && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-teal-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Utilidades</h3>
                <p className="text-gray-600 mb-4 text-sm">
                  Generación de documentos administrativos y académicos de la carrera.
                </p>
                <div className="flex flex-col gap-2">
                  <Link href="/utilidades/acta-tecnica" className="text-teal-600 hover:underline">» Acta Técnica</Link>
                  <Link href="/utilidades/oficios" className="text-teal-600 hover:underline">» Generador de Oficios</Link>
                  <Link href="/utilidades/convocatorias" className="text-teal-600 hover:underline">» Convocatorias</Link>
                  <Link href="/utilidades/pat-maestria" className="text-teal-600 hover:underline">» PATs Maestría</Link>
                  <Link href="/utilidades/pares-lectores" className="text-teal-600 hover:underline">» Pares Lectores</Link>
                  <Link href="/utilidades/certificados" className="text-teal-600 hover:underline">» Certificados</Link>
                </div>
              </div>
            )}

            {/* Módulo: Administrador de Sitio — solo líder/colider de este proyecto */}
            {modulos_acceso.includes('contenido_sitio') && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-red-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Administrador de sitio</h3>
                <p className="text-gray-600 mb-4 text-sm">Contenido del proyecto Innovaciones Pedagógicas e Internacionalización (2026-2028): miembros, publicaciones, videos, noticias, documentos, fotos y proyectos.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/admin" className="text-red-600 hover:underline">» Panel de Contenido</Link>
                  {modulos_acceso.includes('admin') && (
                    <Link href="/admin/roles" className="text-red-600 hover:underline">» Roles y usuarios</Link>
                  )}
                </div>
              </div>
            )}

            {/* Superadmin — acceso absoluto a la Neon. Atribuido única y exclusivamente a arturo.rodriguez@uleam.edu.ec */}
            {modulos_acceso.includes('superadmin') && SUPERADMIN_EMAILS.includes(email) && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-gray-800 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Superadmin</h3>
                <p className="text-gray-600 mb-4 text-sm">Acceso absoluto a la base de datos: explorador de tablas, edición directa y consola SQL.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/superadmin" className="text-gray-800 hover:underline">» Panel Superadmin</Link>
                </div>
              </div>
            )}

          </div>

          {tutorialesParaRol(rol).length > 0 && (
            <p className="mt-10 text-center text-xs text-gray-400">
              <Link href="/portal/tutoriales" className="hover:text-uleam-blue hover:underline">Tutoriales en video</Link>
            </p>
          )}

          {!esDocente && !esSecretaria && modulos_acceso.length === 0 && rol !== 'estudiante' && rol !== 'colaborador' && (
            <div className="bg-yellow-50 p-6 rounded-lg text-yellow-800 text-center">
              Tu cuenta no tiene módulos asignados aún. Por favor contacta al administrador.
            </div>
          )}

        </div>
      </div>
    </>
  );
}
