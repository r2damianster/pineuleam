'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function primerDiaMesActual(): string {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
}
function ultimoDiaMesActual(): string {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().slice(0, 10);
}
function etiquetaPeriodo(desde: string, hasta: string): string {
  const d1 = new Date(desde + 'T00:00:00');
  const d2 = new Date(hasta + 'T00:00:00');
  const m1 = MESES[d1.getMonth()], m2 = MESES[d2.getMonth()];
  if (d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()) {
    return `${m1.charAt(0).toUpperCase() + m1.slice(1)} de ${d1.getFullYear()}`;
  }
  if (d1.getFullYear() === d2.getFullYear()) {
    return `${m1.charAt(0).toUpperCase() + m1.slice(1)} a ${m2} de ${d1.getFullYear()}`;
  }
  return `${m1} de ${d1.getFullYear()} a ${m2} de ${d2.getFullYear()}`;
}

interface Actividad { id: number; titulo: string; tipo: string; categoria: string; fecha: string; descripcion: string | null; }
interface Publicacion { id: string; title: string; authors: string; type: string; category: string; publication_date: string; doi_link: string | null; created: string; }
interface Podcast { id: string; title: string; description: string | null; category: string; tags: string[]; published_date: string | null; created: string; }
interface Dificultad { inconveniente: string; solucion: string; }
interface HistorialItem { id: number; periodo_desde: string; periodo_hasta: string; n_actividades: number | null; n_publicaciones: number | null; n_podcasts: number | null; generado_en: string; }

