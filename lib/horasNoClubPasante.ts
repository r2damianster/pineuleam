// Horas aprobadas de un pasante FUERA de las sesiones de club (asistencia): podcast, investigación y
// actividades autónomas. Los informes de Vinculación muestran el total de horas del pasante, no una sola
// categoría, así que suman esto a las horas de club. Podcast se ubica por la fecha del episodio.

export interface HorasNoClub {
  /** Horas aprobadas dentro de la ventana [desde, hasta]. */
  horas: number;
  /** Registros aún pendientes de aprobar (sin filtrar por fecha, igual que antes para podcast). */
  pendientes: number;
}

export async function horasNoClubPorUsuario(
  sql: any,
  usuarioIds: number[],
  desde: string,
  hasta: string,
): Promise<Map<number, HorasNoClub>> {
  const resultado = new Map<number, HorasNoClub>();
  if (!usuarioIds.length) return resultado;

  const acumular = (filas: any[]) => {
    for (const fila of filas) {
      const actual = resultado.get(fila.usuario_id) || { horas: 0, pendientes: 0 };
      actual.horas += Number(fila.horas) || 0;
      actual.pendientes += Number(fila.pendientes) || 0;
      resultado.set(fila.usuario_id, actual);
    }
  };

  acumular(await sql`
    SELECT h.usuario_id,
           COALESCE(SUM(h.horas_total) FILTER (WHERE h.estado_aprobacion = 'aprobado'
             AND COALESCE(ad.fecha, v.published_date::date, h.fecha_aprobacion::date) BETWEEN ${desde}::date AND ${hasta}::date), 0)::float AS horas,
           COUNT(*) FILTER (WHERE h.estado_aprobacion = 'pendiente')::int AS pendientes
    FROM horas_podcast_pasante h
    JOIN videos v ON v.id = h.video_id
    LEFT JOIN actividades_difusion ad ON ad.id = v.actividad_difusion_id
    WHERE h.usuario_id = ANY(${usuarioIds})
    GROUP BY h.usuario_id
  `);
  acumular(await sql`
    SELECT usuario_id,
           COALESCE(SUM(horas) FILTER (WHERE estado_aprobacion = 'aprobado' AND fecha BETWEEN ${desde}::date AND ${hasta}::date), 0)::float AS horas,
           COUNT(*) FILTER (WHERE estado_aprobacion = 'pendiente')::int AS pendientes
    FROM actividades_investigacion_pasante
    WHERE usuario_id = ANY(${usuarioIds})
    GROUP BY usuario_id
  `);
  acumular(await sql`
    SELECT usuario_id,
           COALESCE(SUM(horas) FILTER (WHERE estado_aprobacion = 'aprobado' AND fecha BETWEEN ${desde}::date AND ${hasta}::date), 0)::float AS horas,
           COUNT(*) FILTER (WHERE estado_aprobacion = 'pendiente')::int AS pendientes
    FROM actividades_autonomas_pasante
    WHERE usuario_id = ANY(${usuarioIds})
    GROUP BY usuario_id
  `);

  resultado.forEach(total => { total.horas = Math.round(total.horas * 10) / 10; });
  return resultado;
}
