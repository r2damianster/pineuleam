'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';

type TipoHoras = 'asistencia' | 'autonomas' | 'investigacion' | 'podcast';

interface Topes { asistencia: number | null; autonomas: number | null; investigacion: number | null; podcast: number | null; meta: number }
interface FilaPasante {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  supervisores: string;
  tieneTopePropio: boolean;
  topes: Topes;
  aprobadas: Record<TipoHoras, number>;
  contables: { porTipo: Record<TipoHoras, number>; total: number };
  aviso: string | null;
}
interface Perfil { id: string; etiqueta: string; topes: Topes }

// Valores en edición: texto para poder dejar vacío (= sin tope propio).
type Edicion = Record<'asistencia' | 'autonomas' | 'investigacion' | 'podcast' | 'meta', string>;

const TIPOS: { id: TipoHoras; etiqueta: string }[] = [
  { id: 'asistencia', etiqueta: 'Clubes' },
  { id: 'autonomas', etiqueta: 'Planificación' },
  { id: 'investigacion', etiqueta: 'Investigación' },
  { id: 'podcast', etiqueta: 'Podcast' },
];

const aTexto = (valor: number | null) => (valor === null ? '' : String(valor));
const edicionDesdeTopes = (topes: Topes): Edicion => ({
  asistencia: aTexto(topes.asistencia), autonomas: aTexto(topes.autonomas),
  investigacion: aTexto(topes.investigacion), podcast: aTexto(topes.podcast), meta: String(topes.meta),
});

function avisoLocal(edicion: Edicion): string | null {
  const valores = TIPOS.map(tipo => edicion[tipo.id]);
  if (valores.some(valor => valor.trim() === '')) return null;
  const suma = valores.reduce((total, valor) => total + Number(valor), 0);
  const meta = Number(edicion.meta);
  if (!meta || suma === meta) return null;
  return suma < meta ? `Suman ${suma} h: faltan ${meta - suma} h para la meta.` : `Suman ${suma} h: solo contarán ${meta} h.`;
}

