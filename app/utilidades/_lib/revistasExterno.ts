import { pedirCompletionIA } from "./groq";
import { normalizarIssn, type ReferenciaDetectada } from "./revistasTexto";

/**
 * Fuentes externas del buscador de revistas: Crossref (revistas y títulos de las
 * referencias) y Groq (conceptos bilingües). Ambas son opcionales: si fallan, el
 * ranking sigue funcionando solo con el texto del artículo.
 */

const CORREO_CROSSREF = process.env.OPENALEX_MAILTO || "arturo.rodriguez@uleam.edu.ec";
const MAX_REFERENCIAS_CONSULTADAS = 40;
const CONCURRENCIA = 5;
const TIMEOUT_MS = 7000;

export interface ReferenciaResuelta {
  tituloObra: string | null;
  revista: string | null;
  issns: string[];
}

async function consultarCrossref(referencia: ReferenciaDetectada): Promise<ReferenciaResuelta | null> {
  const campos = "select=title,container-title,ISSN,score";
  const url = referencia.doi
    ? `https://api.crossref.org/works/${encodeURIComponent(referencia.doi)}?mailto=${encodeURIComponent(CORREO_CROSSREF)}`
    : `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(referencia.textoOriginal.slice(0, 300))}&rows=1&${campos}&mailto=${encodeURIComponent(CORREO_CROSSREF)}`;

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);
  try {
    const respuesta = await fetch(url, { signal: controlador.signal });
    if (!respuesta.ok) return null;
    const cuerpo = await respuesta.json();
    const obra = referencia.doi ? cuerpo.message : cuerpo.message?.items?.[0];
    if (!obra) return null;
    // Sin DOI la coincidencia es difusa: exigir puntaje razonable para no inventar revistas.
    if (!referencia.doi && (obra.score ?? 0) < 60) return null;
    return {
      tituloObra: obra.title?.[0] ?? null,
      revista: obra["container-title"]?.[0] ?? null,
      issns: ((obra.ISSN as string[]) ?? []).map(normalizarIssn).filter((issn): issn is string => Boolean(issn)),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}

export async function resolverReferencias(referencias: ReferenciaDetectada[]): Promise<ReferenciaResuelta[]> {
  const aConsultar = referencias.slice(0, MAX_REFERENCIAS_CONSULTADAS);
  const resueltas: ReferenciaResuelta[] = [];
  for (let inicio = 0; inicio < aConsultar.length; inicio += CONCURRENCIA) {
    const lote = aConsultar.slice(inicio, inicio + CONCURRENCIA);
    const respuestas = await Promise.all(lote.map(consultarCrossref));
    for (const respuesta of respuestas) if (respuesta) resueltas.push(respuesta);
  }
  return resueltas;
}

export type IdiomaBusqueda = "es" | "en" | "ambos";

/** Pide a Groq conceptos clave del artículo en el/los idioma(s) pedido(s). Devuelve [] si no hay IA. */
export async function extraerConceptosIA(
  texto: { titulo: string; resumen: string; keywords: string },
  idioma: IdiomaBusqueda,
): Promise<string[]> {
  const idiomasPedidos =
    idioma === "ambos" ? "inglés y español (cada concepto en ambos idiomas)" : idioma === "en" ? "inglés" : "español";
  try {
    const respuesta = await pedirCompletionIA(
      [
        {
          role: "system",
          content:
            "Eres bibliotecario científico. Dado un artículo, devuelves SOLO JSON {\"conceptos\": string[]} con 10 a 16 " +
            "términos o frases cortas (disciplina, subcampo, tema, método) que sirvan para ubicar revistas académicas afines. " +
            `Idioma de los términos: ${idiomasPedidos}. Sin explicaciones.`,
        },
        {
          role: "user",
          content: `Título: ${texto.titulo}\nPalabras clave: ${texto.keywords}\nResumen: ${texto.resumen.slice(0, 2500)}`,
        },
      ],
      { responseFormatJson: true, temperature: 0.2 },
    );
    const datos = JSON.parse(respuesta);
    return Array.isArray(datos.conceptos) ? datos.conceptos.filter((c: unknown) => typeof c === "string").slice(0, 24) : [];
  } catch {
    return [];
  }
}
