import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireInvestigacionApi } from "../../../_lib/auth";
import { renderizarPlantilla } from "../../../../utilidades/_lib/docxtemplater";
import { respuestaDocx } from "../../../../utilidades/_lib/respuestaArchivo";

export const runtime = "nodejs";

const CARRERA = "Pedagogía de los Idiomas Nacionales y Extranjeros";

interface ActividadSel {
  id: number;
  titulo: string;
  fecha: string;
  descripcion?: string | null;
}
interface PublicacionSel {
  id: string;
  title: string;
  authors: string;
  category: string;
}
interface PodcastSel {
  id: string;
  title: string;
  category: string;
}
interface Dificultad {
  inconveniente: string;
  solucion: string;
}

interface DescargarBody {
  periodo: { desde: string; hasta: string; etiqueta: string };
  actividades: ActividadSel[];
  publicaciones: PublicacionSel[];
  podcasts: PodcastSel[];
  resumenEjecutivo: string;
  planSiguiente: string;
  dificultades: Dificultad[];
}

export async function POST(request: NextRequest) {
  const usuario = await requireInvestigacionApi();
  if (!usuario) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body: DescargarBody = await request.json();
  const actividades = body.actividades ?? [];
  const publicaciones = body.publicaciones ?? [];
  const podcasts = body.podcasts ?? [];
  const dificultades = body.dificultades ?? [];

  const funciones: string[] = [
    ...actividades.map(
      (a) => `${a.titulo} (${a.fecha})${a.descripcion ? `: ${a.descripcion}` : ""}`
    ),
    ...publicaciones.map(
      (p) => `Contribución académica registrada: "${p.title}" — ${p.authors} (${p.category})`
    ),
    ...podcasts.map((v) => `Episodio de podcast publicado: "${v.title}" (${v.category})`),
  ];

  const resultadosAvances =
    `${publicaciones.length} publicaciones científicas, ${podcasts.length} episodios de podcast y ` +
    `${actividades.length} actividades registradas durante el período ${body.periodo.etiqueta}.`;

  const buffer = renderizarPlantilla("informe-investigacion-mensual.docx", {
    CARRERA,
    LIDER: usuario.nombres,
    PERIODO: body.periodo.etiqueta,
    RESUMEN_EJECUTIVO: body.resumenEjecutivo || "Sin resumen ejecutivo proporcionado.",
    FUNCIONES: funciones.length > 0 ? funciones : ["No se registraron actividades, publicaciones ni podcasts en este período."],
    RESULTADOS_AVANCES: resultadosAvances,
    DIFICULTADES: dificultades
      .filter((d) => d.inconveniente?.trim())
      .map((d) => ({ INCONVENIENTE: d.inconveniente, SOLUCION: d.solucion || "—" })),
    PLAN_SIGUIENTE: body.planSiguiente || "Sin plan definido para el siguiente período.",
  });

  const sql = neon(process.env.DATABASE_URL!);
  await sql`
    INSERT INTO informes_mensuales_generados
      (usuario_id, periodo_desde, periodo_hasta, actividades_ids, publicaciones_ids, podcasts_ids)
    VALUES (
      ${Number(usuario.id)}, ${body.periodo.desde}, ${body.periodo.hasta},
      ${actividades.map((a) => a.id)}, ${publicaciones.map((p) => p.id)}, ${podcasts.map((v) => v.id)}
    )
  `;

  return respuestaDocx(buffer, `Informe_Mensual_${body.periodo.desde}_a_${body.periodo.hasta}.docx`);
}