// Pestaña "Topes" de /vinculacion/horas. La sesión y el permiso los verifica la página contenedora
// y la API (puedeGestionarVinculacion) responde 403 si no corresponde.
export default function TopesHorasPanel() {
  const [filas, setFilas] = useState<FilaPasante[]>([]);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [ediciones, setEdiciones] = useState<Record<number, Edicion>>({});
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardandoId, setGuardandoId] = useState<number | null>(null);
  const [perfilLote, setPerfilLote] = useState('');

  const cargar = useCallback(async () => {
    const res = await fetch('/api/vinculacion/topes-horas');
    const data = await res.json();
    if (!data.success) { setMensaje(data.error || 'No se pudo cargar'); return; }
    setFilas(data.data);
    setPerfiles(data.perfiles);
    setEdiciones(Object.fromEntries(data.data.map((fila: FilaPasante) => [fila.id, edicionDesdeTopes(fila.topes)])));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (usuarioIds: number[], edicion: Edicion) => {
    setGuardandoId(usuarioIds.length === 1 ? usuarioIds[0] : -1);
    setMensaje('');
    try {
      const res = await fetch('/api/vinculacion/topes-horas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_ids: usuarioIds, topes: edicion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensaje(`✔ Guardado para ${data.actualizados} pasante(s).${data.aviso ? ` Aviso: ${data.aviso}` : ''}`);
      await cargar();
    } catch (error: any) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setGuardandoId(null);
    }
  };

  const aplicarPerfilALote = async () => {
    const perfil = perfiles.find(p => p.id === perfilLote);
    if (!perfil || seleccionados.length === 0) return;
    await guardar(seleccionados, edicionDesdeTopes(perfil.topes));
    setSeleccionados([]);
  };

  const cambiarCampo = (id: number, campo: keyof Edicion, valor: string) =>
    setEdiciones(previas => ({ ...previas, [id]: { ...previas[id], [campo]: valor } }));

  const hayCambios = (fila: FilaPasante) => {
    const original = edicionDesdeTopes(fila.topes);
    const actual = ediciones[fila.id];
    return !!actual && (Object.keys(original) as (keyof Edicion)[]).some(campo => original[campo] !== actual[campo]);
  };

  const filasVisibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return filas.filter(fila => !termino || `${fila.nombres} ${fila.apellidos} ${fila.email} ${fila.supervisores}`.toLowerCase().includes(termino));
  }, [filas, busqueda]);

  const alternarSeleccion = (id: number) =>
    setSeleccionados(previos => (previos.includes(id) ? previos.filter(x => x !== id) : [...previos, id]));

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        Edita el tope de horas de cada tipo de actividad. <strong>Vacío = sin tope propio</strong> (solo limita la meta);
        <strong> 0 = tipo no habilitado</strong> para ese pasante. Es un límite duro: no se puede registrar ni acreditar más allá del tope,
        y en informes nunca cuenta más que la meta.
      </p>

      {mensaje && <div className={`p-3 mb-4 rounded-md text-sm ${mensaje.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>{mensaje}</div>}

      <div className="bg-white p-4 rounded-xl shadow-sm mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Nombre, correo o supervisor" className="px-3 py-2 rounded-lg border border-gray-300 text-sm w-64" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Aplicar perfil a los seleccionados ({seleccionados.length})</label>
          <select value={perfilLote} onChange={e => setPerfilLote(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm">
            <option value="">Elegir perfil…</option>
            {perfiles.map(perfil => <option key={perfil.id} value={perfil.id}>{perfil.etiqueta}</option>)}
          </select>
        </div>
        <button
          onClick={aplicarPerfilALote}
          disabled={!perfilLote || seleccionados.length === 0 || guardandoId === -1}
          className="px-4 py-2 bg-uleam-blue text-white text-sm font-semibold rounded-lg disabled:opacity-40"
        >
          Aplicar a {seleccionados.length} pasante(s)
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-3 py-3 w-8">
                <input
                  type="checkbox"
                  checked={filasVisibles.length > 0 && filasVisibles.every(f => seleccionados.includes(f.id))}
                  onChange={e => setSeleccionados(e.target.checked ? filasVisibles.map(f => f.id) : [])}
                />
              </th>
              <th className="text-left px-3 py-3">Pasante</th>
              {TIPOS.map(tipo => <th key={tipo.id} className="px-2 py-3 text-center">{tipo.etiqueta}<span className="block text-xs font-normal text-gray-500">tope · aprobadas</span></th>)}
              <th className="px-2 py-3 text-center">Meta total</th>
              <th className="px-2 py-3 text-center">Cuentan</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filasVisibles.map(fila => {
              const edicion = ediciones[fila.id];
              if (!edicion) return null;
              const aviso = avisoLocal(edicion);
              return (
                <tr key={fila.id} className="border-t border-gray-100 align-top">
                  <td className="px-3 py-3"><input type="checkbox" checked={seleccionados.includes(fila.id)} onChange={() => alternarSeleccion(fila.id)} /></td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-800">{fila.nombres} {fila.apellidos}</div>
                    <div className="text-xs text-gray-500">{fila.supervisores || 'Sin supervisor'}</div>
                    {!fila.tieneTopePropio && <div className="text-xs text-gray-400">perfil por defecto</div>}
                    {aviso && <div className="text-xs text-amber-700 mt-1">⚠ {aviso}</div>}
                  </td>
                  {TIPOS.map(tipo => (
                    <td key={tipo.id} className="px-2 py-3 text-center">
                      <input
                        type="number" min="0" max="999" step="0.5"
                        value={edicion[tipo.id]}
                        placeholder="sin tope"
                        onChange={e => cambiarCampo(fila.id, tipo.id, e.target.value)}
                        className="w-20 px-2 py-1 rounded border border-gray-300 text-center"
                      />
                      <div className="text-xs text-gray-500 mt-1">{fila.aprobadas[tipo.id]} h</div>
                    </td>
                  ))}
                  <td className="px-2 py-3 text-center">
                    <input
                      type="number" min="1" max="999" step="1"
                      value={edicion.meta}
                      onChange={e => cambiarCampo(fila.id, 'meta', e.target.value)}
                      className="w-20 px-2 py-1 rounded border border-gray-300 text-center"
                    />
                  </td>
                  <td className="px-2 py-3 text-center font-semibold text-uleam-blue">{fila.contables.total} h</td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => guardar([fila.id], edicion)}
                      disabled={!hayCambios(fila) || guardandoId === fila.id}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg disabled:opacity-30"
                    >
                      Guardar
                    </button>
                  </td>
                </tr>
              );
            })}
            {filasVisibles.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-400">Sin pasantes.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
