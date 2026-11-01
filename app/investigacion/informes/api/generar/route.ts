import { NextRequest, NextResponse } from "next/server";
import { requireInvestigacionApi } from "../../../_lib/auth";
import { enriquecerTexto } from "../../../../utilidades/_lib/enriquecerTexto";

export const runtime = "nodejs";

interface SeleccionItem {
  titulo: string;
  fecha: string;
  detalle?: string;
}

interface GenerarBody {
  periodo: { desde: string; hasta: string };
  actividades: SeleccionItem[];
  publicaciones: SeleccionItem[];
  podcasts: SeleccionItem[];
}

export async function POST(request: NextRequest) {
  const usuario = await requireInvestigacionApi();
  if (!usuario) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body: GenerarBody = await request.json();
  const publicaciones = body.publicaciones ?? [];
  const contarPublicaciones = (prefijo: string) =>
    publicaciones.filter((publicacion) => (publicacion.detalle ?? "").includes(`— ${prefijo}`)).length;
  // Cifras calculadas aquí para que la IA no cuente (se equivocaba al sumar) ni invente totales.
  const totales = {
    actividades: (body.actividades ?? []).length,
    contribuciones_y_publicaciones: publicaciones.length,
    ponencias: contarPublicaciones("Ponencia"),
    articulos: contarPublicaciones("Artículo"),
    episodios_podcast_adicionales: (body.podcasts ?? []).length,
  };
  const resumenDatos = JSON.stringify(
    {
      periodo: body.periodo,
      totales,
      actividades: body.actividades ?? [],
      publicaciones: body.publicaciones ?? [],
      podcasts: body.podcasts ?? [],
    },
    null,
    2
  );

  const [resumenEjecutivo, errorResumen] = await enriquecerTexto("informe_resumen_ejecutivo", resumenDatos);
  const [planSiguiente, errorPlan] = await enriquecerTexto("informe_plan_siguiente", resumenDatos);

  return NextResponse.json({
    resumenEjecutivo: resumenEjecutivo ?? "",
    errorResumen,
    planSiguiente: planSiguiente ?? "",
    errorPlan,
  });
}
