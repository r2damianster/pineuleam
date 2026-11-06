import { sql } from "./db";
import { extraerConceptosIA, resolverReferencias, type IdiomaBusqueda } from "./revistasExterno";
import {
  agregarTerminos,
  normalizar,
  normalizarIssn,
  separarReferencias,
  type TerminoBusqueda,
} from "./revistasTexto";

/**
 * Motor de ranking de revistas diamante.
 * Catálogo: Universitat de València, Servei de Biblioteques i Documentació (2026), Zenodo,
 * https://zenodo.org/records/22763970 · Enriquecimiento temático: OpenAlex · Referencias: Crossref.
 */

export interface EntradaBusqueda {
  titulo: string;
  resumen?: string;
  abstractIngles?: string;
  keywords?: string;
  referencias?: string;
  idioma: IdiomaBusqueda;
  cuartilMinimo?: 1 | 2 | 3 | 4;
  paises?: string[];
  soloSelloFecyt?: boolean;
  limite: number;
}

export interface ResultadoRevista {
  posicion: number;
  id: number;
  titulo: string;
  url: string | null;
  issn: string | null;
  eissn: string | null;
  pais: string | null;
  editor: string | null;
  selloFecyt: boolean;
  cuartilJcr: string | null;
  cuartilSjr: string | null;
  cuartilIdr: string | null;
  mejorCuartil: number | null;
  subjects: string[];
  puntaje: number;
  puntajeTematico: number;
  puntajeReferencias: number;
  puntajeImpacto: number;
  referenciasCitadas: number;
  coincidencias: string[];
  temasCoincidentes: string[];
}

export interface MetaBusqueda {
  terminosUsados: number;
  conceptosIA: string[];
  referenciasDetectadas: number;
  referenciasResueltas: number;
  revistasCitadasEnCatalogo: number;
  totalCandidatas: number;
  advertencias: string[];
}

interface FilaRevista {
  id: number;
  titulo: string;
  url: string | null;
  issn: string | null;
  eissn: string | null;
  pais: string | null;
  editor: string | null;
  sello_fecyt: string | null;
  q_jcr: string | null;
  q_sjr: string | null;
  q_idr: string | null;
  subjects: string[];
  temas: { nombre: string }[];
  perfil_texto: string;
  rango: number;
}

const PESO_TITULO = 3;
const PESO_KEYWORDS = 3;
const PESO_CONCEPTO_IA = 2;
const PESO_RESUMEN = 1;
const PESO_TITULO_REFERENCIA = 0.5;
const MAX_TERMINOS_CONSULTA = 60;
const MAX_CANDIDATAS = 600;

const VALOR_CUARTIL: Record<number, number> = { 1: 1, 2: 0.7, 3: 0.4, 4: 0.2 };

function mejorCuartilNumerico(...cuartiles: (string | null)[]): number | null {
  const numeros = cuartiles
    .map((cuartil) => (cuartil && /^Q[1-4]$/.test(cuartil) ? Number(cuartil[1]) : null))
    .filter((numero): numero is number => numero !== null);
  return numeros.length ? Math.min(...numeros) : null;
}

