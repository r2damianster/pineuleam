import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDocenteApi } from "../../../_lib/auth";
import { buscarRevistas } from "../../../_lib/revistasRanking";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const esquemaBusqueda = z.object({
  titulo: z.string().trim().min(5, "El título es obligatorio (mínimo 5 caracteres).").max(500),
  resumen: z.string().max(8000).optional(),
  abstractIngles: z.string().max(8000).optional(),
  keywords: z.string().max(1000).optional(),
  referencias: z.string().max(40000).optional(),
  idioma: z.enum(["es", "en", "ambos"]).default("ambos"),
  cuartilMinimo: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  paises: z.array(z.string().max(80)).max(30).optional(),
  soloSelloFecyt: z.boolean().optional(),
  limite: z.number().int().min(10).max(300).default(100),
});

export async function POST(solicitud: Request) {
  if (!(await requireDocenteApi())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const cuerpo = await solicitud.json().catch(() => null);
  const validacion = esquemaBusqueda.safeParse(cuerpo);
  if (!validacion.success) {
    return NextResponse.json({ error: validacion.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  try {
    const { resultados, meta } = await buscarRevistas(validacion.data);
    return NextResponse.json({ resultados, meta });
  } catch (error) {
    console.error("[revistas/buscar]", error);
    return NextResponse.json({ error: "No se pudo completar la búsqueda de revistas." }, { status: 500 });
  }
}
