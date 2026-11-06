/**
 * Utilidades de texto para el buscador de revistas diamante (/utilidades/revistas).
 * Catálogo: Universitat de València, Servei de Biblioteques i Documentació (2026),
 * Zenodo, https://zenodo.org/records/22763970
 */

const PALABRAS_VACIAS = new Set(
  (
    // inglés
    "the and for with that this from are was were been have has had not but can will would could should may might " +
    "into onto over under between among about than then also such other more most some any each their there these those " +
    "which while where when what who whom whose how why our out use used using based study studies analysis approach " +
    "results result method methods paper article research review case cases new through within without across during " +
    // español
    "los las del una uno unos unas con por para que como este esta estos estas ese esa esos esas pero sus sobre entre " +
    "desde hasta hacia segun mediante tambien cada otro otra otros otras muy mas menos solo sino aunque donde cuando " +
    "estudio estudios analisis enfoque resultados resultado metodo metodos articulo investigacion revision caso casos " +
    "nuevo nueva traves dentro ante bajo tras"
  ).split(/\s+/),
);

/** Minúsculas y sin tildes: el catálogo se guarda normalizado igual (ver normalizar-perfil-revistas.js). */
export function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Raíz ligera (no es un stemmer completo): recorta sufijos comunes ES/EN; la coincidencia se hace por prefijo. */
export function obtenerRaiz(palabra: string): string {
  if (palabra.length <= 6) return palabra;
  const recortada = palabra.replace(
    /(izaciones|izacion|aciones|acion|amientos|amiento|mente|ments|ment|ings|ing|ities|ity|ness|ions|ion|ales|ados|adas|ado|ada|ores|ies|es|s|ed|ly)$/,
    "",
  );
  return recortada.length >= 4 ? recortada : palabra;
}

export interface TerminoBusqueda {
  raiz: string;
  /** Palabra tal como la escribió la persona (para explicar coincidencias). */
  palabraOriginal: string;
  peso: number;
}

/** Descompone un texto en términos con peso; `acumulado` conserva el mayor peso visto por raíz. */
export function agregarTerminos(texto: string, peso: number, acumulado: Map<string, TerminoBusqueda>): void {
  for (const palabra of normalizar(texto).split(/[^a-z0-9]+/)) {
    if (palabra.length < 4 || PALABRAS_VACIAS.has(palabra) || /^\d+$/.test(palabra)) continue;
    const raiz = obtenerRaiz(palabra);
    const existente = acumulado.get(raiz);
    if (!existente) acumulado.set(raiz, { raiz, palabraOriginal: palabra, peso });
    else if (peso > existente.peso) existente.peso = peso;
  }
}

export interface ReferenciaDetectada {
  textoOriginal: string;
  doi: string | null;
}

const PATRON_DOI = /10\.\d{4,9}\/[^\s"<>]+/i;

/** Separa el cuadro de referencias (una por línea o por párrafo) y detecta DOIs. */
export function separarReferencias(texto: string): ReferenciaDetectada[] {
  const bloques = texto.split(/\n\s*\n/);
  const piezas = bloques.length > 1 ? bloques : texto.split(/\n/);
  const referencias: ReferenciaDetectada[] = [];
  for (const pieza of piezas) {
    const textoLimpio = pieza.replace(/\s+/g, " ").trim();
    if (textoLimpio.length < 20) continue;
    const coincidencia = textoLimpio.match(PATRON_DOI);
    const doi = coincidencia ? coincidencia[0].replace(/[.,;)\]]+$/, "").toLowerCase() : null;
    referencias.push({ textoOriginal: textoLimpio, doi });
  }
  return referencias;
}

export function normalizarIssn(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const limpio = valor.replace(/[^0-9xX]/g, "").toUpperCase();
  return limpio.length === 8 ? `${limpio.slice(0, 4)}-${limpio.slice(4)}` : null;
}