export async function buscarRevistas(entrada: EntradaBusqueda): Promise<{ resultados: ResultadoRevista[]; meta: MetaBusqueda }> {
  const advertencias: string[] = [];
  const terminos = new Map<string, TerminoBusqueda>();

  // 1) Términos del propio artículo
  agregarTerminos(entrada.titulo, PESO_TITULO, terminos);
  if (entrada.keywords) agregarTerminos(entrada.keywords, PESO_KEYWORDS, terminos);
  for (const texto of [entrada.resumen, entrada.abstractIngles]) {
    if (texto) agregarTerminos(texto, PESO_RESUMEN, terminos);
  }

  // 2) Conceptos bilingües con IA (opcional)
  const conceptosIA = await extraerConceptosIA(
    { titulo: entrada.titulo, resumen: [entrada.resumen, entrada.abstractIngles].filter(Boolean).join("\n"), keywords: entrada.keywords ?? "" },
    entrada.idioma,
  );
  if (conceptosIA.length === 0) {
    advertencias.push("No se pudo usar la IA para ampliar términos (cuota o configuración); se usó solo el texto ingresado.");
  }
  for (const concepto of conceptosIA) agregarTerminos(concepto, PESO_CONCEPTO_IA, terminos);

  // 3) Referencias: revistas citadas (Crossref) + títulos citados como patrón temático extra
  const referenciasDetectadas = entrada.referencias ? separarReferencias(entrada.referencias) : [];
  const referenciasResueltas = referenciasDetectadas.length ? await resolverReferencias(referenciasDetectadas) : [];
  const conteoPorIssn = new Map<string, number>();
  for (const referencia of referenciasResueltas) {
    if (referencia.tituloObra) agregarTerminos(referencia.tituloObra, PESO_TITULO_REFERENCIA, terminos);
    for (const issn of Array.from(new Set(referencia.issns))) conteoPorIssn.set(issn, (conteoPorIssn.get(issn) ?? 0) + 1);
  }
  if (referenciasDetectadas.length > 0 && referenciasResueltas.length === 0) {
    advertencias.push("No se pudo identificar ninguna referencia en Crossref; el ranking no usa referencias.");
  }

  // 4) Consulta de candidatas: full-text con prefijos, solo los términos de mayor peso
  const terminosOrdenados = Array.from(terminos.values()).sort((a, b) => b.peso - a.peso).slice(0, MAX_TERMINOS_CONSULTA);
  const consultaTsquery = terminosOrdenados
    .map((termino) => termino.raiz)
    .filter((raiz) => /^[a-z0-9]+$/.test(raiz))
    .map((raiz) => `${raiz}:*`)
    .join(" | ");
  if (!consultaTsquery) {
    return {
      resultados: [],
      meta: { terminosUsados: 0, conceptosIA, referenciasDetectadas: referenciasDetectadas.length, referenciasResueltas: referenciasResueltas.length, revistasCitadasEnCatalogo: 0, totalCandidatas: 0, advertencias: [...advertencias, "El título no contiene términos buscables."] },
    };
  }

  const cuartilMaximo = entrada.cuartilMinimo ? `Q${entrada.cuartilMinimo}` : null;
  const filas = (await sql`
    SELECT id, titulo, url, issn, eissn, pais, editor, sello_fecyt, q_jcr, q_sjr, q_idr,
           subjects, temas, perfil_texto,
           ts_rank_cd(to_tsvector('simple', perfil_texto), to_tsquery('simple', ${consultaTsquery}), 32) AS rango
    FROM revistas_diamante
    WHERE to_tsvector('simple', perfil_texto) @@ to_tsquery('simple', ${consultaTsquery})
      AND (${entrada.paises?.length ? entrada.paises : null}::text[] IS NULL OR pais = ANY(${entrada.paises?.length ? entrada.paises : null}::text[]))
      AND (${entrada.soloSelloFecyt ?? false} = false OR sello_fecyt IS NOT NULL)
      AND (${cuartilMaximo}::text IS NULL
           OR LEAST(COALESCE(q_jcr,'Q9'), COALESCE(q_sjr,'Q9'), COALESCE(q_idr,'Q9')) <= ${cuartilMaximo}::text)
    ORDER BY rango DESC
    LIMIT ${MAX_CANDIDATAS}`) as unknown as FilaRevista[];

  // 5) Ponderación idf dentro del conjunto candidato: términos que aparecen en casi todas valen menos
  const perfiles = filas.map((fila) => ` ${fila.perfil_texto}`);
  const frecuenciaDocumental = new Map<string, number>();
  for (const termino of terminosOrdenados) {
    const marcador = ` ${termino.raiz}`;
    frecuenciaDocumental.set(termino.raiz, perfiles.reduce((acumulado, perfil) => acumulado + (perfil.includes(marcador) ? 1 : 0), 0));
  }
  const pesoEfectivo = (termino: TerminoBusqueda) =>
    termino.peso * Math.log(1 + filas.length / (1 + (frecuenciaDocumental.get(termino.raiz) ?? 0)));
  const pesoTotal = terminosOrdenados.reduce((acumulado, termino) => acumulado + pesoEfectivo(termino), 0) || 1;

  const maxRango = Math.max(...filas.map((fila) => Number(fila.rango)), 1e-9);
  const hayReferencias = conteoPorIssn.size > 0;

  const intermedios = filas.map((fila, indice) => {
    const coincidenciasConPeso = terminosOrdenados
      .filter((termino) => perfiles[indice].includes(` ${termino.raiz}`))
      .map((termino) => ({ termino, peso: pesoEfectivo(termino) }));
    const cobertura = coincidenciasConPeso.reduce((acumulado, item) => acumulado + item.peso, 0) / pesoTotal;
    const issnsRevista = [normalizarIssn(fila.issn), normalizarIssn(fila.eissn)].filter((issn): issn is string => Boolean(issn));
    const citas = Math.max(0, ...issnsRevista.map((issn) => conteoPorIssn.get(issn) ?? 0));
    return { fila, coincidenciasConPeso, cobertura, citas };
  });
  const maxCobertura = Math.max(...intermedios.map((item) => item.cobertura), 1e-9);

  const resultados = intermedios.map(({ fila, coincidenciasConPeso, cobertura, citas }) => {
    const tematico = 0.5 * (Number(fila.rango) / maxRango) + 0.5 * (cobertura / maxCobertura);
    const referencias = Math.min(1, citas / 3);
    const mejorCuartil = mejorCuartilNumerico(fila.q_jcr, fila.q_sjr, fila.q_idr);
    const impacto = Math.min(1, (mejorCuartil ? VALOR_CUARTIL[mejorCuartil] : 0.1) + (fila.sello_fecyt ? 0.1 : 0));
    const puntaje = hayReferencias
      ? 0.55 * tematico + 0.25 * referencias + 0.2 * impacto
      : 0.75 * tematico + 0.25 * impacto;

    const coincidencias = coincidenciasConPeso
      .sort((a, b) => b.peso - a.peso)
      .slice(0, 6)
      .map((item) => item.termino.palabraOriginal);
    const raicesCoincidentes = coincidenciasConPeso.map((item) => item.termino.raiz);
    const temasCoincidentes = (fila.temas ?? [])
      .filter((tema) => raicesCoincidentes.some((raiz) => ` ${normalizar(tema.nombre)}`.includes(` ${raiz}`)))
      .slice(0, 3)
      .map((tema) => tema.nombre);

    return {
      posicion: 0,
      id: fila.id,
      titulo: fila.titulo,
      url: fila.url,
      issn: fila.issn,
      eissn: fila.eissn,
      pais: fila.pais,
      editor: fila.editor,
      selloFecyt: Boolean(fila.sello_fecyt),
      cuartilJcr: fila.q_jcr,
      cuartilSjr: fila.q_sjr,
      cuartilIdr: fila.q_idr,
      mejorCuartil,
      subjects: fila.subjects,
      puntaje: Math.round(puntaje * 1000) / 10,
      puntajeTematico: Math.round(tematico * 1000) / 10,
      puntajeReferencias: Math.round(referencias * 1000) / 10,
      puntajeImpacto: Math.round(impacto * 1000) / 10,
      referenciasCitadas: citas,
      coincidencias,
      temasCoincidentes,
    } satisfies ResultadoRevista;
  });

  resultados.sort((a, b) => b.puntaje - a.puntaje);
  const recortados = resultados.slice(0, entrada.limite);
  recortados.forEach((resultado, indice) => { resultado.posicion = indice + 1; });

  return {
    resultados: recortados,
    meta: {
      terminosUsados: terminosOrdenados.length,
      conceptosIA,
      referenciasDetectadas: referenciasDetectadas.length,
      referenciasResueltas: referenciasResueltas.length,
      revistasCitadasEnCatalogo: resultados.filter((resultado) => resultado.referenciasCitadas > 0).length,
      totalCandidatas: filas.length,
      advertencias,
    },
  };
}
