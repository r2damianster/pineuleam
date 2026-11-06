"use client";

import Link from "next/link";
import { useState } from "react";

interface ResultadoRevista {
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

interface MetaBusqueda {
  terminosUsados: number;
  conceptosIA: string[];
  referenciasDetectadas: number;
  referenciasResueltas: number;
  revistasCitadasEnCatalogo: number;
  totalCandidatas: number;
  advertencias: string[];
}

type IdiomaBusqueda = "es" | "en" | "ambos";

const CITA_DATASET =
  "Universitat de València. Servei de Biblioteques i Documentació (2026). Revistas Diamante. Revisión septiembre 2026. " +
  "Diamond Journals. Update September 2026 (v6) [Dataset]. Zenodo. https://zenodo.org/records/22763970";

const CLASE_CAMPO = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#003366] focus:outline-none";

function escaparCampoCsv(valor: string | number | null | undefined): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  return `"${texto.replace(/"/g, '""')}"`;
}

function exportarCsv(resultados: ResultadoRevista[], tituloArticulo: string) {
  const encabezados = [
    "Posición", "Puntaje (0-100)", "Revista", "ISSN", "eISSN", "País", "Editorial", "Cuartil JCR", "Cuartil SJR",
    "Cuartil IDR", "Sello FECYT", "Enlace", "Temas coincidentes", "Términos coincidentes", "Referencias citadas en esta revista",
  ];
  const filas = resultados.map((resultado) => [
    resultado.posicion, resultado.puntaje, resultado.titulo, resultado.issn, resultado.eissn, resultado.pais,
    resultado.editor, resultado.cuartilJcr, resultado.cuartilSjr, resultado.cuartilIdr, resultado.selloFecyt ? "Sí" : "No",
    resultado.url, resultado.temasCoincidentes.join("; "), resultado.coincidencias.join("; "), resultado.referenciasCitadas,
  ]);
  const lineas = [
    [`Artículo: ${tituloArticulo}`], [`Fuente del catálogo: ${CITA_DATASET}`], [],
    encabezados, ...filas,
  ].map((linea) => linea.map(escaparCampoCsv).join(","));

  const blob = new Blob(["﻿" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = "revistas-sugeridas.csv";
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

export default function BuscadorRevistasPage() {
  const [titulo, setTitulo] = useState("");
  const [resumen, setResumen] = useState("");
  const [abstractIngles, setAbstractIngles] = useState("");
  const [keywords, setKeywords] = useState("");
  const [referencias, setReferencias] = useState("");
  const [idioma, setIdioma] = useState<IdiomaBusqueda>("ambos");
  const [cuartilMinimo, setCuartilMinimo] = useState("");
  const [soloSelloFecyt, setSoloSelloFecyt] = useState(false);
  const [limite, setLimite] = useState(100);

  const [buscando, setBuscando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [resultados, setResultados] = useState<ResultadoRevista[] | null>(null);
  const [meta, setMeta] = useState<MetaBusqueda | null>(null);
  const [tituloBuscado, setTituloBuscado] = useState("");

  async function manejarBusqueda(evento: React.FormEvent) {
    evento.preventDefault();
    setBuscando(true);
    setMensajeError("");
    try {
      const respuesta = await fetch("/utilidades/revistas/api/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo, resumen, abstractIngles, keywords, referencias, idioma, limite, soloSelloFecyt,
          cuartilMinimo: cuartilMinimo ? Number(cuartilMinimo) : undefined,
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || "Error en la búsqueda");
      setResultados(datos.resultados);
      setMeta(datos.meta);
      setTituloBuscado(titulo);
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : "Error en la búsqueda");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-4">
        <Link href="/utilidades" className="inline-flex items-center text-[#003366] hover:underline font-medium">
          &larr; Volver a Herramientas
        </Link>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-[#003366]">Buscador de revistas diamante</h1>
      <p className="mb-6 text-slate-600">
        Ingresa los datos de tu artículo. Solo el título es obligatorio; mientras más datos aportes, mejor el resultado.
        Las revistas diamante son de acceso abierto y no cobran a autores ni a lectores.
      </p>

      <form onSubmit={manejarBusqueda} className="mb-8 space-y-4 rounded-xl border border-slate-200 p-5 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Título del artículo *</span>
          <input required minLength={5} value={titulo} onChange={(e) => setTitulo(e.target.value)} className={CLASE_CAMPO} />
        </label>

        <details className="rounded-lg border border-slate-200 p-4" open>
          <summary className="cursor-pointer text-sm font-semibold text-[#003366]">Más datos mejoran el resultado (opcionales)</summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Palabras clave (separadas por coma)</span>
              <input value={keywords} onChange={(e) => setKeywords(e.target.value)} className={CLASE_CAMPO} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Resumen</span>
              <textarea rows={6} value={resumen} onChange={(e) => setResumen(e.target.value)} className={CLASE_CAMPO} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Abstract</span>
              <textarea rows={6} value={abstractIngles} onChange={(e) => setAbstractIngles(e.target.value)} className={CLASE_CAMPO} />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Referencias (una por línea o párrafo; con DOI se identifican mejor)
              </span>
              <textarea rows={8} value={referencias} onChange={(e) => setReferencias(e.target.value)} className={CLASE_CAMPO}
                placeholder="Pega aquí tu lista de referencias. Se buscan en Crossref para ver en qué revistas ya se cita." />
            </label>
          </div>
        </details>

        <div className="grid gap-4 md:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Idioma de búsqueda</span>
            <select value={idioma} onChange={(e) => setIdioma(e.target.value as IdiomaBusqueda)} className={CLASE_CAMPO}>
              <option value="ambos">Español e inglés (recomendado)</option>
              <option value="es">Solo español</option>
              <option value="en">Solo inglés</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Cuartil mínimo</span>
            <select value={cuartilMinimo} onChange={(e) => setCuartilMinimo(e.target.value)} className={CLASE_CAMPO}>
              <option value="">Cualquiera</option>
              <option value="1">Solo Q1</option>
              <option value="2">Q1 – Q2</option>
              <option value="3">Q1 – Q3</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Cantidad de sugerencias</span>
            <select value={limite} onChange={(e) => setLimite(Number(e.target.value))} className={CLASE_CAMPO}>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={300}>300</option>
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={soloSelloFecyt} onChange={(e) => setSoloSelloFecyt(e.target.checked)} />
            Solo con sello FECYT
          </label>
        </div>

        <button type="submit" disabled={buscando}
          className="rounded-lg bg-[#003366] px-5 py-2 font-semibold text-white hover:bg-[#002244] disabled:opacity-60">
          {buscando ? "Buscando… (puede tardar si hay referencias)" : "Buscar revistas"}
        </button>
        {mensajeError && <p className="text-sm text-red-600">{mensajeError}</p>}
      </form>

      {resultados && meta && (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#003366]">
              {resultados.length} revistas sugeridas, de la más a la menos compatible
            </h2>
            <button type="button" onClick={() => exportarCsv(resultados, tituloBuscado)}
              className="rounded-lg border border-[#003366] px-4 py-2 text-sm font-semibold text-[#003366] hover:bg-slate-50">
              Exportar CSV
            </button>
          </div>

          <ul className="mb-4 space-y-1 text-sm text-slate-600">
            <li>Términos usados en la búsqueda: {meta.terminosUsados}{meta.conceptosIA.length > 0 && ` (incluye ${meta.conceptosIA.length} conceptos de IA)`}.</li>
            {meta.referenciasDetectadas > 0 && (
              <li>
                Referencias: {meta.referenciasResueltas} de {meta.referenciasDetectadas} identificadas en Crossref;
                {" "}{meta.revistasCitadasEnCatalogo} revistas del catálogo ya aparecen citadas.
              </li>
            )}
            {meta.advertencias.map((advertencia) => (
              <li key={advertencia} className="text-amber-700">⚠ {advertencia}</li>
            ))}
          </ul>

          {resultados.length === 0 ? (
            <p className="rounded-lg border border-slate-200 p-4 text-slate-600">
              Sin coincidencias. Prueba con más datos (resumen, palabras clave) o relaja los filtros.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Puntaje</th>
                    <th className="px-3 py-2">Revista</th>
                    <th className="px-3 py-2">Cuartiles</th>
                    <th className="px-3 py-2">País / Editorial</th>
                    <th className="px-3 py-2">Por qué la sugerimos</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((resultado) => (
                    <tr key={resultado.id} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2 text-slate-500">{resultado.posicion}</td>
                      <td className="px-3 py-2 font-semibold text-[#003366]">
                        {resultado.puntaje}
                        <div className="text-xs font-normal text-slate-500">
                          tema {resultado.puntajeTematico} · impacto {resultado.puntajeImpacto}
                          {meta.referenciasResueltas > 0 && ` · refs ${resultado.puntajeReferencias}`}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {resultado.url ? (
                          <a href={resultado.url} target="_blank" rel="noopener noreferrer" className="font-medium text-[#003366] hover:underline">
                            {resultado.titulo}
                          </a>
                        ) : (
                          <span className="font-medium">{resultado.titulo}</span>
                        )}
                        <div className="text-xs text-slate-500">ISSN {resultado.issn ?? "—"}{resultado.eissn && ` · eISSN ${resultado.eissn}`}</div>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        JCR {resultado.cuartilJcr ?? "—"} · SJR {resultado.cuartilSjr ?? "—"} · IDR {resultado.cuartilIdr ?? "—"}
                        {resultado.selloFecyt && <div className="text-emerald-700">Sello FECYT</div>}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {resultado.pais ?? "—"}
                        <div className="text-slate-500">{resultado.editor ?? ""}</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {resultado.coincidencias.length > 0 && <div>Términos: {resultado.coincidencias.join(", ")}</div>}
                        {resultado.temasCoincidentes.length > 0 && <div>Temas: {resultado.temasCoincidentes.join(" · ")}</div>}
                        {resultado.referenciasCitadas > 0 && (
                          <div className="text-emerald-700">Citada {resultado.referenciasCitadas} {resultado.referenciasCitadas === 1 ? "vez" : "veces"} en tus referencias</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500">
        <p>
          <strong>Fuente del catálogo de revistas:</strong> {CITA_DATASET}. Curación de datos: Grupo Apoyo a la Investigación,
          Servei de Biblioteques i Documentació; gestión de datos: Manuel Álvarez Vizcaino y Nieves Marina Cano.
          {" "}<a href="https://zenodo.org/records/22763970" target="_blank" rel="noopener noreferrer" className="text-[#003366] underline">Ver registro en Zenodo</a>.
        </p>
        <p className="mt-1">Temas y producción de cada revista: OpenAlex. Revistas citadas en las referencias: Crossref. Es una sugerencia orientativa; verifica siempre el alcance y las normas de cada revista.</p>
      </footer>
    </main>
  );
}
