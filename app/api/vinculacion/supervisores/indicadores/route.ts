import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { esSuperAdminOLider } from '@/lib/permisos-supervision';

export async function GET() {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const esLider = esSuperAdminOLider(usuario);
    const usuarioIdNum = Number(usuario.id);

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });

    // 1. Desglose analítico por Pasante / Estudiante Supervisado
    const pasantesAnalitica = await sql`
      SELECT
        u.id AS pasante_id,
        u.nombres,
        u.apellidos,
        u.email,
        COALESCE(e.nombre, 'Sin Espacio') AS espacio_nombre,
        COALESCE(e.id, 0) AS espacio_id,
        COALESCE(asist.horas_aprobadas, 0)::float AS horas_asistencia,
        COALESCE(asist_pend.sesiones_pendientes, 0)::int AS asistencias_pendientes,
        COALESCE(pod.horas_podcast, 0)::float AS horas_podcast,
        COALESCE(inv.horas_investigacion, 0)::float AS horas_investigacion,
        (COALESCE(asist.horas_aprobadas, 0) + COALESCE(pod.horas_podcast, 0) + COALESCE(inv.horas_investigacion, 0))::float AS horas_totales,
        COALESCE(ben.total_beneficiarios, 0)::int AS beneficiarios_a_cargo,
        COALESCE(tests.pre_count, 0)::int AS pre_tests_count,
        COALESCE(tests.post_count, 0)::int AS post_tests_count,
        enc.promedio_estrellas AS promedio_satisfaccion,
        COALESCE(enc.respuestas, 0)::int AS evaluaciones_recibidas,
        COALESCE(enc.por_panel_pasante, 0)::int AS evaluaciones_por_panel_pasante,
        gan.ganancia_mcer AS ganancia_mcer_espacio,
        COALESCE(gan.beneficiarios_con_ganancia, 0)::int AS beneficiarios_con_ganancia
      FROM usuarios u
      LEFT JOIN espacio_instructores ei ON ei.usuario_id = u.id
      LEFT JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id AND e.area = 'vinculacion'
      LEFT JOIN (
        SELECT
          usuario_id,
          COALESCE(SUM(horas), 0)::float AS horas_aprobadas
        FROM horas_asistencia_instructor
        GROUP BY usuario_id
      ) asist ON asist.usuario_id = u.id
      LEFT JOIN (
        SELECT
          ae.registrado_por,
          COUNT(*)::int AS sesiones_pendientes
        FROM asistencia_espacio ae
        WHERE ae.estado_aprobacion = 'pendiente'
        GROUP BY ae.registrado_por
      ) asist_pend ON asist_pend.registrado_por = u.id
      LEFT JOIN (
        SELECT
          usuario_id,
          COALESCE(SUM(horas_total), 0)::float AS horas_podcast
        FROM horas_podcast_pasante
        WHERE estado_aprobacion = 'aprobado'
        GROUP BY usuario_id
      ) pod ON pod.usuario_id = u.id
      LEFT JOIN (
        SELECT
          usuario_id,
          COALESCE(SUM(horas), 0)::float AS horas_investigacion
        FROM actividades_investigacion_pasante
        WHERE estado_aprobacion = 'aprobado'
        GROUP BY usuario_id
      ) inv ON inv.usuario_id = u.id
      LEFT JOIN (
        SELECT
          ie.espacio_id,
          COUNT(DISTINCT ie.beneficiario_id)::int AS total_beneficiarios
        FROM inscripciones_espacio ie
        GROUP BY ie.espacio_id
      ) ben ON ben.espacio_id = e.id
      LEFT JOIN (
        SELECT
          estudiante_evaluador_id,
          COUNT(*) FILTER (WHERE tipo = 'inicial')::int AS pre_count,
          COUNT(*) FILTER (WHERE tipo = 'final')::int AS post_count
        FROM evaluaciones_mcer
        GROUP BY estudiante_evaluador_id
      ) tests ON tests.estudiante_evaluador_id = u.id
      LEFT JOIN (
        SELECT
          ev.instructor_id,
          ROUND(AVG(ev.calificacion)::numeric, 2)::float AS promedio_estrellas,
          COUNT(*)::int AS respuestas,
          COUNT(*) FILTER (WHERE es.origen = 'panel_pasante')::int AS por_panel_pasante
        FROM encuesta_evaluaciones_instructor ev
        JOIN encuestas_satisfaccion es ON es.id = ev.encuesta_id
        WHERE ev.no_aplica = false
        GROUP BY ev.instructor_id
      ) enc ON enc.instructor_id = u.id
      LEFT JOIN (
        SELECT
          ie.espacio_id,
          ROUND(AVG(post.nota - pre.nota)::numeric, 1)::float AS ganancia_mcer,
          COUNT(DISTINCT ie.beneficiario_id)::int AS beneficiarios_con_ganancia
        FROM inscripciones_espacio ie
        JOIN evaluaciones_mcer pre ON pre.beneficiario_id = ie.beneficiario_id AND pre.tipo = 'inicial'
        JOIN evaluaciones_mcer post ON post.beneficiario_id = ie.beneficiario_id AND post.tipo = 'final'
        GROUP BY ie.espacio_id
      ) gan ON gan.espacio_id = e.id
      WHERE u.rol = 'estudiante'
        AND (${esLider}::boolean IS TRUE
             -- Mis supervisados (titular en un espacio mío), en el espacio donde estén; los de apoyo en mis
             -- espacios no son míos y no aparecen.
             OR EXISTS (
               SELECT 1 FROM espacio_instructores eit
               JOIN "espacios_enseñanza" est ON est.id = eit.espacio_id AND est.area = 'vinculacion'
               WHERE eit.usuario_id = u.id AND eit.tipo = 'titular' AND est.profesor_id = ${usuarioIdNum}))
      ORDER BY u.apellidos ASC, u.nombres ASC
    `;

    // 2. Matriz de Ganancia MCER (Pre-Test vs Post-Test)
    const mcerImpacto = await sql`
      SELECT
        COALESCE(e_pre.subnivel_actual, 'Sin Nivel') AS nivel_inicial,
        COALESCE(e_post.subnivel_actual, 'Sin Nivel') AS nivel_final,
        COUNT(*)::int AS total_beneficiarios,
        ROUND(AVG(e_pre.nota)::numeric, 1)::float AS nota_pre_promedio,
        ROUND(AVG(e_post.nota)::numeric, 1)::float AS nota_post_promedio,
        ROUND(AVG(e_post.nota - e_pre.nota)::numeric, 1)::float AS ganancia_promedio
      FROM evaluaciones_mcer e_pre
      JOIN evaluaciones_mcer e_post ON e_pre.beneficiario_id = e_post.beneficiario_id
      WHERE e_pre.tipo = 'inicial' AND e_post.tipo = 'final'
      GROUP BY e_pre.subnivel_actual, e_post.subnivel_actual
    `;

    // 3. Totales globales MCER
    const [mcerGlobal] = await sql`
      SELECT
        COUNT(DISTINCT beneficiario_id)::int AS total_evaluados,
        COUNT(*) FILTER (WHERE tipo = 'inicial')::int AS total_pre,
        COUNT(*) FILTER (WHERE tipo = 'final')::int AS total_post,
        COALESCE(ROUND(AVG(nota) FILTER (WHERE tipo = 'inicial')::numeric, 1), 0)::float AS prom_pre,
        COALESCE(ROUND(AVG(nota) FILTER (WHERE tipo = 'final')::numeric, 1), 0)::float AS prom_post
      FROM evaluaciones_mcer
    `;

    // 4. Alertas de asistencias urgentes
    const asistenciasUrgentes = await sql`
      SELECT
        ae.id,
        ae.fecha,
        e.nombre AS espacio_nombre,
        u.nombres AS registrador_nombres,
        u.apellidos AS registrador_apellidos
      FROM asistencia_espacio ae
      JOIN "espacios_enseñanza" e ON e.id = ae.espacio_id
      JOIN usuarios u ON u.id = ae.registrado_por
      WHERE ae.estado_aprobacion = 'pendiente'
        AND (${esLider}::boolean IS TRUE OR e.profesor_id = ${usuarioIdNum})
      ORDER BY ae.fecha ASC
      LIMIT 10
    `;

    // 5. Encuestas agregadas (sin 5.0 inventado cuando aun no hay respuestas)
    const [encuestasConsolidado] = await sql`
      SELECT
        COUNT(*)::int AS total_encuestas,
        ROUND(AVG(nivel_satisfaccion)::numeric, 2)::float AS satisfaccion_general,
        ROUND(AVG(aprendizaje)::numeric, 2)::float AS percepcion_aprendizaje,
        ROUND(AVG(recursos)::numeric, 2)::float AS recomienda_curso,
        COUNT(impacto_estudios)::int AS con_impacto,
        ROUND(AVG(impacto_estudios)::numeric, 2)::float AS impacto_estudios,
        ROUND(AVG(uso_aprendido)::numeric, 2)::float AS uso_aprendido,
        ROUND(AVG(seguridad_hablar)::numeric, 2)::float AS seguridad_hablar,
        ROUND(AVG(oportunidades)::numeric, 2)::float AS oportunidades,
        COUNT(recomendaria)::int AS con_recomendacion,
        ROUND(100.0 * (COUNT(*) FILTER (WHERE recomendaria >= 9) - COUNT(*) FILTER (WHERE recomendaria <= 6))
              / NULLIF(COUNT(recomendaria), 0))::int AS nps
      FROM encuestas_satisfaccion
    `;

    // 6. Recomendaciones anonimas (sin identificar al beneficiario) para los pasantes de este supervisor
    const observacionesPasantes = await sql`
      SELECT
        ev.instructor_id AS pasante_id,
        ev.observacion,
        ev.calificacion,
        es.origen,
        es.fecha
      FROM encuesta_evaluaciones_instructor ev
      JOIN encuestas_satisfaccion es ON es.id = ev.encuesta_id
      WHERE ev.no_aplica = false AND ev.observacion IS NOT NULL AND ev.observacion <> ''
        AND (${esLider}::boolean IS TRUE OR EXISTS (
          SELECT 1 FROM espacio_instructores ei JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
          WHERE ei.usuario_id = ev.instructor_id AND ei.tipo = 'titular' AND e.area = 'vinculacion' AND e.profesor_id = ${usuarioIdNum}))
      ORDER BY es.fecha DESC
      LIMIT 100
    `;

    // 7. Encuestas que un pasante lleno desde su cuenta en los ultimos 14 dias (no el beneficiario por QR)
    const [encuestasPorPasante] = await sql`
      SELECT COUNT(*)::int AS total
      FROM encuestas_satisfaccion enc
      JOIN "espacios_enseñanza" e ON e.id = enc.espacio_id
      WHERE enc.origen = 'panel_pasante' AND enc.fecha >= NOW() - INTERVAL '14 days'
        AND (${esLider}::boolean IS TRUE OR e.profesor_id = ${usuarioIdNum})
    `;

    return NextResponse.json({
      success: true,
      esLider,
      pasantesAnalitica,
      mcerImpacto,
      mcerGlobal: mcerGlobal || { total_evaluados: 0, total_pre: 0, total_post: 0, prom_pre: 0, prom_post: 0 },
      asistenciasUrgentes,
      encuestasConsolidado,
      observacionesPasantes,
      encuestasPorPasante14Dias: encuestasPorPasante?.total ?? 0,
      metaHorasLegal: 96
    });
  } catch (error: any) {
    console.error('API Indicadores error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

