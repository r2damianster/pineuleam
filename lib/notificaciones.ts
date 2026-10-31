import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { AppSession } from './session';
import { esSuperAdminOLider } from './permisos-supervision';
import { esDocente, puedeSupervisarVinculacion } from './modulos';
import { puedeAdministrarSitio } from './permisosProyecto';
import { proyectosQueLidera } from './permisosAprobacionContenido';
import { periodoPorDefecto, construirPeriodo } from './periodosProyecto';

/**
 * Módulo de notificaciones del Portal PINE.
 *
 * Las notificaciones son DERIVADAS: cada regla cuenta pendientes reales en Neon
 * (no hay tabla de avisos, así nunca se desincronizan). Para agregar un aviso nuevo
 * basta con sumar una regla a REGLAS_NOTIFICACION al final de este archivo.
 *
 * ⚠️ REGLA DEL PROYECTO: toda función nueva del portal que deje algo "pendiente"
 * para alguien (aprobar, revisar, completar, responder) DEBE agregar su regla aquí
 * y documentarse en NOTIFICACIONES.md. Ver la checklist de ese archivo.
 */

export type SeveridadNotificacion = 'info' | 'pendiente' | 'alerta';

export interface Notificacion {
  id: string;
  cantidad: number;
  mensaje: string;
  href: string;
  severidad: SeveridadNotificacion;
}

type ClienteSql = NeonQueryFunction<false, false>;

interface ReglaNotificacion {
  /** Identificador estable (kebab-case). Se usa como key en la UI. */
  id: string;
  /** Quién ve este aviso. Usar la misma condición que protege la pantalla destino. */
  aplica: (sesion: AppSession) => boolean;
  /** Devuelve la notificación, o null si no hay nada pendiente. */
  consultar: (sql: ClienteSql, sesion: AppSession) => Promise<Notificacion | null>;
}

const plural = (cantidad: number, singular: string, pluralTexto: string) =>
  `${cantidad} ${cantidad === 1 ? singular : pluralTexto}`;

