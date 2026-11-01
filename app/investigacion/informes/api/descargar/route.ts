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

  const formatearFecha = (fechaIso: string) => {
    const [anio, mes, dia] = String(fechaIso).slice(0, 10).split("-");
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : fechaIso;
  };
  // Muchas actividades guardan el título como descripción: no se repite el mismo texto dos veces.
  const descripcionUtil = (titulo: string, descripcion?: string | null) => {
    const texto = (descripcion ?? "").trim();
    if (!texto) return "";
    const normalizar = (valor: string) => valor.trim().toLowerCase().replace(/\s+/g, " ");
    return normalizar(texto) === normalizar(titulo) ? "" : texto;
  };

  // Actividades de investigación estudiantil con la misma fecha y descripción (ej. apoyo en un congreso,
  // asignado a varios pasantes) se resumen en una sola línea con todos los nombres.
  const PREFIJO_ESTUDIANTIL = "Investigación estudiantil — ";
  const extraerHoras = (descripcion: string) => descripcion.match(/\s*\[(\d+(?:[.,]\d+)?) h\]\s*$/);
  const lineasActividades: string[] = [];
  const gruposEstudiantiles = new Map<string, ActividadSel[]>();
  for (const actividad of actividades) {
    if (!actividad.titulo.startsWith(PREFIJO_ESTUDIANTIL)) continue;
    const clave = `${actividad.fecha}|${(actividad.descripcion ?? "").trim()}`;
    gruposEstudiantiles.set(clave, [...(gruposEstudiantiles.get(clave) ?? []), actividad]);
  }
  const gruposYaEscritos = new Set<string>();
  for (const actividad of actividades) {
    const clave = `${actividad.fecha}|${(actividad.descripcion ?? "").trim()}`;
    const grupo = actividad.titulo.startsWith(PREFIJO_ESTUDIANTIL) ? gruposEstudiantiles.get(clave) : undefined;
    if (grupo && grupo.length > 1) {
      if (gruposYaEscritos.has(clave)) continue;
      gruposYaEscritos.add(clave);
      const detalles = grupo.map((miembro) => {
        const resto = miembro.titulo.slice(PREFIJO_ESTUDIANTIL.length);
        const posicionProyecto = resto.lastIndexOf(" (");
        return {
          nombre: posicionProyecto >= 0 ? resto.slice(0, posicionProyecto) : resto,
          proyecto: posicionProyecto >= 0 ? resto.slice(posicionProyecto + 1) : "",
        };
      });
      const nombres = detalles.map((detalle) => detalle.nombre);
      const listaNombres = nombres.length > 1 ? `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}` : nombres[0];
      const descripcionBase = (actividad.descripcion ?? "").trim();
      const coincidenciaHoras = extraerHoras(descripcionBase);
      const textoSinHoras = coincidenciaHoras ? descripcionBase.replace(coincidenciaHoras[0], "") : descripcionBase;
      const sufijoHoras = coincidenciaHoras ? ` [${coincidenciaHoras[1]} h c/u]` : "";
      lineasActividades.push(
        `${PREFIJO_ESTUDIANTIL}${listaNombres} ${detalles[0].proyecto} (${formatearFecha(actividad.fecha)}): ${textoSinHoras}${sufijoHoras}`
      );
      continue;
    }
    const descripcion = descripcionUtil(actividad.titulo, actividad.descripcion);
    lineasActividades.push(`${actividad.titulo} (${formatearFecha(actividad.fecha)})${descripcion ? `: ${descripcion}` : ""}`);
  }

  // Ponencias del mismo evento se agrupan bajo un encabezado ("N ponencias en X") con la lista debajo.
  const PREFIJO_PONENCIA = "Ponencia — ";
  const ponenciasPorEvento = new Map<string, PublicacionSel[]>();
  const otrasPublicaciones: PublicacionSel[] = [];
  for (const publicacion of publicaciones) {
    if (publicacion.category.startsWith(PREFIJO_PONENCIA)) {
      const evento = publicacion.category.slice(PREFIJO_PONENCIA.length);
      ponenciasPorEvento.set(evento, [...(ponenciasPorEvento.get(evento) ?? []), publicacion]);
    } else {
      otrasPublicaciones.push(publicacion);
    }
  }
  const lineasPublicaciones: string[] = [];
  ponenciasPorEvento.forEach((ponencias, evento) => {
    if (ponencias.length === 1) {
      const unica = ponencias[0];
      lineasPublicaciones.push(`Contribución académica registrada: "${unica.title}" — ${unica.authors} (${unica.category})`);
      return;
    }
    lineasPublicaciones.push(`${ponencias.length} ponencias presentadas en ${evento}:`);
    ponencias.forEach((ponencia) => lineasPublicaciones.push(`– "${ponencia.title}" — ${ponencia.authors}`));
  });
  otrasPublicaciones.forEach((publicacion) =>
    lineasPublicaciones.push(`Contribución académica registrada: "${publicacion.title}" — ${publicacion.authors} (${publicacion.category})`)
  );

  const funciones: string[] = [
    ...lineasActividades,
    ...lineasPublicaciones,
    ...podcasts.map((v) => `Episodio de podcast publicado: "${v.title}" (${v.category})`),
  ];

  const resultadosAvances =
    `${publicaciones.length} contribuciones académicas y publicaciones, ${podcasts.length} episodios de podcast ` +
    `(además de los asociados a actividades de difusión) y ${actividades.length} actividades registradas ` +
    `durante el período ${body.periodo.etiqueta}.`;

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
