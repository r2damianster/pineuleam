import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { registrarHorasAsistencia } from '@/lib/horasAsistencia';
import { esSuperAdminOLider } from '@/lib/permisos-supervision';
import { puedeSupervisarVinculacion } from '@/lib/modulos';
import { publicarFotosDeFuente, retirarFotosDeFuente } from '@/lib/publicarFotoEnProyecto';


export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeSupervisarVinculacion(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { accion, motivo, hay_menores, calidad_mala } = await request.json();
    if (!['aprobar', 'rechazar'].includes(accion)) {
      return NextResponse.json({ error: 'accion debe ser aprobar o rechazar' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const id = parseInt(params.id, 10);

    const [asistenciaActual] = await sql`
      SELECT ae.id, e.profesor_id
      FROM asistencia_espacio ae
      JOIN "espacios_enseñanza" e ON e.id = ae.espacio_id
      WHERE ae.id = ${id}
    `;

    if (!asistenciaActual) {
      return NextResponse.json({ error: 'Registro de asistencia no encontrado' }, { status: 404 });
    }

    const esLider = esSuperAdminOLider(usuario);
    // Además del supervisor del espacio, puede moderar el supervisor titular de cualquier pasante que asistió.
    let esSupervisorTitularDeAsistente = false;
    if (!esLider && Number(asistenciaActual.profesor_id) !== Number(usuario.id)) {
      const [titular] = await sql`
        SELECT 1 FROM asistencia_instructores ai
        JOIN espacio_instructores ei ON ei.usuario_id = ai.usuario_id AND ei.tipo = 'titular'
        JOIN "espacios_enseñanza" est ON est.id = ei.espacio_id AND est.area = 'vinculacion' AND est.profesor_id = ${Number(usuario.id)}
        WHERE ai.asistencia_id = ${id}
        LIMIT 1
      `;
      esSupervisorTitularDeAsistente = !!titular;
    }
    if (!esLider && Number(asistenciaActual.profesor_id) !== Number(usuario.id) && !esSupervisorTitularDeAsistente) {
      return NextResponse.json(
        { error: 'No tienes permiso para aprobar o rechazar asistencias de este pasante o espacio.' },
        { status: 403 }
      );
    }

    if (accion === 'rechazar') {
      const [actualizado] = await sql`
        UPDATE asistencia_espacio
        SET estado_aprobacion = 'rechazado', aprobado_por = ${Number(usuario.id)}, fecha_aprobacion = now(), motivo_rechazo = ${motivo || null}
        WHERE id = ${id}
        RETURNING *
      `;
      if (!actualizado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      // Si venía de un aprobado previo, retira las horas ya acreditadas.
      await sql`DELETE FROM horas_asistencia_instructor WHERE asistencia_id = ${id}`;
      await retirarFotosDeFuente(sql, ['asistencia'], id);
      return NextResponse.json({ success: true, data: actualizado });
    }

    // Aprobar: las horas se calculan recién acá (hora_inicio/hora_fin ya
    // quedaron guardadas al registrar) — mismo patrón que horas_podcast_pasante.
    const [actualizado] = await sql`
      UPDATE asistencia_espacio
      SET estado_aprobacion = 'aprobado', aprobado_por = ${Number(usuario.id)}, fecha_aprobacion = now(), motivo_rechazo = NULL
      WHERE id = ${id}
      RETURNING *
    `;
    if (!actualizado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    let advertencias: string[] = [];
    if (actualizado.hora_inicio && actualizado.hora_fin) {
      advertencias = await registrarHorasAsistencia(sql, {
        asistenciaId: id,
        espacioId: actualizado.espacio_id,
        horaInicio: actualizado.hora_inicio,
        horaFin: actualizado.hora_fin,
      });
    }

    // Sesión 53 — confirmación de menores/calidad al aprobar (no bloquea las horas del pasante,
    // solo decide si la foto de evidencia se puede usar en la web y en los informes).
    if (hay_menores === true || calidad_mala === true) {
      await sql`
        UPDATE fotos SET
          menores = CASE WHEN ${hay_menores === true} THEN 'si' ELSE menores END,
          calidad = CASE WHEN ${calidad_mala === true} THEN 'mala' ELSE calidad END,
          visibilidad = CASE WHEN ${hay_menores === true} THEN 'interna' ELSE visibilidad END,
          activo = false, ubicaciones = '{}'::text[],
          calidad_revisada_por = ${Number(usuario.id)}, calidad_revisada_en = now(), updated = now()
        WHERE origen = 'asistencia' AND fuente_id = ${String(id)}
      `;
    } else {
      await sql`
        UPDATE fotos SET calidad = 'aceptable', calidad_revisada_por = ${Number(usuario.id)}, calidad_revisada_en = now(), updated = now()
        WHERE origen = 'asistencia' AND fuente_id = ${String(id)}
      `;
      // Aprobada sin menores ni mala calidad → se publica sola en la galería de cada proyecto de la foto.
      await publicarFotosDeFuente(sql, ['asistencia'], id);
    }

    return NextResponse.json({ success: true, data: actualizado, advertencias });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