const REGLAS_NOTIFICACION: ReglaNotificacion[] = [
  {
    // Supervisor de Vinculación: asistencias que registraron los pasantes y esperan aprobación.
    // Misma visibilidad que GET /api/vinculacion/supervisar-asistencia.
    id: 'asistencias-por-aprobar',
    aplica: (sesion) => puedeSupervisarVinculacion(sesion),
    consultar: async (sql, sesion) => {
      const veTodo = esSuperAdminOLider(sesion);
      const profesorId = Number(sesion.id);
      const [fila] = await sql`
        SELECT COUNT(*)::int AS total
        FROM asistencia_espacio ae
        JOIN "espacios_enseñanza" e ON e.id = ae.espacio_id
        WHERE e.area = 'vinculacion'
          AND ae.estado_aprobacion = 'pendiente'
          AND (${veTodo}::boolean IS TRUE OR e.profesor_id = ${profesorId}
               -- Igual que GET /api/vinculacion/supervisar-asistencia: también las sesiones de un espacio ajeno
               -- donde asistió un pasante del que soy supervisor titular.
               OR EXISTS (
                 SELECT 1 FROM asistencia_instructores aiv
                 JOIN espacio_instructores eit ON eit.usuario_id = aiv.usuario_id AND eit.tipo = 'titular'
                 JOIN "espacios_enseñanza" est ON est.id = eit.espacio_id AND est.area = 'vinculacion' AND est.profesor_id = ${profesorId}
                 WHERE aiv.asistencia_id = ae.id))
      `;
      const total = Number(fila?.total || 0);
      if (total === 0) return null;
      return {
        id: 'asistencias-por-aprobar',
        cantidad: total,
        mensaje: `Tienes ${plural(total, 'registro de asistencia', 'registros de asistencia')} por aprobar.`,
        href: '/vinculacion/supervisar',
        severidad: 'pendiente',
      };
    },
  },
  {
    // Supervisor de Vinculación: horas de podcast e investigación de sus pasantes por aprobar.
    // Misma visibilidad que GET /api/vinculacion/supervisar-horas: solo pasantes de los que soy supervisor titular.
    id: 'horas-por-aprobar',
    aplica: (sesion) => puedeSupervisarVinculacion(sesion),
    consultar: async (sql, sesion) => {
      const veTodo = esSuperAdminOLider(sesion);
      const profesorId = Number(sesion.id);
      const [fila] = await sql`
        SELECT
          (SELECT COUNT(*) FROM horas_podcast_pasante h WHERE h.estado_aprobacion = 'pendiente'
             AND (${veTodo}::boolean IS TRUE OR EXISTS (
               SELECT 1 FROM espacio_instructores ei JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
               WHERE ei.usuario_id = h.usuario_id AND ei.tipo = 'titular' AND e.area = 'vinculacion' AND e.profesor_id = ${profesorId}))) AS podcast,
          (SELECT COUNT(*) FROM actividades_investigacion_pasante a WHERE a.estado_aprobacion = 'pendiente'
             AND (${veTodo}::boolean IS TRUE OR EXISTS (
               SELECT 1 FROM espacio_instructores ei JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
               WHERE ei.usuario_id = a.usuario_id AND ei.tipo = 'titular' AND e.area = 'vinculacion' AND e.profesor_id = ${profesorId}))) AS investigacion,
          (SELECT COUNT(*) FROM actividades_autonomas_pasante a WHERE a.estado_aprobacion = 'pendiente'
             AND (${veTodo}::boolean IS TRUE OR EXISTS (
               SELECT 1 FROM espacio_instructores ei JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
               WHERE ei.usuario_id = a.usuario_id AND ei.tipo = 'titular' AND e.area = 'vinculacion' AND e.profesor_id = ${profesorId}))) AS autonomas
      `;
      const conteos = { podcast: Number(fila?.podcast || 0), investigacion: Number(fila?.investigacion || 0), autonomas: Number(fila?.autonomas || 0) };
      const total = conteos.podcast + conteos.investigacion + conteos.autonomas;
      if (total === 0) return null;
      return {
        id: 'horas-por-aprobar',
        cantidad: total,
        mensaje: `Tienes ${plural(total, 'registro', 'registros')} por aprobar (${[
          conteos.podcast && `${conteos.podcast} de podcast`,
          conteos.investigacion && `${conteos.investigacion} de investigación`,
          conteos.autonomas && `${conteos.autonomas} de actividades autónomas`,
        ].filter(Boolean).join(', ')}).`,
        href: '/vinculacion/supervisar',
        severidad: 'pendiente',
      };
    },
  },
  {
    // Pasante: asistencias que registró o en las que figura presente y el supervisor rechazó. Sin tabla de "leído":
    // el aviso vive 14 días desde el rechazo (ventana de tiempo) y luego se apaga solo.
    id: 'asistencias-rechazadas',
    aplica: (sesion) => sesion.rol === 'estudiante',
    consultar: async (sql, sesion) => {
      const pasanteId = Number(sesion.id);
      const [fila] = await sql`
        SELECT COUNT(*)::int AS total
        FROM asistencia_espacio ae
        WHERE (ae.registrado_por = ${pasanteId}
               OR EXISTS (SELECT 1 FROM asistencia_instructores ai WHERE ai.asistencia_id = ae.id AND ai.usuario_id = ${pasanteId}))
          AND ae.estado_aprobacion = 'rechazado'
          AND COALESCE(ae.fecha_aprobacion, ae.creado_en) >= NOW() - INTERVAL '14 days'
      `;
      const total = Number(fila?.total || 0);
      if (total === 0) return null;
      return {
        id: 'asistencias-rechazadas',
        cantidad: total,
        mensaje: `${plural(total, 'registro de asistencia en el que figuras fue rechazado', 'registros de asistencia en los que figuras fueron rechazados')} por el supervisor. Revisa el motivo; si lo registraste tú, vuelve a registrarlo.`,
        href: '/portal/mi-avance',
        severidad: 'alerta',
      };
    },
  },
  {
    // Supervisor: encuestas que un pasante llenó desde su propia cuenta (no el beneficiario por QR).
    // Sin tabla de "leído": el aviso vive 14 días desde el registro. Mismo alcance que
    // GET /api/vinculacion/supervisores/indicadores (espacios donde es profesor responsable).
    id: 'encuestas-llenadas-por-pasante',
    aplica: (sesion) => puedeSupervisarVinculacion(sesion),
    consultar: async (sql, sesion) => {
      const veTodo = esSuperAdminOLider(sesion);
      const profesorId = Number(sesion.id);
      const [fila] = await sql`
        SELECT COUNT(*)::int AS total
        FROM encuestas_satisfaccion enc
        JOIN "espacios_enseñanza" e ON e.id = enc.espacio_id
        WHERE e.area = 'vinculacion'
          AND enc.origen = 'panel_pasante'
          AND enc.fecha >= NOW() - INTERVAL '14 days'
          AND (${veTodo}::boolean IS TRUE OR e.profesor_id = ${profesorId})
      `;
      const total = Number(fila?.total || 0);
      if (total === 0) return null;
      return {
        id: 'encuestas-llenadas-por-pasante',
        cantidad: total,
        mensaje: `${plural(total, 'encuesta fue llenada', 'encuestas fueron llenadas')} por un pasante desde su cuenta (no por el beneficiario) en los últimos 14 días. Revísalas en Indicadores.`,
        href: '/vinculacion/supervisar/indicadores',
        severidad: 'info',
      };
    },
  },
  {
    // Administrador de contenido: podcasts/videos propuestos que aún no salen en la web pública.
    id: 'videos-por-aprobar',
    aplica: (sesion) => sesion.modulos_acceso.includes('contenido_sitio'),
    consultar: async (sql) => {
      const [fila] = await sql`SELECT COUNT(*)::int AS total FROM videos WHERE aprobado_sitio = false`;
      const total = Number(fila?.total || 0);
      if (total === 0) return null;
      return {
        id: 'videos-por-aprobar',
        cantidad: total,
        mensaje: `Tienes ${plural(total, 'video/podcast', 'videos/podcasts')} por aprobar.`,
        href: '/admin/videos',
        severidad: 'pendiente',
      };
    },
  },
  {
    // Administrador de contenido: eventos/noticias registrados por docentes, pasantes o externos.
    id: 'difusion-por-aprobar',
    aplica: (sesion) => sesion.modulos_acceso.includes('contenido_sitio'),
    consultar: async (sql) => {
      const [fila] = await sql`SELECT COUNT(*)::int AS total FROM actividades_difusion WHERE aprobado_sitio = false`;
      const total = Number(fila?.total || 0);
      if (total === 0) return null;
      return {
        id: 'difusion-por-aprobar',
        cantidad: total,
        mensaje: `Tienes ${plural(total, 'evento/actividad', 'eventos/actividades')} de difusión por aprobar.`,
        href: '/admin/contenido',
        severidad: 'pendiente',
      };
    },
  },
  {
    // Administración del sitio: fotos con menores (o dudosas) esperando revisión humana. La foto NO se
    // publica hasta que alguien la marque como revisada. Destino /admin/photos (middleware: contenido_sitio).
    id: 'fotos-menores-por-revisar',
    aplica: (sesion) => sesion.modulos_acceso.includes('contenido_sitio'),
    consultar: async (sql) => {
      // descartada=false: una foto descartada ya salió de la cola de trabajo (aunque su columna
      // `menores` haya quedado en 'revisar' — la acción "descartar" no la toca, solo apaga la foto).
      const [fila] = await sql`SELECT COUNT(*)::int AS total FROM fotos WHERE menores = 'revisar' AND descartada = false`;
      const total = Number(fila?.total || 0);
      if (total === 0) return null;
      return {
        id: 'fotos-menores-por-revisar',
        cantidad: total,
        mensaje: `Tienes ${plural(total, 'foto', 'fotos')} por revisar (posibles menores de edad).`,
        href: '/admin/photos?menores=revisar',
        severidad: 'pendiente',
      };
    },
  },
  {
    // Líder/colíder de proyecto (sin ser administración del sitio): fotos nuevas de su proyecto sin ubicar
    // en los últimos 14 días. Misma condición que el panel /portal/proyecto (docente + líder/colíder activo).
    id: 'fotos-sin-ubicar-proyecto',
    aplica: (sesion) => esDocente(sesion) && !puedeAdministrarSitio(sesion),
    consultar: async (sql, sesion) => {
      const usuarioId = Number(sesion.id);
      if (Number.isNaN(usuarioId)) return null;
      const proyectos = await sql`
        SELECT proyecto_id FROM proyecto_miembros
        WHERE usuario_id = ${usuarioId} AND activo = true AND rol_en_proyecto IN ('lider', 'colider')
      `;
      const proyectoIds = proyectos.map((fila) => String(fila.proyecto_id));
      if (proyectoIds.length === 0) return null;
      const [fila] = await sql`
        SELECT COUNT(*)::int AS total
        FROM fotos
        WHERE proyectos && ${proyectoIds}::text[]
          AND visibilidad = 'publicable' AND menores = 'no' AND activo = true
          AND cardinality(ubicaciones) = 0
          AND created > now() - interval '14 days'
          AND (
            origen IN ('admin', 'lider', 'evidencia_evento')
            OR (origen IN ('evento', 'podcast') AND EXISTS (
              SELECT 1 FROM actividades_difusion a WHERE a.id::text = fotos.fuente_id AND a.aprobado_sitio = true))
            OR (origen = 'asistencia' AND EXISTS (
              SELECT 1 FROM asistencia_espacio s WHERE s.id::text = fotos.fuente_id AND s.estado_aprobacion = 'aprobado'))
          )
      `;
      const total = Number(fila?.total || 0);
      if (total === 0) return null;
      return {
        id: 'fotos-sin-ubicar-proyecto',
        cantidad: total,
        mensaje: `Tu proyecto tiene ${plural(total, 'foto nueva', 'fotos nuevas')} sin ubicar en la web.`,
        href: proyectoIds.length === 1 ? `/portal/proyecto/${proyectoIds[0]}/fotos?estado=sin_ubicar` : '/portal/proyecto',
        severidad: 'info',
      };
    },
  },
  {
    // Sesión 53: eventos/podcasts donde este docente es profesor responsable, sin aprobar todavía.
    // Misma condición que protege /portal/aprobaciones (cualquier docente).
    id: 'contenido-por-aprobar-responsable',
    aplica: (sesion) => esDocente(sesion),
    consultar: async (sql, sesion) => {
      const usuarioId = Number(sesion.id);
      if (Number.isNaN(usuarioId)) return null;
      // Sesión 60: también los de proyectos que esta persona lidera/colidera. Sin umbral de
      // antigüedad: el aviso sigue hasta que se apruebe.
      const proyectosLiderados = await proyectosQueLidera(sql, usuarioId);
      const [fila] = await sql`
        SELECT COUNT(*)::int AS total FROM actividades_difusion
        WHERE aprobado_sitio = false
          AND (${usuarioId} = ANY(profesores_responsables) OR proyectos && ${proyectosLiderados}::text[])
      `;
      const total = Number(fila?.total || 0);
      if (total === 0) return null;
      return {
        id: 'contenido-por-aprobar-responsable',
        cantidad: total,
        mensaje: `Tienes ${plural(total, 'evento/podcast', 'eventos/podcasts')} por aprobar (como responsable o líder de proyecto).`,
        href: '/portal/aprobaciones',
        severidad: 'pendiente',
      };
    },
  },
  {
    // Supervisor de Vinculación: informe SEMESTRAL del periodo fijo anterior sin generar
    // (Sesión 56: periodos fijos abr-ago/sep-dic, un informe por semestre — ver
    // lib/periodosProyecto.ts). Se identifica por (tipo, supervisor_id, ciclo_id), no por
    // `mes` (esa columna queda NULL a propósito desde Sesión 56, ver app/vinculacion/informes/api/route.ts).
    id: 'informe-supervisor-pendiente',
    aplica: (sesion) => puedeSupervisarVinculacion(sesion),
    consultar: async (sql, sesion) => {
      const actual = periodoPorDefecto();
      const anterior = actual.numero === 1
        ? construirPeriodo(actual.anio - 1, 2)
        : construirPeriodo(actual.anio, 1);
      const supervisorId = Number(sesion.id);

      const [ciclo] = await sql`SELECT id FROM ciclos_academicos WHERE nombre = ${anterior.etiqueta} LIMIT 1`;
      if (!ciclo) return null;

      const [fila] = await sql`
        SELECT COUNT(*)::int AS total
        FROM asistencia_espacio ae
        JOIN "espacios_enseñanza" e ON e.id = ae.espacio_id
        WHERE e.area = 'vinculacion'
          AND ae.estado_aprobacion = 'aprobado'
          AND ae.fecha BETWEEN ${anterior.desde}::date AND ${anterior.hasta}::date
          AND (${esSuperAdminOLider(sesion)}::boolean IS TRUE OR e.profesor_id = ${supervisorId})
          AND NOT EXISTS (
            SELECT 1 FROM informes_vinculacion i
            WHERE i.tipo = 'supervisor'
              AND i.ciclo_id = ${ciclo.id}
              AND i.supervisor_id = ${supervisorId}
          )
      `;
      const total = Number(fila?.total || 0);
      if (total === 0) return null;
      return {
        id: 'informe-supervisor-pendiente',
        cantidad: 1,
        mensaje: `Tienes pendiente generar el informe semestral de Vinculación correspondiente al periodo ${anterior.etiqueta}.`,
        href: '/vinculacion/informes',
        severidad: 'pendiente',
      };
    },
  },
  {
    // Líder/colíder de un proyecto de Investigación: aportes de su equipo por validar
    // (investigacion_aportes). Misma condición que protege /investigacion/proyectos/[id]/equipo
    // (puedeGestionarProyecto): líder/colíder activo del proyecto, o administración del sitio — esta
    // última no recibe el aviso (ve todo y no es quien valida día a día).
    id: 'aportes-investigacion-por-validar',
    aplica: (sesion) => esDocente(sesion),
    consultar: async (sql, sesion) => {
      const proyectosLiderados = await proyectosQueLidera(sql, Number(sesion.id));
      if (proyectosLiderados.length === 0) return null;
      const pendientes = await sql`
        SELECT proyecto_id, COUNT(*)::int AS total
        FROM investigacion_aportes
        WHERE estado_validacion = 'pendiente' AND proyecto_id = ANY(${proyectosLiderados}::text[])
        GROUP BY proyecto_id
        ORDER BY total DESC
      `;
      if (pendientes.length === 0) return null;
      const total = pendientes.reduce((suma: number, fila: any) => suma + Number(fila.total), 0);
      return {
        id: 'aportes-investigacion-por-validar',
        cantidad: total,
        mensaje: `Tienes ${plural(total, 'aporte', 'aportes')} de investigación por validar.`,
        href: `/investigacion/proyectos/${pendientes[0].proyecto_id}/equipo`,
        severidad: 'pendiente',
      };
    },
  },
  {
    // Docente que generó un enlace/QR de contribuciones: envíos externos esperando su aprobación
    // ("Contribution".aprobada = false, creadoPorId = él). Misma condición que
    // POST /api/contribuciones/[id]/aprobar (admin también puede aprobar, pero ve todo en el listado y
    // no recibe el aviso de envíos ajenos).
    id: 'contribuciones-por-aprobar',
    aplica: (sesion) => esDocente(sesion),
    consultar: async (sql, sesion) => {
      const [fila] = await sql`
        SELECT COUNT(*)::int AS total
        FROM "Contribution"
        WHERE "aprobada" = false AND "origen" = 'enlace_externo' AND "creadoPorId" = ${Number(sesion.id)}
      `;
      const total = Number(fila?.total ?? 0);
      if (total === 0) return null;
      return {
        id: 'contribuciones-por-aprobar',
        cantidad: total,
        mensaje: `Tienes ${plural(total, 'contribución enviada por enlace', 'contribuciones enviadas por enlace')} por aprobar.`,
        href: '/contribuciones',
        severidad: 'pendiente',
      };
    },
  },
];

/**
 * Devuelve las notificaciones de la sesión activa. Bajo "Ver como" la sesión es la
 * del usuario suplantado, así se ve exactamente lo que esa persona vería.
 * Una regla que falla no tumba a las demás.
 */
export async function obtenerNotificaciones(sesion: AppSession): Promise<Notificacion[]> {
  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
  const reglasAplicables = REGLAS_NOTIFICACION.filter((regla) => regla.aplica(sesion));

  const resultados = await Promise.all(
    reglasAplicables.map(async (regla) => {
      try {
        return await regla.consultar(sql, sesion);
      } catch (error) {
        console.error(`[notificaciones] regla "${regla.id}" falló:`, error);
        return null;
      }
    })
  );

  return resultados.filter((notificacion): notificacion is Notificacion => notificacion !== null);
}
