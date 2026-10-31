// app/api/rollup/fotos/route.ts
// Fotos para el carrete del roll up. Solo fotos publicables: sin menores, no descartadas, calidad no mala,
// y con la misma regla de origen aprobado que el banco de fotos.
//   ?proyecto=<id>            → fotos de ese proyecto
//   (sin proyecto)            → todo el banco de la carrera
//   ?azar=N                   → N fotos al azar (carga inicial del carrete)
//   ?q=texto&page=N&pageSize  → búsqueda paginada

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { esDocente } from '@/lib/modulos';
import { imagenCloudinary, miniaturaCloudinary } from '@/lib/cloudinaryUrl';

export const dynamic = 'force-dynamic';

const PAGE_SIZE_MAX = 60;

export async function GET(request: Request) {
  try {
    const sesion = await getAppSessionFromCookies();
    if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!esDocente(sesion)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const proyecto = (searchParams.get('proyecto') ?? '').trim().slice(0, 100);
    const textoBusqueda = (searchParams.get('q') ?? '').trim().slice(0, 200);
    const azarRaw = parseInt(searchParams.get('azar') ?? '0', 10);
    const paginaRaw = parseInt(searchParams.get('page') ?? '1', 10);
    const tamanoRaw = parseInt(searchParams.get('pageSize') ?? '24', 10);
    const azar = Number.isNaN(azarRaw) ? 0 : Math.min(12, Math.max(0, azarRaw));
    const pagina = Math.max(1, Number.isNaN(paginaRaw) ? 1 : paginaRaw);
    const tamano = Math.min(PAGE_SIZE_MAX, Math.max(1, Number.isNaN(tamanoRaw) ? 24 : tamanoRaw));
    const desplazamiento = (pagina - 1) * tamano;

    const sql = neon(process.env.DATABASE_URL!);

    const filtroProyecto = proyecto ? sql`AND ${proyecto} = ANY(proyectos)` : sql``;
    const filtroTexto = textoBusqueda
      ? sql`AND (titulo ILIKE ${`%${textoBusqueda}%`} OR descripcion ILIKE ${`%${textoBusqueda}%`})`
      : sql``;

    const condiciones = sql`
      activo = true AND descartada = false AND visibilidad = 'publicable' AND menores = 'no' AND calidad <> 'mala'
      AND (
        origen IN ('admin', 'lider', 'evidencia_evento')
        OR (origen IN ('evento', 'podcast') AND EXISTS (
          SELECT 1 FROM actividades_difusion a WHERE a.id::text = fotos.fuente_id AND a.aprobado_sitio = true))
        OR (origen = 'asistencia' AND EXISTS (
          SELECT 1 FROM asistencia_espacio s WHERE s.id::text = fotos.fuente_id AND s.estado_aprobacion = 'aprobado'))
      )
      ${filtroProyecto}
      ${filtroTexto}
    `;

    const mapear = (fila: any) => ({
      id: fila.id,
      titulo: fila.titulo ?? '',
      proyectos: fila.proyectos ?? [],
      thumb: miniaturaCloudinary(fila.url, 420),
      url: imagenCloudinary(fila.url, 1800),
    });

    if (azar > 0) {
      const filas = await sql`SELECT id, url, titulo, proyectos FROM fotos WHERE ${condiciones} ORDER BY random() LIMIT ${azar}`;
      return NextResponse.json({ items: filas.map(mapear), total: filas.length, page: 1, pageSize: azar });
    }

    const [{ count: total }] = await sql`SELECT count(*)::int AS count FROM fotos WHERE ${condiciones}`;
    const filas = await sql`
      SELECT id, url, titulo, proyectos FROM fotos
      WHERE ${condiciones}
      ORDER BY COALESCE(fecha_evento, created::date) DESC, id DESC
      LIMIT ${tamano} OFFSET ${desplazamiento}
    `;
    return NextResponse.json({ items: filas.map(mapear), total, page: pagina, pageSize: tamano });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
