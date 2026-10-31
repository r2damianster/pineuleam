'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';

type Estado = 'completo' | 'cumple' | 'en_riesgo' | 'no_cumple';

interface Flexible { registradas: number; tope: number }
interface RitmoTipo {
  tipo: 'asistencia' | 'podcast' | 'combinado';
  etiqueta: string;
  acumuladas: number;
  meta: number;
  horasPorSemana: number;
  proyeccion: number;
  deficit: number;
  horasPorSemanaRequeridas: number | null;
  estado: Estado;
  confianzaBaja: boolean;
}
interface FilaProyeccion {
  id: number;
  nombres: string;
  apellidos: string;
  supervisores: string;
  meta: number;
  acumuladas: number;
  pendientes: number;
  ritmo: RitmoTipo[];
  proyeccionRitmo: number;
  proyeccionTotal: number;
  deficitProyectado: number;
  horasFaltantes: number;
  flexibles: { autonomas: Flexible; investigacion: Flexible };
  flexiblesPorCumplir: number;
  diasTranscurridos: number;
  diasRestantes: number;
  estado: Estado;
  confianzaBaja: boolean;
  cupos: { tipo: string; etiqueta: string; cupo: number }[];
}
interface Periodo { id: number; nombre: string; fecha_inicio: string; fecha_fin: string }

type CampoOrden = 'proyeccionTotal' | 'proyeccionRitmo' | 'deficitProyectado' | 'acumuladas' | 'nombre';
const CAMPOS_ORDEN: { id: CampoOrden; etiqueta: string }[] = [
  { id: 'proyeccionTotal', etiqueta: 'Proyección total al cierre' },
  { id: 'proyeccionRitmo', etiqueta: 'Proyección de clubes + podcast' },
  { id: 'deficitProyectado', etiqueta: 'Déficit proyectado' },
  { id: 'acumuladas', etiqueta: 'Horas acumuladas totales' },
  { id: 'nombre', etiqueta: 'Nombre' },
];

const ETIQUETA_ESTADO: Record<Estado, { texto: string; clases: string }> = {
  completo: { texto: 'Completó la meta', clases: 'bg-green-100 text-green-800' },
  cumple: { texto: 'Cumple si mantiene el ritmo', clases: 'bg-emerald-100 text-emerald-800' },
  en_riesgo: { texto: 'En riesgo', clases: 'bg-amber-100 text-amber-800' },
  no_cumple: { texto: 'No cumple a este ritmo', clases: 'bg-red-100 text-red-800' },
};

const primerNombreSupervisores = (supervisores: string) =>
  supervisores
    ? supervisores.split(', ').filter(Boolean).map(nombreCompleto => nombreCompleto.split(' ')[0]).join(', ')
    : 'Sin supervisor';

// Verde: pocas horas faltantes; naranja: relativamente pocas; rojo: muchas.
const MAX_HORAS_FALTANTES_VERDE = 5;
const MAX_HORAS_FALTANTES_NARANJA = 15;
const clasesDeficit = (horasFaltantes: number) => {
  if (horasFaltantes <= MAX_HORAS_FALTANTES_VERDE) return 'bg-green-100 text-green-800';
  if (horasFaltantes <= MAX_HORAS_FALTANTES_NARANJA) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
};

function EstadoChip({ estado, deficit }: { estado: Estado; deficit: number }) {
  if ((estado === 'no_cumple' || estado === 'en_riesgo') && deficit > 0) {
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${clasesDeficit(deficit)}`}>Le faltarían {deficit} h</span>;
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ETIQUETA_ESTADO[estado].clases}`}>{ETIQUETA_ESTADO[estado].texto}</span>;
}

// Celda de un tipo de ritmo (clubes o podcast): se proyecta con el avance de ese tipo.
function CeldaRitmo({ item }: { item: RitmoTipo | undefined }) {
  if (!item) return <span className="text-xs text-gray-400">No habilitado</span>;
  return (
    <div>
      <div className="text-xs text-gray-500">{item.etiqueta}</div>
      <div>{item.acumuladas} / {item.meta} h</div>
      <div className="w-28 h-1.5 bg-gray-200 rounded mt-1">
        <div className="h-1.5 bg-blue-500 rounded" style={{ width: `${item.meta > 0 ? Math.min(100, (item.acumuladas / item.meta) * 100) : 100}%` }} />
      </div>
      <div className="text-xs text-gray-600 mt-1">{item.horasPorSemana} h/sem · proyecta {item.proyeccion} h</div>
      {item.horasPorSemanaRequeridas !== null && (
        <div className={`text-xs ${item.horasPorSemanaRequeridas > item.horasPorSemana ? 'text-red-700 font-medium' : 'text-gray-500'}`}>
          necesita {item.horasPorSemanaRequeridas} h/sem
        </div>
      )}
      <div className="mt-1"><EstadoChip estado={item.estado} deficit={item.deficit} /></div>
    </div>
  );
}

