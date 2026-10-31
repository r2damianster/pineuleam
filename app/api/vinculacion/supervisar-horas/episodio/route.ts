import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeSupervisarVinculacion } from '@/lib/modulos';
import { esSuperAdminOLider } from '@/lib/permisos-supervision';
import { registrarHorasPodcast } from '@/lib/horasPodcast';
import { logSuperadminAction } from '@/lib/superadmin-auth';

// Editor de episodios de podcast para el supervisor (Sesión 50): agregar/quitar participantes,
// invitados y audiencia de un episodio — también de uno ya subido — y recalcular las horas.
// Las horas ya APROBADAS no se tocan (ni se recalculan ni se borran); solo pendientes/rechazadas.

// GET: episodios recientes + pasantes que este supervisor puede asignar.
export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeSupervisarVinculacion(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const esLider = esSuperAdminOLider(usuario);
    const supervisorId = Number(usuario.id);
    const videoIdParam = new URL(request.url).searchParams.get('video_id');

    const episodios = await sql`
      SELECT v.id, v.title AS titulo, v.youtube_url,
             COALESCE(v.participantes_estudiantes, '{}') AS participantes,
             COALESCE(v.invitados_internos, '{}') AS invitados_internos,
             COALESCE(v.invitados_externos, '{}') AS invitados_externos,
             COALESCE(v.audiencia_alcanzada, 0) AS audiencia
      FROM videos v
      WHERE (${videoIdParam}::text IS NULL OR v.id = ${videoIdParam})
      ORDER BY v.id DESC
      LIMIT ${videoIdParam ? 1 : 60}
    `;

    // Pasantes asignables: los que superviso oficialmente (titulares de mis espacios; los de apoyo
    // son de otro supervisor). El líder/superadmin, todos los de Vinculación.
    const pasantes = await sql`
      SELECT DISTINCT u.id, u.nombres, u.apellidos
      FROM usuarios u
      JOIN espacio_instructores ei ON ei.usuario_id = u.id
      JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
      WHERE u.rol = 'estudiante' AND e.area = 'vinculacion'
        AND (${esLider}::boolean IS TRUE OR (ei.tipo = 'titular' AND e.profesor_id = ${supervisorId}))
      ORDER BY u.nombres, u.apellidos
    `;

    return NextResponse.json({ success: true, episodios, pasantes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT { video_id, participantes: number[], invitados_internos: string[], invitados_externos: string[], audiencia: number }
export async function PUT(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeSupervisarVinculacion(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const videoId: string = body.video_id;
    const participantes: number[] = Array.from(new Set((Array.isArray(body.participantes) ? body.participantes : []).map(Number).filter(Number.isInteger)));
    const limpiarLista = (lista: any): string[] => (Array.isArray(lista) ? lista.map((x: any) => String(x).trim()).filter(Boolean) : []);
    const invitadosInternos = limpiarLista(body.invitados_internos);
    const invitadosExternos = limpiarLista(body.invitados_externos);
    const audiencia = Math.max(0, Math.floor(Number(body.audiencia) || 0));

    if (!videoId) return NextResponse.json({ error: 'video_id es obligatorio' }, { status: 400 });

    const sql = neon(process.env.DATABASE_URL!);
    const [video] = await sql`SELECT id, participantes_estudiantes FROM videos WHERE id = ${videoId}`;
    if (!video) return NextResponse.json({ error: 'Episodio no encontrado' }, { status: 404 });

    const esLider = esSuperAdminOLider(usuario);
    const supervisorId = Number(usuario.id);

    // Cada pasante asignado (o retirado) debe ser un pasante de Vinculación que este supervisor supervisa
    // como titular (el dueño de un espacio donde solo hay pasantes de apoyo no es su supervisor).
    const previos: number[] = (video.participantes_estudiantes || []).map(Number);
    const involucrados = Array.from(new Set([...participantes, ...previos]));
    if (involucrados.length > 0) {
      const validos = await sql`
        SELECT DISTINCT u.id FROM usuarios u
        JOIN espacio_instructores ei ON ei.usuario_id = u.id
        JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
        WHERE u.id = ANY(${involucrados}) AND u.rol = 'estudiante' AND e.area = 'vinculacion'
          AND (${esLider}::boolean IS TRUE OR (ei.tipo = 'titular' AND e.profesor_id = ${supervisorId}))
      `;
      const idsValidos = new Set(validos.map((fila: any) => Number(fila.id)));
      const noPermitidos = participantes.filter(id => !idsValidos.has(id));
      if (noPermitidos.length > 0) {
        return NextResponse.json({ error: 'Solo puedes asignar pasantes de tus espacios de Vinculación.' }, { status: 403 });
      }
    }

    await sql`
      UPDATE videos
      SET participantes_estudiantes = ${participantes}, invitados_internos = ${invitadosInternos},
          invitados_externos = ${invitadosExternos}, audiencia_alcanzada = ${audiencia}, updated = now()
      WHERE id = ${videoId}
    `;

    // Quitar filas de participantes retirados (solo si no están aprobadas: lo aprobado no se toca).
    await sql`
      DELETE FROM horas_podcast_pasante
      WHERE video_id = ${videoId} AND estado_aprobacion <> 'aprobado' AND NOT (usuario_id = ANY(${participantes}))
    `;

    // Alta/recalculo de horas (registrarHorasPodcast no modifica filas ya aprobadas).
    await registrarHorasPodcast(sql, {
      videoId,
      participantesEstudiantes: participantes,
      invitadosInternos,
      invitadosExternos,
      audienciaAlcanzada: audiencia,
    });

    await logSuperadminAction({
      actor: usuario,
      tipo_accion: 'crud_update',
      tabla_afectada: 'horas_podcast_pasante',
      detalle: `Episodio ${videoId}: participantes [${participantes.join(', ')}], invitados int/ext ${invitadosInternos.length}/${invitadosExternos.length}, audiencia ${audiencia}`,
      resultado: 'ok',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
