import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireInvestigacionApi } from "../../../_lib/auth";

import { calcularAvanceMetas } from "@/lib/investigacionAportes";

export const runtime = "nodejs";

// Las filas de otras fuentes se mezclan con id negativo; cada fuente usa su propio rango para no chocar
// entre sí (pasantes de Vinculación: -id; aportes: -(1.000.000 + id); avance de metas: -(2.000.000 + ...)).
const AJUSTE_ID_APORTE = 1_000_000;
const AJUSTE_ID_AVANCE_METAS = 2_000_000;

export async function GET(request: NextRequest) {
  const usuario = await requireInvestigacionApi();
  if (!usuario) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  if (!desde || !hasta) {
    return NextResponse.json({ error: "Faltan parámetros desde/hasta" }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const usuarioId = Number(usuario.id);

  const [actividadesDifusion, publicacionesSitio, podcasts, actividadesPasantes, aportesValidados, contribucionesAcademicas, ciclosDelPeriodo, proyectosDelDocente] = await Promise.all([
    sql`
      SELECT id, titulo, tipo, categoria, fecha, descripcion
      FROM actividades_difusion
      WHERE fecha BETWEEN ${desde} AND ${hasta}
        AND ${usuarioId} = ANY(profesores_responsables)
      ORDER BY fecha
    `,
    sql`
      SELECT id, title, authors, type, category, publication_date, doi_link, created
      FROM publications
      WHERE created >= ${desde}::date AND created < (${hasta}::date + INTERVAL '1 day')
      ORDER BY created
    `,
    sql`
      SELECT id, title, description, category, tags, published_date, created
      FROM videos
      WHERE created >= ${desde}::date AND created < (${hasta}::date + INTERVAL '1 day')
      ORDER BY created
    `,
    // Actividades de investigación de pasantes de Vinculación, aprobadas por su supervisor,
    // que aportan a un proyecto donde este docente es miembro activo.
    sql`
      SELECT a.id, a.fecha, a.descripcion, a.horas::float AS horas, u.nombres, u.apellidos,
             COALESCE(py.nombre_oficial, 'Proyecto sin asignar') AS proyecto_nombre
      FROM actividades_investigacion_pasante a
      JOIN usuarios u ON u.id = a.usuario_id
      LEFT JOIN proyectos py ON py.id = a.proyecto_id
      WHERE a.estado_aprobacion = 'aprobado' AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date
        AND a.proyecto_id IN (SELECT pm.proyecto_id FROM proyecto_miembros pm WHERE pm.usuario_id = ${usuarioId} AND pm.activo)
      ORDER BY a.fecha, a.id
    `,
    // Aportes de Investigación (docentes, colaboradores y estudiantes de apoyo) ya VALIDADOS por el líder, en
    // proyectos donde este docente es miembro activo. Los que nacieron de un evento/podcast del que este
    // docente ya es responsable se omiten: salen en la lista de difusión y no deben contarse dos veces.
    sql`
      SELECT x.id, x.fecha, x.tipo, x.descripcion, x.horas::float AS horas, u.nombres, u.apellidos,
             py.nombre_oficial AS proyecto_nombre, pl.actividad AS meta
      FROM investigacion_aportes x
      JOIN usuarios u ON u.id = x.usuario_id
      JOIN proyectos py ON py.id = x.proyecto_id
      LEFT JOIN proyecto_actividades_plan pl ON pl.id = x.actividad_plan_id
      LEFT JOIN actividades_difusion ad ON ad.id = x.actividad_difusion_id
      WHERE x.estado_validacion = 'validado' AND x.fecha BETWEEN ${desde}::date AND ${hasta}::date
        AND x.proyecto_id IN (SELECT pm.proyecto_id FROM proyecto_miembros pm WHERE pm.usuario_id = ${usuarioId} AND pm.activo)
        AND (x.actividad_difusion_id IS NULL OR NOT (${usuarioId} = ANY(COALESCE(ad.profesores_responsables, '{}'))))
      ORDER BY x.fecha, x.id
    `,
    // Contribuciones académicas (artículos, libros, capítulos, ponencias/memorias, propiedad intelectual)
    // aprobadas, publicadas en el período, donde este docente es autor o que pertenecen a un proyecto suyo.
    sql`
      SELECT c.id, c."titulo", c."tipoPublicacion"::text AS tipo, c."fechaPublicacion", c."linkPublicacion",
             c."nombreEvento", c."nombreRevista", c."tituloLibro",
             COALESCE((
               SELECT string_agg(ca."authorName", ', ' ORDER BY ca."order")
               FROM "ContributionAuthor" ca WHERE ca."contributionId" = c.id
             ), '') AS autores
      FROM "Contribution" c
      WHERE c."aprobada" = true
        AND c."fechaPublicacion" >= ${desde}::date AND c."fechaPublicacion" < (${hasta}::date + INTERVAL '1 day')
        AND (
          EXISTS (SELECT 1 FROM "ContributionAuthor" ca WHERE ca."contributionId" = c.id AND ca."usuarioId" = ${usuarioId})
          OR c."proyectoId" IN (SELECT pm.proyecto_id::text FROM proyecto_miembros pm WHERE pm.usuario_id = ${usuarioId} AND pm.activo)
        )
      ORDER BY c."fechaPublicacion"
    `,
    sql`SELECT id FROM ciclos_academicos WHERE ${hasta}::date BETWEEN fecha_inicio AND fecha_fin LIMIT 1`,
    sql`
      SELECT py.id, py.nombre_oficial
      FROM proyecto_miembros pm JOIN proyectos py ON py.id = pm.proyecto_id
      WHERE pm.usuario_id = ${usuarioId} AND pm.activo AND py.area = 'investigacion' AND py.activo = true
    `,
  ]);

  // Avance de metas (ciclo que contiene el fin del período) de cada proyecto de investigación del docente.
  // Entra como una actividad más para que se pueda marcar y viaje al documento sin tocar la plantilla.
  const cicloDelPeriodo: number | null = ciclosDelPeriodo[0]?.id ?? null;
  const avancesDeMetas = [];
  for (const proyecto of proyectosDelDocente) {
    const avance = await calcularAvanceMetas(sql, proyecto.id, cicloDelPeriodo);
    const lineasMetas = avance.actividades
      .filter((actividad) => actividad.meta !== null)
      .map((actividad) => `${actividad.actividad}: ${actividad.avance}/${actividad.meta} ${actividad.unidad || (actividad.mide === 'horas' ? 'horas' : 'aportes')} (${actividad.porcentaje}%)`);
    const { docentes, estudiantes } = avance.personas;
    if (docentes.meta) lineasMetas.push(`Docentes en el proyecto: ${docentes.actual}/${docentes.meta}`);
    if (estudiantes.meta) lineasMetas.push(`Estudiantes de apoyo: ${estudiantes.actual}/${estudiantes.meta}`);
    if (lineasMetas.length === 0) continue;
    avancesDeMetas.push({
      id: -(AJUSTE_ID_AVANCE_METAS + Number(avance.ciclo_id ?? 0) * 100 + avancesDeMetas.length),
      titulo: `Avance de metas — ${proyecto.nombre_oficial}`,
      tipo: 'avance_metas',
      categoria: 'investigacion',
      fecha: hasta,
      descripcion: lineasMetas.join('; '),
    });
  }

  // Se mezclan en la lista de actividades con id negativo (no choca con actividades_difusion.id)
  // para que el usuario las pueda marcar/desmarcar igual que el resto.
  const actividades = [
    ...actividadesDifusion,
    ...aportesValidados.map((aporte: any) => ({
      id: -(AJUSTE_ID_APORTE + aporte.id),
      titulo: `Aporte de investigación — ${aporte.nombres} ${aporte.apellidos} (${aporte.proyecto_nombre})`,
      tipo: 'aporte_investigacion',
      categoria: 'investigacion',
      fecha: aporte.fecha,
      descripcion: `${aporte.descripcion}${aporte.meta ? ` — Meta: ${aporte.meta}` : ''}${aporte.horas > 0 ? ` [${aporte.horas} h]` : ''}`,
    })),
    ...avancesDeMetas,
    ...actividadesPasantes.map((actividad: any) => ({
      id: -actividad.id,
      titulo: `Investigación estudiantil — ${actividad.nombres} ${actividad.apellidos} (${actividad.proyecto_nombre})`,
      tipo: 'investigacion_estudiantil',
      categoria: 'investigacion',
      fecha: actividad.fecha,
      descripcion: `${actividad.descripcion} [${actividad.horas} h]`,
    })),
  ];

  // Las contribuciones académicas viajan en la misma lista que las publicaciones del sitio (misma forma),
  // sin repetir las que ya salen por título.
  const titulosYaListados = new Set(publicacionesSitio.map((publicacion: any) => String(publicacion.title).trim().toLowerCase()));
  const contribuciones = contribucionesAcademicas
    .filter((contribucion: any) => !titulosYaListados.has(String(contribucion.titulo).trim().toLowerCase()))
    .map((contribucion: any) => {
      const detalleTipo =
        contribucion.tipo === 'MEMORIA_EVENTO' ? `Ponencia${contribucion.nombreEvento ? ` — ${contribucion.nombreEvento}` : ''}`
        : contribucion.tipo === 'CAPITULO_LIBRO' ? `Capítulo de libro${contribucion.tituloLibro ? ` — ${contribucion.tituloLibro}` : ''}`
        : contribucion.tipo === 'LIBRO' ? 'Libro'
        : contribucion.tipo === 'PROPIEDAD_INTELECTUAL' ? 'Propiedad intelectual'
        : `Artículo${contribucion.nombreRevista ? ` — ${contribucion.nombreRevista}` : ''}`;
      const fechaIso = new Date(contribucion.fechaPublicacion).toISOString();
      return {
        id: contribucion.id,
        title: contribucion.titulo,
        authors: contribucion.autores || 'Sin autores registrados',
        type: contribucion.tipo,
        category: detalleTipo,
        publication_date: fechaIso,
        doi_link: contribucion.linkPublicacion,
        created: fechaIso,
      };
    });

  const publicaciones = [...publicacionesSitio, ...contribuciones];

  return NextResponse.json({ actividades, publicaciones, podcasts });
}
