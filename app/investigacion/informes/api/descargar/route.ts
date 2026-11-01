import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireInvestigacionApi } from "../../../_lib/auth";
import { renderizarPlantilla } from "../../../../utilidades/_lib/docxtemplater";
import PizZip from "pizzip";
import { corrida, parrafo, celdaSimple, tabla, fila, dimensionesImagen, dibujoEnLinea, descargarFoto } from "../../../../vinculacion/informes/_lib/plantillaSupervisor";
import { respuestaDocx } from "../../../../utilidades/_lib/respuestaArchivo";

export const runtime = "nodejs";

const CARRERA = "Pedagogía de los Idiomas Nacionales y Extranjeros";

interface ActividadSel {
  id: number;
  titulo: string;
  tipo?: string;
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
interface FotoSel {
  url: string;
  pie: string;
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
  fotos?: FotoSel[];
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
  // Primera frase de la descripción (máx. ~220 caracteres): el informe resume, el detalle completo vive en el sitio.
  const resumirTexto = (titulo: string, descripcion?: string | null, maximo = 220) => {
    const texto = (descripcion ?? "").replace(/\s+/g, " ").trim();
    const normalizar = (valor: string) => valor.trim().toLowerCase().replace(/\s+/g, " ");
    if (!texto || normalizar(texto) === normalizar(titulo)) return "";
    const primeraFrase = texto.match(/^.{40,}?[.!?](?=\s|$)/)?.[0] ?? texto;
    return primeraFrase.length <= maximo ? primeraFrase : `${primeraFrase.slice(0, maximo).trimEnd()}…`;
  };

  const PREFIJO_ESTUDIANTIL = "Investigación estudiantil — ";
  const extraerHoras = (descripcion: string) => descripcion.match(/\s*\[(\d+(?:[.,]\d+)?) h\]\s*$/);