// Celda de un tipo cumplible por defecto (planificación o investigación): no se proyecta, se asume que se cumple.
function CeldaCumplible({ flexible }: { flexible: Flexible }) {
  return (
    <div>
      <div>{flexible.registradas} / {flexible.tope} h</div>
      <div className="text-xs text-gray-500">se asume cumplida</div>
    </div>
  );
}

// Pestaña "Proyección" de /vinculacion/horas. La sesión y el permiso los verifica la página contenedora
// y la API (puedeGestionarVinculacion) responde 403 si no corresponde.
export default function ProyeccionHorasPanel() {
  const [filas, setFilas] = useState<FilaProyeccion[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [periodoId, setPeriodoId] = useState<number | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<Estado | 'todos'>('todos');
  const [filtroSupervisor, setFiltroSupervisor] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [campoOrden, setCampoOrden] = useState<CampoOrden>('proyeccionTotal');
  const [ordenAscendente, setOrdenAscendente] = useState(true);
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback(async (periodoSolicitado?: number | null) => {
    const consulta = periodoSolicitado ? `?periodo_id=${periodoSolicitado}` : '';
    const res = await fetch(`/api/vinculacion/proyeccion-horas${consulta}`);
    const data = await res.json();
    if (!data.success) { setMensaje(data.error || 'No se pudo cargar'); return; }
    setMensaje('');
    setFilas(data.data);
    setPeriodos(data.periodos);
    setPeriodoId(data.periodo.id);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const periodoActual = periodos.find(periodo => periodo.id === periodoId);

  const conteos = useMemo(() => {
    const total: Record<Estado, number> = { no_cumple: 0, en_riesgo: 0, cumple: 0, completo: 0 };
    filas.forEach(fila => { total[fila.estado] += 1; });
    return total;
  }, [filas]);

  const supervisoresDisponibles = useMemo(() => {
    const nombres = new Set<string>();
    filas.forEach(fila => fila.supervisores.split(', ').filter(Boolean).forEach(nombre => nombres.add(nombre)));
    return Array.from(nombres).sort((a, b) => a.localeCompare(b));
  }, [filas]);

  const filasVisibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return filas
      .filter(fila => filtroEstado === 'todos' || fila.estado === filtroEstado)
      .filter(fila => !filtroSupervisor || fila.supervisores.split(', ').includes(filtroSupervisor))
      .filter(fila => !termino || `${fila.nombres} ${fila.apellidos} ${fila.supervisores}`.toLowerCase().includes(termino))
      .sort((a, b) => {
        const comparacion = campoOrden === 'nombre'
          ? `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`)
          : a[campoOrden] - b[campoOrden];
        return ordenAscendente ? comparacion : -comparacion;
      });
  }, [filas, filtroEstado, filtroSupervisor, busqueda, campoOrden, ordenAscendente]);

  return (
    <div>
      {mensaje && <div className="p-3 mb-2 rounded-md text-sm bg-red-50 text-red-700">{mensaje}</div>}

      <div className="flex flex-wrap items-end gap-4 mb-2">
        <label className="text-sm text-gray-700">
          Período
          <select value={periodoId ?? ''} onChange={evento => cargar(Number(evento.target.value))} className="block mt-1 border rounded-md px-2 py-1.5 bg-white">
            {periodos.map(periodo => <option key={periodo.id} value={periodo.id}>{periodo.nombre}</option>)}
          </select>
        </label>
        <label className="text-sm text-gray-700">
          Supervisor
          <select value={filtroSupervisor} onChange={evento => setFiltroSupervisor(evento.target.value)} className="block mt-1 border rounded-md px-2 py-1.5 bg-white">
            <option value="">Todos</option>
            {supervisoresDisponibles.map(nombre => <option key={nombre} value={nombre}>{nombre}</option>)}
          </select>
        </label>
        <label className="text-sm text-gray-700">
          Ordenar por
          <select value={campoOrden} onChange={evento => setCampoOrden(evento.target.value as CampoOrden)} className="block mt-1 border rounded-md px-2 py-1.5 bg-white">
            {CAMPOS_ORDEN.map(campo => <option key={campo.id} value={campo.id}>{campo.etiqueta}</option>)}
          </select>
        </label>
        <label className="text-sm text-gray-700">
          Sentido
          <select value={ordenAscendente ? 'asc' : 'desc'} onChange={evento => setOrdenAscendente(evento.target.value === 'asc')} className="block mt-1 border rounded-md px-2 py-1.5 bg-white">
            <option value="asc">Menor a mayor</option>
            <option value="desc">Mayor a menor</option>
          </select>
        </label>
        <input
          value={busqueda}
          onChange={evento => setBusqueda(evento.target.value)}
          placeholder="Buscar pasante o supervisor"
          className="border rounded-md px-3 py-1.5 text-sm w-64"
        />
        {periodoActual && (
          <span className="text-xs text-gray-500">
            {periodoActual.fecha_inicio} → {periodoActual.fecha_fin}
            {filas[0] && ` · día ${filas[0].diasTranscurridos}, faltan ${filas[0].diasRestantes}`}
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2 mb-2">
        <button onClick={() => setFiltroEstado('todos')} className={`px-3 py-1.5 rounded-lg border text-left bg-white flex items-baseline gap-2 ${filtroEstado === 'todos' ? 'ring-2 ring-blue-500' : ''}`}>
          <span className="text-lg font-bold text-gray-800">{filas.length}</span>
          <span className="text-xs text-gray-500">Pasantes</span>
        </button>
        {(['no_cumple', 'en_riesgo', 'cumple', 'completo'] as Estado[]).map(estado => (
          <button key={estado} onClick={() => setFiltroEstado(estado)} className={`px-3 py-1.5 rounded-lg border text-left bg-white flex items-baseline gap-2 ${filtroEstado === estado ? 'ring-2 ring-blue-500' : ''}`}>
            <span className="text-lg font-bold text-gray-800">{conteos[estado]}</span>
            <span className="text-xs text-gray-500">{ETIQUETA_ESTADO[estado].texto}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 text-left sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-3">Pasante<br /><span className="font-normal text-xs">supervisor · cupo por tipo</span></th>
              <th className="p-3">Clubes<br /><span className="font-normal text-xs">se proyecta por ritmo</span></th>
              <th className="p-3">Podcast<br /><span className="font-normal text-xs">se proyecta por ritmo</span></th>
              <th className="p-3">Planificación<br /><span className="font-normal text-xs">cumplible por defecto</span></th>
              <th className="p-3">Investigación<br /><span className="font-normal text-xs">cumplible por defecto</span></th>
              <th className="p-3">Proyección total<br /><span className="font-normal text-xs">hoy · al cierre / meta</span></th>
              <th className="p-3">Estado<br /><span className="font-normal text-xs">el peor entre clubes y podcast</span></th>
            </tr>
          </thead>
          <tbody>
            {filasVisibles.map(fila => {
              const combinado = fila.ritmo.find(item => item.tipo === 'combinado');
              return (
                <tr key={fila.id} className="border-t align-top">
                  <td className="p-3">
                    <div className="font-medium text-gray-800">{fila.nombres} {fila.apellidos}</div>
                    <div className="text-xs text-gray-500">{primerNombreSupervisores(fila.supervisores)}</div>
                    {fila.estado !== 'completo' && fila.cupos.length > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        {fila.cupos.map(item => <div key={item.tipo}>{item.etiqueta}: hasta {item.cupo} h</div>)}
                      </div>
                    )}
                    {fila.pendientes > 0 && <div className="text-xs text-amber-700 mt-1">+{fila.pendientes} h por aprobar</div>}
                  </td>
                  {combinado ? (
                    <td className="p-3" colSpan={2}>
                      <CeldaRitmo item={combinado} />
                      <div className="text-xs text-gray-400 mt-1">Sin tope propio en clubes ni podcast: se proyectan juntos.</div>
                    </td>
                  ) : (
                    <>
                      <td className="p-3"><CeldaRitmo item={fila.ritmo.find(item => item.tipo === 'asistencia')} /></td>
                      <td className="p-3"><CeldaRitmo item={fila.ritmo.find(item => item.tipo === 'podcast')} /></td>
                    </>
                  )}
                  <td className="p-3"><CeldaCumplible flexible={fila.flexibles.autonomas} /></td>
                  <td className="p-3"><CeldaCumplible flexible={fila.flexibles.investigacion} /></td>
                  <td className="p-3">
                    <div className="font-semibold">{fila.proyeccionTotal} / {fila.meta} h</div>
                    <div className="text-xs text-gray-500">hoy: {fila.acumuladas} h</div>
                  </td>
                  <td className="p-3">
                    <EstadoChip estado={fila.estado} deficit={fila.deficitProyectado} />
                    {fila.confianzaBaja && <div className="text-xs text-gray-400 mt-1">Pocos días de datos: tendencia poco fiable</div>}
                  </td>
                </tr>
              );
            })}
            {filasVisibles.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">Sin pasantes para este filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-500 mt-2 space-y-0.5">
        <p>
          <strong>Clubes y podcast</strong> se proyectan cada uno con su propio ritmo (horas aprobadas del período ÷ días transcurridos × días restantes)
          contra su tope. <strong>Planificación e investigación</strong> no se proyectan: se asume que se cumplen al 100 % de su tope
          (sin tope, solo cuenta lo ya aprobado). Solo cuentan horas aprobadas.
        </p>
        <p>
          Estado según el tipo de ritmo más atrasado: <strong>Cumple</strong> si la proyección alcanza la meta; si no, <em>le faltarían X h</em>:
          <span className="text-green-700 font-medium"> verde</span> (hasta {MAX_HORAS_FALTANTES_VERDE} h),
          <span className="text-orange-600 font-medium"> naranja</span> (hasta {MAX_HORAS_FALTANTES_NARANJA} h),
          <span className="text-red-700 font-medium"> rojo</span> (más de {MAX_HORAS_FALTANTES_NARANJA} h).
          Los topes se editan en la pestaña <strong>Topes</strong>.
        </p>
      </div>
    </div>
  );
}