export default function InformesMensualesPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [usuario, setUsuario] = useState<{ nombres: string } | null>(null);
  const [mensaje, setMensaje] = useState('');

  const [desde, setDesde] = useState(primerDiaMesActual());
  const [hasta, setHasta] = useState(ultimoDiaMesActual());

  const [buscando, setBuscando] = useState(false);
  const [datosCargados, setDatosCargados] = useState(false);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [actSel, setActSel] = useState<Set<number>>(new Set());
  const [pubSel, setPubSel] = useState<Set<string>>(new Set());
  const [vidSel, setVidSel] = useState<Set<string>>(new Set());

  const [generando, setGenerando] = useState(false);
  const [resumenEjecutivo, setResumenEjecutivo] = useState('');
  const [planSiguiente, setPlanSiguiente] = useState('');
  const [dificultades, setDificultades] = useState<Dificultad[]>([]);

  const [descargando, setDescargando] = useState(false);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const rolOk = ['profesor', 'admin'].includes(data.usuario.rol);
        const moduloOk = data.usuario.modulos_acceso?.includes('investigacion') || data.usuario.modulos_acceso?.includes('admin');
        if (!rolOk || !moduloOk) {
          router.push('/portal/dashboard');
          return;
        }
        setUsuario(data.usuario);
        setCheckingSession(false);
        cargarHistorial();
      })
      .catch(() => router.push('/portal/login?redirect=/investigacion/informes'));
  }, [router]);

  const cargarHistorial = async () => {
    const res = await fetch('/investigacion/informes/api/historial');
    if (res.ok) {
      const data = await res.json();
      setHistorial(data.historial);
    }
  };

  const buscarDatos = async () => {
    setBuscando(true);
    setMensaje('');
    try {
      const res = await fetch(`/investigacion/informes/api/datos?desde=${desde}&hasta=${hasta}`);
      if (!res.ok) throw new Error('No se pudo cargar el período');
      const data = await res.json();
      setActividades(data.actividades);
      setPublicaciones(data.publicaciones);
      setPodcasts(data.podcasts);
      setActSel(new Set(data.actividades.map((a: Actividad) => a.id)));
      setPubSel(new Set(data.publicaciones.map((p: Publicacion) => p.id)));
      setVidSel(new Set(data.podcasts.map((v: Podcast) => v.id)));
      setDatosCargados(true);
      setResumenEjecutivo('');
      setPlanSiguiente('');
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setBuscando(false);
    }
  };

  const toggle = <T,>(set: Set<T>, setSet: (s: Set<T>) => void, id: T) => {
    const copia = new Set(set);
    if (copia.has(id)) copia.delete(id); else copia.add(id);
    setSet(copia);
  };

  const seleccionParaEnvio = () => ({
    periodo: { desde, hasta, etiqueta: etiquetaPeriodo(desde, hasta) },
    actividades: actividades.filter((a) => actSel.has(a.id)).map((a) => ({ id: a.id, titulo: a.titulo, fecha: a.fecha, detalle: a.descripcion })),
    publicaciones: publicaciones.filter((p) => pubSel.has(p.id)).map((p) => ({ id: p.id, titulo: p.title, fecha: p.created, detalle: `${p.authors} — ${p.category}` })),
    podcasts: podcasts.filter((v) => vidSel.has(v.id)).map((v) => ({ id: v.id, titulo: v.title, fecha: v.created, detalle: v.category })),
  });

  const generarBorrador = async () => {
    setGenerando(true);
    setMensaje('');
    try {
      const res = await fetch('/investigacion/informes/api/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seleccionParaEnvio()),
      });
      const data = await res.json();
      setResumenEjecutivo(data.resumenEjecutivo);
      setPlanSiguiente(data.planSiguiente);
      if (data.errorResumen || data.errorPlan) {
        setMensaje(data.errorResumen || data.errorPlan);
      }
    } catch (err: any) {
      setMensaje(`Error generando borrador: ${err.message}`);
    } finally {
      setGenerando(false);
    }
  };

  const agregarDificultad = () => setDificultades([...dificultades, { inconveniente: '', solucion: '' }]);
  const quitarDificultad = (idx: number) => setDificultades(dificultades.filter((_, i) => i !== idx));
  const editarDificultad = (idx: number, campo: 'inconveniente' | 'solucion', valor: string) => {
    const copia = [...dificultades];
    copia[idx] = { ...copia[idx], [campo]: valor };
    setDificultades(copia);
  };

  const descargarInforme = async () => {
    setDescargando(true);
    setMensaje('');
    try {
      const sel = seleccionParaEnvio();
      const body = {
        periodo: sel.periodo,
        actividades: actividades.filter((a) => actSel.has(a.id)).map((a) => ({ id: a.id, titulo: a.titulo, fecha: a.fecha, descripcion: a.descripcion })),
        publicaciones: publicaciones.filter((p) => pubSel.has(p.id)).map((p) => ({ id: p.id, title: p.title, authors: p.authors, category: p.category })),
        podcasts: podcasts.filter((v) => vidSel.has(v.id)).map((v) => ({ id: v.id, title: v.title, category: v.category })),
        resumenEjecutivo,
        planSiguiente,
        dificultades,
      };
      const res = await fetch('/investigacion/informes/api/descargar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('No se pudo generar el documento');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Informe_Mensual_${desde}_a_${hasta}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      cargarHistorial();
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setDescargando(false);
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-xl shadow">
        <div className="mb-4">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Informes Mensuales de Investigación</h1>
          {usuario && <span className="text-sm text-gray-600">{usuario.nombres}</span>}
        </div>

        {mensaje && <div className="p-4 mb-4 bg-blue-100 text-blue-800 rounded">{mensaje}</div>}

        {/* Selector de período */}
        <div className="border p-4 rounded bg-gray-50 mb-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <input type="date" className="border p-2 rounded" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <input type="date" className="border p-2 rounded" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <button
            disabled={buscando}
            onClick={buscarDatos}
            className="bg-uleam-blue text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {buscando ? 'Buscando...' : 'Buscar registros del período'}
          </button>
        </div>

        {datosCargados && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Marca lo que quieras incluir en tu informe. Nada se incluye automáticamente por default más allá de tu selección inicial — puedes desmarcar cualquier ítem.
            </p>

            <SeccionSeleccion
              titulo="Actividades, aportes validados y avance de metas"
              vacio="No hay actividades, aportes validados ni metas con avance en este período."
              items={actividades.map((a) => ({
                id: a.id,
                titulo: a.titulo,
                subtitulo: `${a.fecha} · ${a.tipo === 'aporte_investigacion' ? 'aporte validado' : a.tipo === 'avance_metas' ? 'avance de metas' : a.categoria || a.tipo}`,
              }))}
              seleccionados={actSel}
              onToggle={(id) => toggle(actSel, setActSel, id as number)}
            />

            <SeccionSeleccion
              titulo="Publicaciones y contribuciones académicas en el período"
              vacio="No hay publicaciones ni contribuciones académicas (artículos, libros, ponencias) registradas en el período."
              items={publicaciones.map((p) => ({ id: p.id, titulo: p.title, subtitulo: `${p.authors} · ${p.category}` }))}
              seleccionados={pubSel}
              onToggle={(id) => toggle(pubSel, setPubSel, id as string)}
            />

            <SeccionSeleccion
              titulo="Podcasts del proyecto en el período"
              vacio="No hay episodios de podcast en el período."
              items={podcasts.map((v) => ({ id: v.id, titulo: v.title, subtitulo: v.category }))}
              seleccionados={vidSel}
              onToggle={(id) => toggle(vidSel, setVidSel, id as string)}
            />

            <div className="mb-6">
              <button
                disabled={generando}
                onClick={generarBorrador}
                className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {generando ? 'Generando con IA...' : 'Generar borrador con IA'}
              </button>
              <span className="text-xs text-gray-400 ml-2">Redacta el resumen ejecutivo y el plan siguiente a partir de lo que marcaste arriba — nunca añade ítems nuevos.</span>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Resumen ejecutivo</label>
              <textarea className="w-full border p-2 rounded" rows={4} value={resumenEjecutivo} onChange={(e) => setResumenEjecutivo(e.target.value)} />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dificultades y soluciones (opcional, no se genera con IA)</label>
              {dificultades.map((d, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input className="flex-1 border p-2 rounded" placeholder="Inconveniente" value={d.inconveniente} onChange={(e) => editarDificultad(idx, 'inconveniente', e.target.value)} />
                  <input className="flex-1 border p-2 rounded" placeholder="Solución" value={d.solucion} onChange={(e) => editarDificultad(idx, 'solucion', e.target.value)} />
                  <button onClick={() => quitarDificultad(idx)} className="text-red-600 px-2">✕</button>
                </div>
              ))}
              <button onClick={agregarDificultad} className="text-sm text-blue-600 hover:underline">+ Agregar dificultad</button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan de actividades para el siguiente período</label>
              <textarea className="w-full border p-2 rounded" rows={4} value={planSiguiente} onChange={(e) => setPlanSiguiente(e.target.value)} />
            </div>

            <button
              disabled={descargando}
              onClick={descargarInforme}
              className="w-full bg-uleam-blue text-white p-3 rounded font-semibold disabled:opacity-50"
            >
              {descargando ? 'Generando documento...' : 'Descargar informe (.docx)'}
            </button>
          </>
        )}

        <div className="mt-10">
          <h3 className="font-bold text-lg mb-2">Historial de informes generados</h3>
          {historial.length === 0 && <p className="text-gray-500 text-sm">Todavía no has generado ningún informe.</p>}
          <ul className="space-y-1">
            {historial.map((h) => (
              <li key={h.id} className="text-sm text-gray-600 border-b py-1">
                {h.periodo_desde} a {h.periodo_hasta} — {h.n_actividades || 0} actividades, {h.n_publicaciones || 0} publicaciones, {h.n_podcasts || 0} podcasts
                <span className="text-gray-400"> · generado {new Date(h.generado_en).toLocaleString('es-EC')}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SeccionSeleccion({
  titulo,
  vacio,
  items,
  seleccionados,
  onToggle,
}: {
  titulo: string;
  vacio: string;
  items: { id: number | string; titulo: string; subtitulo: string }[];
  seleccionados: Set<number | string>;
  onToggle: (id: number | string) => void;
}) {
  return (
    <div className="mb-6">
      <h3 className="font-bold text-md mb-2">{titulo} ({items.length})</h3>
      {items.length === 0 && <p className="text-gray-400 text-sm">{vacio}</p>}
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 p-2 border rounded">
            <input
              type="checkbox"
              className="mt-1"
              checked={seleccionados.has(item.id)}
              onChange={() => onToggle(item.id)}
            />
            <div>
              <div className="font-medium text-sm">{item.titulo}</div>
              <div className="text-xs text-gray-500">{item.subtitulo}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