  const unir = (partes: string[]) => (partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}` : partes[0] ?? "");
  const lineasPodcast: string[] = [];
  const lineasEventos: string[] = [];
  const lineasEstudiantiles: string[] = [];

  // Investigación estudiantil con la misma fecha y descripción (ej. apoyo en un congreso asignado a varios
  // pasantes) se resume en una sola línea con todos los nombres.
  const gruposEstudiantiles = new Map<string, ActividadSel[]>();
  for (const actividad of actividades) {
    if (!actividad.titulo.startsWith(PREFIJO_ESTUDIANTIL)) continue;
    const clave = `${actividad.fecha}|${(actividad.descripcion ?? "").trim()}`;
    gruposEstudiantiles.set(clave, [...(gruposEstudiantiles.get(clave) ?? []), actividad]);
  }
  const gruposYaEscritos = new Set<string>();
  for (const actividad of actividades) {
    if (actividad.titulo.startsWith(PREFIJO_ESTUDIANTIL)) {
      const clave = `${actividad.fecha}|${(actividad.descripcion ?? "").trim()}`;
      if (gruposYaEscritos.has(clave)) continue;
      gruposYaEscritos.add(clave);
      const grupo = gruposEstudiantiles.get(clave) ?? [actividad];
      const nombres = grupo.map((miembro) => {
        const resto = miembro.titulo.slice(PREFIJO_ESTUDIANTIL.length);
        const posicionProyecto = resto.lastIndexOf(" (");
        return posicionProyecto >= 0 ? resto.slice(0, posicionProyecto) : resto;
      });
      const descripcionBase = (actividad.descripcion ?? "").trim();
      const coincidenciaHoras = extraerHoras(descripcionBase);
      const textoSinHoras = coincidenciaHoras ? descripcionBase.replace(coincidenciaHoras[0], "") : descripcionBase;
      const sufijoHoras = coincidenciaHoras ? ` [${coincidenciaHoras[1]} h${grupo.length > 1 ? " c/u" : ""}]` : "";
      lineasEstudiantiles.push(`${unir(nombres)} (${formatearFecha(actividad.fecha)}): ${textoSinHoras}${sufijoHoras}`);
      continue;
    }
    if (actividad.tipo === "podcast") {
      const audiencia = (actividad.descripcion ?? "").match(/audiencia de (\d+)/i)?.[1];
      lineasPodcast.push(`${actividad.titulo.trim()} (${formatearFecha(actividad.fecha)})${audiencia ? ` — audiencia: ${audiencia}` : ""}`);
      continue;
    }
    const resumen = resumirTexto(actividad.titulo, actividad.descripcion);
    lineasEventos.push(`${actividad.titulo.trim()} (${formatearFecha(actividad.fecha)})${resumen ? `: ${resumen}` : ""}`);
  }
  podcasts.forEach((episodio) => lineasPodcast.push(`${episodio.title.trim()}${episodio.category ? ` — ${episodio.category}` : ""}`));

  // Contribuciones: ponencias agrupadas por evento (una sección por evento), el resto en "Artículos y otras publicaciones".
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

  interface Seccion { TITULO: string; ITEMS: string[] }
  const secciones: Seccion[] = [];
  const agregarSeccion = (titulo: string, items: string[]) => {
    if (items.length > 0) secciones.push({ TITULO: `${titulo} (${items.length})`, ITEMS: items });
  };
  agregarSeccion("Conferencias, eventos y otras actividades", lineasEventos);
  agregarSeccion("Podcast", lineasPodcast);
  agregarSeccion("Investigación estudiantil (interacción Vinculación–Investigación)", lineasEstudiantiles);
  ponenciasPorEvento.forEach((ponencias, evento) =>
    agregarSeccion(
      `Ponencias — ${evento}`,
      ponencias.map((ponencia) => `"${ponencia.title}" — ${ponencia.authors}`)
    )
  );
  agregarSeccion(
    "Artículos y otras publicaciones",
    otrasPublicaciones.map((publicacion) => `"${publicacion.title}" — ${publicacion.authors} (${publicacion.category})`)
  );

  // Desglose de lo logrado por tipo, en vez de un total genérico.
  const plural = (cantidad: number, singular: string, pluralTexto: string) => `${cantidad} ${cantidad === 1 ? singular : pluralTexto}`;
  const contarCategoria = (prefijos: string[]) =>
    publicaciones.filter((p) => prefijos.some((prefijo) => p.category.startsWith(prefijo))).length;
  const nPonencias = contarCategoria(["Ponencia"]);
  const nArticulos = contarCategoria(["Artículo", "regional", "impacto"]);
  const nCapitulos = contarCategoria(["Capítulo"]);
  const nLibros = contarCategoria(["Libro", "libros"]);
  const nPropiedad = contarCategoria(["Propiedad intelectual"]);
  const nOtras = publicaciones.length - nPonencias - nArticulos - nCapitulos - nLibros - nPropiedad;
  const tiposContribucion = [
    nPonencias > 0 ? plural(nPonencias, "ponencia", "ponencias") : "",
    nArticulos > 0 ? plural(nArticulos, "artículo científico", "artículos científicos") : "",
    nLibros > 0 ? plural(nLibros, "libro", "libros") : "",
    nCapitulos > 0 ? plural(nCapitulos, "capítulo de libro", "capítulos de libro") : "",
    nPropiedad > 0 ? plural(nPropiedad, "registro de propiedad intelectual", "registros de propiedad intelectual") : "",
    nOtras > 0 ? plural(nOtras, "otra contribución", "otras contribuciones") : "",
  ].filter(Boolean);

  const nEstudiantiles = actividades.filter((a) => a.titulo.startsWith(PREFIJO_ESTUDIANTIL)).length;
  const nGenerales = actividades.length - nEstudiantiles;
  const nEpisodios = podcasts.length + actividades.filter((a) => a.tipo === "podcast").length;

  const logros: string[] = [];
  if (publicaciones.length > 0) {
    logros.push(`${plural(publicaciones.length, "contribución académica", "contribuciones académicas")} (${unir(tiposContribucion)})`);
  }
  if (nEpisodios > 0) logros.push(plural(nEpisodios, "episodio de podcast", "episodios de podcast"));
  if (nGenerales > 0) logros.push(`${plural(nGenerales, "actividad de difusión y gestión del proyecto", "actividades de difusión y gestión del proyecto")}`);
  if (nEstudiantiles > 0) {
    logros.push(
      `${plural(nEstudiantiles, "actividad realizada", "actividades realizadas")} en interacción entre Vinculación e Investigación (estudiantes de Vinculación en tareas de investigación)`
    );
  }
  const resultadosAvances = logros.length > 0
    ? `Durante el período ${body.periodo.etiqueta} se registraron: ${unir(logros)}.`
    : `No se registraron resultados durante el período ${body.periodo.etiqueta}.`;

  // Proyecto(s) de investigación del docente; si no tiene ninguno activo, el nombre oficial del proyecto del grupo.
  const NOMBRE_PROYECTO_POR_DEFECTO =
    "Lograr la innovación pedagógica e internacionalización del proceso de formación inicial y continua de docentes para el desarrollo humano y sostenible.";
  const sqlProyectos = neon(process.env.DATABASE_URL!);
  const proyectosDelDocente = await sqlProyectos`
    SELECT py.nombre_oficial
    FROM proyecto_miembros pm JOIN proyectos py ON py.id = pm.proyecto_id
    WHERE pm.usuario_id = ${Number(usuario.id)} AND pm.activo AND py.area = 'investigacion' AND py.activo = true
    ORDER BY py.nombre_oficial
  `;
  const nombreProyecto = proyectosDelDocente.map((proyecto: any) => proyecto.nombre_oficial).filter(Boolean).join("; ") || NOMBRE_PROYECTO_POR_DEFECTO;

  // Fotos de evidencia elegidas por el usuario: bloque OOXML (tabla de 2 columnas) + imágenes añadidas al .docx.
  const origen = new URL(request.url).origin;
  const fotosDescargadas = (
    await Promise.all(
      (body.fotos ?? []).slice(0, 6).map(async (foto) => ({
        foto,
        datos: await descargarFoto(foto.url.startsWith("/") ? `${origen}${foto.url}` : foto.url),
      }))
    )
  ).filter((elemento) => elemento.datos);
  const imagenesParaIncrustar: { relacion: string; datos: Buffer }[] = [];
  let bloqueEvidencias = "";
  if (fotosDescargadas.length > 0) {
    const celdasFotos = fotosDescargadas.map(({ foto, datos }, indice) => {
      const dimensiones = dimensionesImagen(datos!) ?? { ancho: 4, alto: 3 };
      const ancho = Math.min(280, dimensiones.ancho);
      const alto = Math.round((ancho * dimensiones.alto) / dimensiones.ancho);
      const relacion = `rIdEvidenciaInv${indice + 1}`;
      imagenesParaIncrustar.push({ relacion, datos: datos! });
      return celdaSimple(
        4500,
        parrafo(dibujoEnLinea(relacion, ancho, alto, 9000 + indice), "center") +
          parrafo(corrida(foto.pie, { tamano: 16 }), "center")
      );
    });
    const filasFotos: string[] = [];
    for (let inicio = 0; inicio < celdasFotos.length; inicio += 2) {
      const par = celdasFotos.slice(inicio, inicio + 2);
      if (par.length === 1) par.push(celdaSimple(4500, parrafo("")));
      filasFotos.push(fila(par));
    }
    bloqueEvidencias =
      parrafo(corrida("Evidencias fotográficas", { negrita: true, tamano: 21 })) + tabla([4500, 4500], filasFotos, false);
  }

  const bufferBase = renderizarPlantilla("informe-investigacion-mensual.docx", {
    CARRERA,
    PROYECTO: nombreProyecto,
    EVIDENCIAS: bloqueEvidencias,
    LIDER: usuario.nombres,
    PERIODO: body.periodo.etiqueta,
    RESUMEN_EJECUTIVO: body.resumenEjecutivo || "Sin resumen ejecutivo proporcionado.",
    SECCIONES: secciones.length > 0 ? secciones : [{ TITULO: "Sin registros en el período", ITEMS: ["No se registraron actividades, publicaciones ni podcasts en este período."] }],
    RESULTADOS_AVANCES: resultadosAvances,
    DIFICULTADES: dificultades
      .filter((d) => d.inconveniente?.trim())
      .map((d) => ({ INCONVENIENTE: d.inconveniente, SOLUCION: d.solucion || "—" })),
    PLAN_SIGUIENTE: body.planSiguiente || "Sin plan definido para el siguiente período.",
  });

  let buffer: Buffer = bufferBase;
  if (imagenesParaIncrustar.length > 0) {
    const zip = new PizZip(bufferBase);
    let relaciones = zip.file("word/_rels/document.xml.rels")!.asText();
    let tipos = zip.file("[Content_Types].xml")!.asText();
    imagenesParaIncrustar.forEach((imagen) => {
      const nombreArchivo = `evidencia_inv_${imagen.relacion}.jpg`;
      zip.file(`word/media/${nombreArchivo}`, imagen.datos);
      relaciones = relaciones.replace(
        "</Relationships>",
        `<Relationship Id="${imagen.relacion}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${nombreArchivo}"/></Relationships>`
      );
    });
    if (!/Extension="jpg"/i.test(tipos)) {
      tipos = tipos.replace("<Default ", '<Default Extension="jpg" ContentType="image/jpeg"/><Default ');
    }
    zip.file("word/_rels/document.xml.rels", relaciones);
    zip.file("[Content_Types].xml", tipos);
    buffer = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
  }

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
