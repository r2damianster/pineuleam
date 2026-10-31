import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { esSuperAdminOLider } from '@/lib/permisos-supervision';
import { puedeSupervisarVinculacion } from '@/lib/modulos';
import { resolverSupervisorFiltro, listarSupervisores, listarPeriodos } from '@/lib/alcanceSupervision';

// Solo supervisores/líder de vinculación — el estudiante-instructor
// nunca ve esta pantalla, solo registra (ver /vinculacion/asistencia).

export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeSupervisarVinculacion(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const esLider = esSuperAdminOLider(usuario);
    const usuarioIdNum = Number(usuario.id);

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado'); // pendiente|aprobado|rechazado|todos
    const espacioId = searchParams.get('espacio_id');
    const instructorId = searchParams.get('instructor_id');
    const orden = searchParams.get('orden') || 'fecha';
    const periodoId = searchParams.get('periodo_id');
    const supervisorFiltro = resolverSupervisorFiltro(usuario, searchParams.get('supervisor'));

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });

    // Si es superadmin o líder, ve todas las asistencias de vinculación.
    // Si es supervisor regular, solo ve asistencias de espacios donde profesor_id = usuarioIdNum.
    const registros = await sql`
      SELECT
        ae.id, ae.espacio_id, e.nombre AS espacio_nombre,
        ae.fecha, ae.hora_inicio, ae.hora_fin, ae.observaciones,
        ae.foto_url, foto_descartada(ae.foto_url) AS foto_descartada, ae.estado_aprobacion, ae.motivo_rechazo, ae.creado_en,
        ae.auditoria_ia_estado, ae.auditoria_ia_conteo_detectado, ae.auditoria_ia_conteo_esperado,
        ae.registrado_por,
        (CASE WHEN ${esLider}::boolean THEN sup.nombres || ' ' || sup.apellidos END) AS supervisor_nombre,
        u.nombres AS registrado_por_nombres, u.apellidos AS registrado_por_apellidos,
        (SELECT COUNT(*)::int FROM asistencia_beneficiarios ab WHERE ab.asistencia_id = ae.id) AS num_beneficiarios,
        (
          SELECT COALESCE(json_agg(o.id ORDER BY o.id), '[]')
          FROM asistencia_espacio o
          WHERE o.id <> ae.id AND o.espacio_id = ae.espacio_id AND o.fecha = ae.fecha
            AND o.hora_inicio < ae.hora_fin AND ae.hora_inicio < o.hora_fin
            AND o.estado_aprobacion <> 'rechazado'
            AND EXISTS (
              SELECT 1 FROM asistencia_beneficiarios b1
              JOIN asistencia_beneficiarios b2 ON b2.beneficiario_id = b1.beneficiario_id
              WHERE b1.asistencia_id = ae.id AND b2.asistencia_id = o.id)
        ) AS posibles_duplicados,
        (
          SELECT COALESCE(json_agg(json_build_object('id', iu.id, 'nombre', iu.nombres || ' ' || iu.apellidos)), '[]')
          FROM espacio_instructores ei JOIN usuarios iu ON iu.id = ei.usuario_id
          WHERE ei.espacio_id = ae.espacio_id
        ) AS instructores,
        (
          SELECT COALESCE(json_agg(json_build_object('id', au.id, 'nombre', au.nombres || ' ' || au.apellidos, 'tipo', ai.tipo)), '[]')
          FROM asistencia_instructores ai JOIN usuarios au ON au.id = ai.usuario_id
          WHERE ai.asistencia_id = ae.id
        ) AS asistentes_instructor
      FROM asistencia_espacio ae
      JOIN "espacios_enseñanza" e ON e.id = ae.espacio_id
      JOIN usuarios u ON u.id = ae.registrado_por
      LEFT JOIN usuarios sup ON sup.id = e.profesor_id
      WHERE e.area = 'vinculacion'
        AND (
          ${supervisorFiltro}::int IS NULL
          OR e.profesor_id = ${supervisorFiltro}::int
          -- También ve las sesiones donde asistió un pasante cuyo supervisor titular es él (espacios de otro supervisor).
          OR EXISTS (
            SELECT 1 FROM asistencia_instructores aiv
            JOIN espacio_instructores eit ON eit.usuario_id = aiv.usuario_id AND eit.tipo = 'titular'
            JOIN "espacios_enseñanza" est ON est.id = eit.espacio_id AND est.area = 'vinculacion' AND est.profesor_id = ${supervisorFiltro}::int
            WHERE aiv.asistencia_id = ae.id)
        )
        AND (${periodoId}::text IS NULL OR ae.fecha BETWEEN
             (SELECT fecha_inicio FROM ciclos_academicos WHERE id = ${periodoId}::int)
             AND (SELECT fecha_fin FROM ciclos_academicos WHERE id = ${periodoId}::int))
        AND (${estado}::text IS NULL OR ${estado} = 'todos' OR ae.estado_aprobacion = ${estado})
        AND (${espacioId}::text IS NULL OR ae.espacio_id = ${espacioId}::int)
        AND (
          ${instructorId}::text IS NULL
          OR ae.registrado_por = ${instructorId}::int
          OR EXISTS (SELECT 1 FROM asistencia_instructores aif WHERE aif.asistencia_id = ae.id AND aif.usuario_id = ${instructorId}::int)
        )
      ORDER BY
        (ae.estado_aprobacion = 'pendiente') DESC,
        CASE WHEN ${orden} = 'beneficiarios' THEN (SELECT COUNT(*) FROM asistencia_beneficiarios ab WHERE ab.asistencia_id = ae.id) END DESC,
        CASE WHEN ${orden} = 'espacio' THEN e.nombre END ASC,
        CASE WHEN ${orden} = 'estudiante' THEN u.nombres END ASC,
        ae.fecha DESC, ae.creado_en DESC
    `;

    // Listas para los filtros: si es superadmin/líder ve todos los de vinculación, si no solo los propios
    const espacios = esLider
      ? await sql`SELECT id, nombre FROM "espacios_enseñanza" WHERE area = 'vinculacion' ORDER BY nombre`
      : await sql`SELECT id, nombre FROM "espacios_enseñanza" WHERE area = 'vinculacion' AND profesor_id = ${usuarioIdNum} ORDER BY nombre`;

    const instructores = esLider
      ? await sql`
          SELECT DISTINCT u.id, u.nombres, u.apellidos
          FROM usuarios u
          JOIN espacio_instructores ei ON ei.usuario_id = u.id
          JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
          WHERE e.area = 'vinculacion'
          ORDER BY u.nombres
        `
      : await sql`
          SELECT DISTINCT u.id, u.nombres, u.apellidos
          FROM usuarios u
          JOIN espacio_instructores ei ON ei.usuario_id = u.id
          JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
          WHERE e.area = 'vinculacion' AND e.profesor_id = ${usuarioIdNum}
          ORDER BY u.nombres
        `;

    const supervisores = esLider ? await listarSupervisores(sql) : [];
    const periodos = await listarPeriodos(sql);

    return NextResponse.json({ success: true, data: registros, espacios, instructores, esLider, supervisores, periodos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

