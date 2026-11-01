'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const ANIO_ACTUAL = new Date().getFullYear();
const periodoInicial = (() => {
  const ahora = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const mesActual = ahora.getUTCMonth() + 1;
  if (mesActual >= 4 && mesActual <= 8) return { anio: ahora.getUTCFullYear(), numero: 1 };
  if (mesActual >= 9) return { anio: ahora.getUTCFullYear(), numero: 2 };
  return { anio: ahora.getUTCFullYear() - 1, numero: 2 };
})();
const ANIOS_DISPONIBLES = Array.from({ length: 5 }, (_, indiceAnio) => String(ANIO_ACTUAL + 1 - indiceAnio));

function InformesVinculacionContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tipoQuery = searchParams.get('tipo'); // 'supervisor' | 'lider'

  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tab, setTab] = useState<'supervisor' | 'lider' | 'historial'>('supervisor');

  // Informe MENSUAL (adicional al semestral, Sesión 57) — sub-selector dentro de cada pestaña.
  // Por defecto el mes anterior (el que se informa al cerrar); se puede cambiar a mano.
  const ahoraEcuador = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const mesActualIso = new Date(Date.UTC(ahoraEcuador.getUTCFullYear(), ahoraEcuador.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  const [modoSupervisor, setModoSupervisor] = useState<'semestral' | 'mensual'>('mensual');
  const [modoLider, setModoLider] = useState<'semestral' | 'mensual'>('mensual');
  const [mesSupervisor, setMesSupervisor] = useState(mesActualIso);
  const [mesLider, setMesLider] = useState(mesActualIso);
  const [datosMensualSupervisor, setDatosMensualSupervisor] = useState<any>(null);
  const [datosMensualLider, setDatosMensualLider] = useState<any>(null);
  const [cargandoMensual, setCargandoMensual] = useState(false);

  const [usuario, setUsuario] = useState<any>(null);
  const [esLider, setEsLider] = useState(false);
  const [esSupervisor, setEsSupervisor] = useState(false);

  // Filtros
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [cicloId, setCicloId] = useState<string>('');
  const [numeroSupervisor, setNumeroSupervisor] = useState<string>(String(periodoInicial.numero));
  const [anioSupervisor, setAnioSupervisor] = useState<string>(String(periodoInicial.anio));
  const [numeroLider, setNumeroLider] = useState<string>(String(periodoInicial.numero));
  const [anioLider, setAnioLider] = useState<string>(String(periodoInicial.anio));

  // Datos de Informe
  const [datosSupervisor, setDatosSupervisor] = useState<any>(null);
  const [datosLider, setDatosLider] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);

  // Obstáculos CRUD (Supervisor)
  const [obstaculos, setObstaculos] = useState<any[]>([]);
  const [nuevoObsDesc, setNuevoObsDesc] = useState('');
  const [nuevoObsImpacto, setNuevoObsImpacto] = useState('medio');
  const [nuevoObsRecom, setNuevoObsRecom] = useState('');

  // Redacción con IA (Líder)
  const [redactandoClave, setRedactandoClave] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setUsuario(data.usuario);
        const lider = data.usuario.rol === 'admin' ||
          data.usuario.email === 'arturo.rodriguez@uleam.edu.ec' ||
          data.usuario.email === 'cintya.gamez@uleam.edu.ec' ||
          (Array.isArray(data.usuario.modulos_acceso) && data.usuario.modulos_acceso.includes('vinculacion_gestion'));
        
        const supervisor = lider || (Array.isArray(data.usuario.modulos_acceso) && data.usuario.modulos_acceso.includes('vinculacion'));
        setEsLider(lider);
        setEsSupervisor(supervisor);

        if (tipoQuery === 'lider' && lider) {
          setTab('lider');
        } else if (tipoQuery === 'supervisor') {
          setTab('supervisor');
        } else {
          setTab(lider ? 'lider' : 'supervisor');
        }
        setLoading(false);
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/informes'));
  }, [router, tipoQuery]);

  useEffect(() => {
    fetch('/api/proyectos/vinculacion/gestion?seccion=ficha')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.ciclos) {
          setCiclos(data.ciclos);
          if (data.ciclos.length > 0) setCicloId(String(data.ciclos[0].id));
        }
      })
      .catch(() => {});
  }, []);

  // Cargar datos al cambiar periodo/tab/ciclo
  useEffect(() => {
    if (!usuario) return;
    if (tab === 'supervisor') {
      setLoading(true);
      fetch(`/vinculacion/informes/api?accion=datos&tipo=supervisor&anio=${anioSupervisor}&numero=${numeroSupervisor}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) setDatosSupervisor(d.datos);
        })
        .finally(() => setLoading(false));

      fetch(`/vinculacion/informes/api?accion=obstaculos&anio=${anioSupervisor}&numero=${numeroSupervisor}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) setObstaculos(d.obstaculos || []);
        });
    } else if (tab === 'lider') {
      if (!esLider) return;
      setLoading(true);
      fetch(`/vinculacion/informes/api?accion=datos&tipo=lider&anio=${anioLider}&numero=${numeroLider}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) setDatosLider(d.datos);
        })
        .finally(() => setLoading(false));
    } else if (tab === 'historial') {
      setLoading(true);
      fetch('/vinculacion/informes/api?accion=historial')
        .then(r => r.json())
        .then(d => {
          if (d.success) setHistorial(d.historial || []);
        })
        .finally(() => setLoading(false));
    }
  }, [usuario, tab, anioSupervisor, numeroSupervisor, anioLider, numeroLider, esLider]);

  // Carga del informe MENSUAL (adicional al semestral) al elegir el sub-modo o cambiar de mes.
  useEffect(() => {
    if (!usuario) return;
    if (tab === 'supervisor' && modoSupervisor === 'mensual') {
      setCargandoMensual(true);
      fetch(`/vinculacion/informes/api?accion=datos&tipo=supervisor-mensual&mes=${mesSupervisor}`)
        .then(r => r.json())
        .then(d => { if (d.success) setDatosMensualSupervisor(d.datos); })
        .finally(() => setCargandoMensual(false));
    } else if (tab === 'lider' && modoLider === 'mensual' && esLider) {
      setCargandoMensual(true);
      fetch(`/vinculacion/informes/api?accion=datos&tipo=lider-mensual&mes=${mesLider}`)
        .then(r => r.json())
        .then(d => { if (d.success) setDatosMensualLider(d.datos); })
        .finally(() => setCargandoMensual(false));
    }
  }, [usuario, tab, modoSupervisor, modoLider, mesSupervisor, mesLider, esLider]);

  // Fecha de corte del periodo del supervisor (para los inputs "mes" de obstáculos/no-previstas
  // registrados a mano) — hoy si el periodo sigue en curso, o el cierre del periodo si ya pasó.
  const mesCorteSupervisor = datosSupervisor?.periodo?.hasta
    ? String(datosSupervisor.periodo.hasta).slice(0, 7)
    : new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 7);

  const agregarObstaculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoObsDesc.trim()) return;
    try {
      const res = await fetch('/vinculacion/informes/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'guardar-obstaculo',
          mes: mesCorteSupervisor,
          descripcion: nuevoObsDesc,
          impacto: nuevoObsImpacto,
          recomendacion: nuevoObsRecom,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setObstaculos([...obstaculos, d.obstaculo]);
      setNuevoObsDesc('');
      setNuevoObsRecom('');
    } catch (err: any) {
      alert(`Error al guardar obstáculo: ${err.message}`);
    }
  };

  const eliminarObstaculo = async (id: number) => {
    try {
      const res = await fetch(`/vinculacion/informes/api?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setObstaculos(obstaculos.filter(o => o.id !== id));
      }
    } catch (err: any) {
      alert(`Error al eliminar obstáculo: ${err.message}`);
    }
  };

  const generarInforme = async (tipo: 'supervisor' | 'lider') => {
    setGenerando(true);
    setMensaje('');
    try {
      const payloadDatos = tipo === 'supervisor'
        ? { ...datosSupervisor, obstaculos }
        : datosLider;

      const res = await fetch('/vinculacion/informes/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'generar',
          tipo,
          ciclo_id: (tipo === 'supervisor' ? datosSupervisor?.periodo?.cicloId : datosLider?.periodo?.cicloId) ?? null,
          datos: payloadDatos,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al generar informe');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const etiquetaArchivo = (tipo === 'supervisor' ? datosSupervisor?.periodo?.etiqueta : datosLider?.periodo?.etiqueta) || 'semestral';
      a.download = `Informe_${tipo}_${etiquetaArchivo}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMensaje('¡Informe .docx generado y descargado exitosamente!');
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setGenerando(false);
    }
  };

  const [redactandoMensual, setRedactandoMensual] = useState(false);
  const redactarMensualIA = async (cual: 'supervisor' | 'lider') => {
    const datos = cual === 'supervisor' ? datosMensualSupervisor : datosMensualLider;
    const setDatos = cual === 'supervisor' ? setDatosMensualSupervisor : setDatosMensualLider;
    if (!datos?.actividades?.length) return;
    setRedactandoMensual(true);
    try {
      const respuesta = await fetch('/vinculacion/informes/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'redactar-mensual', actividades: datos.actividades, observacionesActuales: datos.observaciones }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error);
      setDatos((previo: any) => ({ ...previo, actividades: resultado.actividades, observaciones: resultado.observaciones }));
    } catch (error: any) {
      setMensaje(`No se pudo redactar con IA: ${error.message}`);
    } finally {
      setRedactandoMensual(false);
    }
  };

  const generarInformeMensual = async (tipo: 'supervisor-mensual' | 'lider-mensual') => {
    setGenerando(true);
    setMensaje('');
    try {
      const datos = tipo === 'supervisor-mensual' ? datosMensualSupervisor : datosMensualLider;
      const res = await fetch('/vinculacion/informes/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'generar', tipo, datos }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al generar informe');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Informe_${tipo}_${datos?.mes || 'mes'}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMensaje('¡Informe .docx generado y descargado exitosamente!');
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setGenerando(false);
    }
  };

  const [redactandoTodo, setRedactandoTodo] = useState(false);
  const periodosSupervisorConIAIntentada = useRef<Set<string>>(new Set());
  const [nuevaNoPrevista, setNuevaNoPrevista] = useState({ tarea: '', avance: '100', alumnos: '0', productos_sociales: '', productos_academicos: '', observaciones: '' });

  const actualizarTarea = (indiceTarea: number, cambios: Record<string, string>) => {
    setDatosSupervisor((previo: any) => ({
      ...previo,
      tareas: previo.tareas.map((tarea: any, indice: number) => (indice === indiceTarea ? { ...tarea, ...cambios } : tarea)),
    }));
  };

  const actualizarNoPrevista = (indiceActividad: number, cambios: Record<string, string>) => {
    setDatosSupervisor((previo: any) => ({
      ...previo,
      no_previstas: previo.no_previstas.map((actividad: any, indice: number) => (indice === indiceActividad ? { ...actividad, ...cambios } : actividad)),
    }));
  };

  // IA en un solo paso: productos de todas las tareas y obstáculos (de las observaciones existentes o inferidos).
  const redactarTodoIA = async (forzar: boolean) => {
    setRedactandoTodo(true);
    try {
      const respuesta = await fetch('/vinculacion/informes/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'redactar-todo', anio: Number(anioSupervisor), numero: Number(numeroSupervisor), forzar }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error);
      setDatosSupervisor((previo: any) => ({
        ...previo,
        tareas: previo.tareas.map((tarea: any) => {
          const redactada = (resultado.tareas || []).find((item: any) => item.codigo === tarea.codigo);
          if (!redactada) return tarea;
          return {
            ...tarea,
            productos_sociales: forzar || !tarea.productos_sociales ? redactada.productos_sociales : tarea.productos_sociales,
            productos_academicos: forzar || !tarea.productos_academicos ? redactada.productos_academicos : tarea.productos_academicos,
          };
        }),
        no_previstas: (previo.no_previstas || []).map((actividad: any) => {
          const redactada = (resultado.noPrevistas || []).find((item: any) => item.tarea === actividad.tarea);
          if (!redactada) return actividad;
          return {
            ...actividad,
            productos_sociales: forzar || !actividad.productos_sociales ? redactada.productos_sociales : actividad.productos_sociales,
            productos_academicos: forzar || !actividad.productos_academicos ? redactada.productos_academicos : actividad.productos_academicos,
          };
        }),
      }));
      if (resultado.obstaculos?.length) setObstaculos(forzar ? resultado.obstaculos : previos => [...previos, ...resultado.obstaculos]);
    } catch (error: any) {
      setMensaje(`No se pudieron redactar los borradores con IA: ${error.message}`);
    } finally {
      setRedactandoTodo(false);
    }
  };

  // Al abrir un periodo, los borradores se generan solos (una sola vez por periodo) para no hacer clic en cada cuadro.
  useEffect(() => {
    const clavePeriodoSupervisor = `${anioSupervisor}-${numeroSupervisor}`;
    if (tab !== 'supervisor' || !datosSupervisor?.periodo || periodosSupervisorConIAIntentada.current.has(clavePeriodoSupervisor)) return;
    periodosSupervisorConIAIntentada.current.add(clavePeriodoSupervisor);
    redactarTodoIA(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, anioSupervisor, numeroSupervisor, datosSupervisor?.periodo?.etiqueta]);

  const agregarNoPrevista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaNoPrevista.tarea.trim()) return;
    try {
      const respuesta = await fetch('/vinculacion/informes/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'guardar-no-prevista', mes: mesCorteSupervisor, ...nuevaNoPrevista }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error);
      setDatosSupervisor((previo: any) => ({ ...previo, no_previstas: [...(previo.no_previstas || []), resultado.actividad] }));
      setNuevaNoPrevista({ tarea: '', avance: '100', alumnos: '0', productos_sociales: '', productos_academicos: '', observaciones: '' });
    } catch (error: any) {
      alert(`Error al guardar la actividad: ${error.message}`);
    }
  };

  const eliminarNoPrevista = async (id: number) => {
    const respuesta = await fetch(`/vinculacion/informes/api?id=${id}&tipo=no-prevista`, { method: 'DELETE' });
    if (respuesta.ok) {
      setDatosSupervisor((previo: any) => ({ ...previo, no_previstas: previo.no_previstas.filter((actividad: any) => actividad.id !== id) }));
    }
  };

  const [redactandoLider, setRedactandoLider] = useState(false);
  const periodosConIAIntentada = useRef<Set<string>>(new Set());

  const actualizarProblemaLider = (indiceProblema: number, campo: string, valor: string) => {
    setDatosLider((previo: any) => ({
      ...previo,
      problemaResultados: previo.problemaResultados.map((problema: any, indice: number) => (indice === indiceProblema ? { ...problema, [campo]: valor } : problema)),
    }));
  };

  // IA en un solo paso para todos los cuadros del informe del líder.
  const redactarLiderIA = async (forzar: boolean) => {
    setRedactandoLider(true);
    try {
      const respuesta = await fetch('/vinculacion/informes/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'redactar-lider', anio: Number(anioLider), numero: Number(numeroLider), forzar }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error);
      setDatosLider((previo: any) => ({ ...previo, textos: { ...previo.textos, ...resultado.textos }, problemaResultados: resultado.problemaResultados }));
    } catch (error: any) {
      setMensaje(`No se pudieron redactar los textos con IA: ${error.message}`);
    } finally {
      setRedactandoLider(false);
    }
  };

  const guardarTextosLider = async () => {
    try {
      const respuesta = await fetch('/vinculacion/informes/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'guardar-textos-lider', ciclo_id: datosLider?.periodo?.cicloId, textos: datosLider?.textos, problemaResultados: datosLider?.problemaResultados }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error);
      setMensaje('Textos guardados: se reutilizarán la próxima vez que abras este periodo.');
    } catch (error: any) {
      setMensaje(`Error al guardar los textos: ${error.message}`);
    }
  };

  // Al abrir un periodo, los textos se redactan solos (una vez por periodo) si aún no existen.
  useEffect(() => {
    const clavePeriodo = `${anioLider}-${numeroLider}`;
    if (tab !== 'lider' || !datosLider?.periodo || periodosConIAIntentada.current.has(clavePeriodo)) return;
    periodosConIAIntentada.current.add(clavePeriodo);
    redactarLiderIA(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, anioLider, numeroLider, datosLider?.periodo?.etiqueta]);


  if (loading && !datosSupervisor && !datosLider) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando informes de vinculación...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/portal/dashboard" className="text-blue-600 hover:underline font-medium text-sm">
            &larr; Volver al Portal PINE
          </Link>
          <span className="text-xs bg-blue-100 text-uleam-blue font-bold px-3 py-1 rounded-full">
            Informes Oficiales ULEAM
          </span>
        </div>

        <h1 className="text-3xl font-bold text-uleam-blue mb-2">
          {tab === 'supervisor'
            ? (modoSupervisor === 'mensual' ? 'Informe Mensual del Supervisor' : 'Informe Semestral de Seguimiento (Supervisor)')
            : tab === 'lider'
            ? (modoLider === 'mensual' ? 'Informe Mensual del Líder' : 'Informe Semestral de Avances y Logros (Líder)')
            : 'Historial de Informes Descargables'}
        </h1>
        <p className="text-gray-600 text-sm mb-6">
          Genera el formato oficial en Word (.docx) con indicadores agregados desde la base de datos Neon.
        </p>

        {mensaje && (
          <div className={`p-4 mb-6 rounded-lg font-medium text-sm ${mensaje.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {mensaje}
          </div>
        )}

        {/* Pestañas de navegación */}
        <div className="flex border-b border-gray-300 mb-6 space-x-4">
          {(!tipoQuery || tipoQuery === 'supervisor') && (
            <button
              onClick={() => setTab('supervisor')}
              className={`pb-3 px-2 font-semibold text-sm border-b-2 transition-colors ${tab === 'supervisor' ? 'border-uleam-blue text-uleam-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              📋 Informe Semestral Supervisor
            </button>
          )}
          {esLider && (!tipoQuery || tipoQuery === 'lider') && (
            <button
              onClick={() => setTab('lider')}
              className={`pb-3 px-2 font-semibold text-sm border-b-2 transition-colors ${tab === 'lider' ? 'border-uleam-blue text-uleam-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              📊 Informe Semestral Líder
            </button>
          )}
          <button
            onClick={() => setTab('historial')}
            className={`pb-3 px-2 font-semibold text-sm border-b-2 transition-colors ${tab === 'historial' ? 'border-uleam-blue text-uleam-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            📁 Historial de Descargas
          </button>
        </div>

        {/* CONTENIDO TAB SUPERVISOR */}
        {tab === 'supervisor' && (modoSupervisor === 'mensual' || datosSupervisor) && (
          <div className="space-y-6">
            <div className="flex gap-2">
              <button type="button" onClick={() => setModoSupervisor('mensual')} className={`px-4 py-1.5 rounded-full text-xs font-bold border ${modoSupervisor === 'mensual' ? 'bg-uleam-blue text-white border-uleam-blue' : 'bg-white text-gray-600 border-gray-300'}`}>Mensual</button>
              <button type="button" onClick={() => setModoSupervisor('semestral')} className={`px-4 py-1.5 rounded-full text-xs font-bold border ${modoSupervisor === 'semestral' ? 'bg-uleam-blue text-white border-uleam-blue' : 'bg-white text-gray-600 border-gray-300'}`}>Semestral</button>
            </div>

            {modoSupervisor === 'mensual' ? (
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Mes del informe</label>
                    <input type="month" value={mesSupervisor} onChange={e => setMesSupervisor(e.target.value)} className="px-3 py-2 border rounded-lg text-sm font-semibold text-gray-800 focus:outline-none focus:border-uleam-blue" />
                  </div>
                  <button
                    onClick={() => generarInformeMensual('supervisor-mensual')}
                    disabled={generando || !datosMensualSupervisor}
                    className="px-6 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 shadow transition disabled:opacity-50"
                  >
                    {generando ? 'Generando Documento...' : 'Descargar Informe Mensual .docx'}
                  </button>
                </div>
                {cargandoMensual && <p className="text-sm text-gray-500">Cargando datos del mes…</p>}
                {datosMensualSupervisor && (
                  <>
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                      <h2 className="text-lg font-bold text-uleam-blue mb-4">2.2 Beneficiarios por Espacio — {datosMensualSupervisor.etiquetaMes}</h2>
                      {datosMensualSupervisor.espacios.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No tienes espacios asignados.</p>
                      ) : (
                        <table className="w-full text-sm text-left border-collapse">
                          <thead><tr className="bg-gray-100 text-gray-700 font-bold border-b"><th className="p-2">Espacio</th><th className="p-2">Total</th><th className="p-2">Mujeres</th><th className="p-2">Hombres</th><th className="p-2">Zona</th></tr></thead>
                          <tbody>
                            {datosMensualSupervisor.espacios.map((espacio: any) => (
                              <tr key={espacio.id} className="border-b">
                                <td className="p-2 font-semibold">{espacio.nombre}</td>
                                <td className="p-2">{espacio.total}{espacio.esAudiencia && <span className="text-xs text-gray-500"> (audiencia)</span>}</td>
                                <td className="p-2">{espacio.esAudiencia ? '—' : espacio.mujeres}</td>
                                <td className="p-2">{espacio.esAudiencia ? '—' : espacio.hombres}</td>
                                <td className="p-2 text-xs text-gray-500">{espacio.zona.canton ? `${espacio.zona.canton} · ${espacio.zona.barrio}` : <span className="text-amber-600">Sin zona (completar en Espacios)</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      <p className="text-sm font-semibold text-gray-700 mt-3">Total de beneficiarios: {datosMensualSupervisor.general.total_beneficiarios}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                      <h2 className="text-lg font-bold text-uleam-blue mb-4">Horas de los Pasantes — {datosMensualSupervisor.etiquetaMes}</h2>
                      {(!datosMensualSupervisor.pasantes || datosMensualSupervisor.pasantes.length === 0) ? (
                        <p className="text-sm text-gray-500 italic">No hay pasantes asignados a tus espacios.</p>
                      ) : (
                        <table className="w-full text-sm text-left border-collapse">
                          <thead><tr className="bg-gray-100 text-gray-700 font-bold border-b"><th className="p-2">Espacio</th><th className="p-2">Estudiante</th><th className="p-2">Horas del mes</th><th className="p-2">Pendiente</th></tr></thead>
                          <tbody>
                            {datosMensualSupervisor.pasantes.map((pasante: any, indice: number) => (
                              <tr key={indice} className="border-b">
                                <td className="p-2">{pasante.espacio_nombre}</td>
                                <td className="p-2 font-semibold">{pasante.estudiante_nombre}</td>
                                <td className="p-2">{pasante.horas_mes} h</td>
                                <td className="p-2">
                                  {pasante.pendientes > 0 ? (
                                    <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                      ⚠ {pasante.pendientes} por aprobar
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <h2 className="text-lg font-bold text-uleam-blue">2.1 Desarrollo de Actividades</h2>
                        <button
                          type="button"
                          onClick={() => redactarMensualIA('supervisor')}
                          disabled={redactandoMensual || !datosMensualSupervisor.actividades?.length}
                          className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-bold hover:bg-purple-100 disabled:opacity-50"
                        >
                          {redactandoMensual ? 'Redactando con IA...' : '✨ Redactar con IA'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">Detectadas automáticamente de sesiones y eventos aprobados del mes. Edita, completa o pide a la IA que pula la redacción.</p>
                      <textarea
                        rows={6}
                        value={(datosMensualSupervisor.actividades || []).join('\n')}
                        onChange={e => setDatosMensualSupervisor((previo: any) => ({ ...previo, actividades: e.target.value.split('\n').filter(Boolean) }))}
                        className="w-full p-3 border rounded-lg text-sm"
                        placeholder="Una actividad por línea…"
                      />
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                      <h2 className="text-lg font-bold text-uleam-blue mb-2">Observaciones</h2>
                      <textarea
                        rows={3}
                        value={datosMensualSupervisor.observaciones || ''}
                        onChange={e => setDatosMensualSupervisor((previo: any) => ({ ...previo, observaciones: e.target.value }))}
                        className="w-full p-3 border rounded-lg text-sm"
                        placeholder="Ninguna."
                      />
                      <p className="text-xs text-gray-500 mt-3">Evidencias: {datosMensualSupervisor.evidencias?.length || 0} foto(s) de sesiones aprobadas del mes.</p>
                    </div>
                  </>
                )}
              </div>
            ) : datosSupervisor ? (
            <>
            <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Periodo del informe semestral</label>
                <div className="flex gap-2">
                  <select
                    value={numeroSupervisor}
                    onChange={e => setNumeroSupervisor(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm font-semibold text-gray-800 focus:outline-none focus:border-uleam-blue"
                  >
                    <option value="1">Periodo 1 (abril – agosto)</option>
                    <option value="2">Periodo 2 (septiembre – diciembre)</option>
                  </select>
                  <select
                    value={anioSupervisor}
                    onChange={e => setAnioSupervisor(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm font-semibold text-gray-800 focus:outline-none focus:border-uleam-blue"
                  >
                    {ANIOS_DISPONIBLES.map(anio => (
                      <option key={anio} value={anio}>{anio}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={() => generarInforme('supervisor')}
                disabled={generando}
                className="px-6 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 shadow transition disabled:opacity-50"
              >
                {generando ? 'Generando Documento...' : 'Descargar Informe Semestral .docx'}
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-lg font-bold text-uleam-blue mb-4">1. Resumen General — {datosSupervisor.periodo?.etiquetaPeriodo} (corte a {datosSupervisor.general?.mes})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-uleam-blue">{datosSupervisor.general?.total_pasantes || 0}</div>
                  <div className="text-xs font-semibold text-gray-600">Pasantes Supervisados</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{datosSupervisor.general?.total_beneficiarios || 0}</div>
                  <div className="text-xs font-semibold text-gray-600">Beneficiarios Atendidos</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-amber-700">{datosSupervisor.general?.total_sesiones || 0}</div>
                  <div className="text-xs font-semibold text-gray-600">Sesiones Aprobadas</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">{datosSupervisor.general?.espacios?.length || 0}</div>
                  <div className="text-xs font-semibold text-gray-600">Espacios de Enseñanza</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <h2 className="text-lg font-bold text-uleam-blue">2. Tareas del Proyecto — {datosSupervisor.periodo?.etiquetaPeriodo}</h2>
                <button
                  type="button"
                  onClick={() => redactarTodoIA(true)}
                  disabled={redactandoTodo}
                  className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-bold hover:bg-purple-100 disabled:opacity-50"
                >
                  {redactandoTodo ? 'Redactando con IA...' : '✨ Regenerar todos los borradores con IA'}
                </button>
              </div>
              {redactandoTodo && <p className="text-xs text-purple-700 mb-2">La IA está redactando los productos y obstáculos del periodo…</p>}
              <p className="text-xs text-gray-500 mb-4">
                Avance calculado con tus registros aprobados frente a la meta de cada tarea. Las tareas sin registros aprobados no se listan en la sección 2.2 del documento, pero sí aparecen en el cronograma.
              </p>
              {!datosSupervisor.tareas || datosSupervisor.tareas.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay tareas planificadas cargadas para este periodo. El líder las define en Proyecto de Vinculación.</p>
              ) : (
                <div className="space-y-4">
                  {datosSupervisor.tareas.map((tarea: any, indiceTarea: number) => (
                    <div key={tarea.codigo || indiceTarea} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="font-semibold text-gray-800 text-sm">{tarea.codigo} {tarea.nombre}</div>
                        <div className="text-sm font-bold text-uleam-blue">{tarea.avance != null ? `${tarea.avance}%` : 'Sin cálculo'}</div>
                      </div>
                      <div className="w-full bg-gray-200 rounded h-2 my-2">
                        <div className="bg-uleam-blue h-2 rounded" style={{ width: `${tarea.avance ?? 0}%` }} />
                      </div>
                      <p className="text-xs text-gray-600">
                        Realizado: <strong>{tarea.realizado ?? 0}</strong> de <strong>{tarea.meta ?? '—'}</strong> {tarea.unidad} · Estudiantes participantes: <strong>{tarea.alumnos}</strong>
                        {tarea.observaciones ? ` · ${tarea.observaciones}` : ''}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Productos obtenidos (fines sociales)</label>
                          <textarea rows={3} value={tarea.productos_sociales || ''} onChange={e => actualizarTarea(indiceTarea, { productos_sociales: e.target.value })} className="w-full p-2 border rounded text-xs" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Productos obtenidos (fines académicos)</label>
                          <textarea rows={3} value={tarea.productos_academicos || ''} onChange={e => actualizarTarea(indiceTarea, { productos_academicos: e.target.value })} className="w-full p-2 border rounded text-xs" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-bold text-gray-700 mb-1">2.3 Actividades no previstas inicialmente</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Se incluyen solas las sesiones aprobadas en espacios de categoría «otro». Aquí puedes agregar las que se incorporaron durante la ejecución del proyecto.
                </p>
                {datosSupervisor.no_previstas?.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {datosSupervisor.no_previstas.map((actividad: any, indiceActividad: number) => (
                      <div key={actividad.id ?? `auto-${indiceActividad}`} className="bg-gray-50 border rounded p-2 space-y-2">
                        <div className="flex items-start justify-between gap-2 text-xs text-gray-700">
                          <span><strong>{actividad.tarea}</strong> · {actividad.avance}% · {actividad.alumnos} estudiante(s){actividad.observaciones ? ` · ${actividad.observaciones}` : ''}</span>
                          {actividad.manual && <button type="button" onClick={() => eliminarNoPrevista(actividad.id)} className="text-red-600 hover:underline shrink-0">Eliminar</button>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Productos (fines sociales)</label>
                            <textarea rows={2} value={actividad.productos_sociales || ''} onChange={e => actualizarNoPrevista(indiceActividad, { productos_sociales: e.target.value })} className="w-full p-1.5 border rounded text-xs" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Productos (fines académicos)</label>
                            <textarea rows={2} value={actividad.productos_academicos || ''} onChange={e => actualizarNoPrevista(indiceActividad, { productos_academicos: e.target.value })} className="w-full p-1.5 border rounded text-xs" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={agregarNoPrevista} className="bg-gray-50 p-3 rounded-lg border space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input required placeholder="Tarea / actividad no prevista" value={nuevaNoPrevista.tarea} onChange={e => setNuevaNoPrevista({ ...nuevaNoPrevista, tarea: e.target.value })} className="sm:col-span-1 px-2 py-1.5 border rounded text-xs" />
                    <input type="number" min="0" max="100" placeholder="Avance %" value={nuevaNoPrevista.avance} onChange={e => setNuevaNoPrevista({ ...nuevaNoPrevista, avance: e.target.value })} className="px-2 py-1.5 border rounded text-xs" />
                    <input type="number" min="0" placeholder="No. alumnos" value={nuevaNoPrevista.alumnos} onChange={e => setNuevaNoPrevista({ ...nuevaNoPrevista, alumnos: e.target.value })} className="px-2 py-1.5 border rounded text-xs" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input placeholder="Productos (fines sociales)" value={nuevaNoPrevista.productos_sociales} onChange={e => setNuevaNoPrevista({ ...nuevaNoPrevista, productos_sociales: e.target.value })} className="px-2 py-1.5 border rounded text-xs" />
                    <input placeholder="Productos (fines académicos)" value={nuevaNoPrevista.productos_academicos} onChange={e => setNuevaNoPrevista({ ...nuevaNoPrevista, productos_academicos: e.target.value })} className="px-2 py-1.5 border rounded text-xs" />
                    <input placeholder="Observaciones" value={nuevaNoPrevista.observaciones} onChange={e => setNuevaNoPrevista({ ...nuevaNoPrevista, observaciones: e.target.value })} className="px-2 py-1.5 border rounded text-xs" />
                  </div>
                  <button type="submit" className="px-3 py-1.5 bg-uleam-blue text-white text-xs font-bold rounded hover:opacity-90">+ Agregar actividad no prevista</button>
                </form>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Adjuntos: {datosSupervisor.fotos?.length || 0} foto(s) de sesiones aprobadas del periodo, elegidas al azar (una por espacio primero) con leyenda de espacio y fecha.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-lg font-bold text-uleam-blue mb-3">3. Registro de Obstáculos y Dificultades</h2>
              <form onSubmit={agregarObstaculo} className="bg-gray-50 p-4 rounded-lg border mb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-1">Descripción del Obstáculo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Inasistencia por lluvias en sector..."
                      value={nuevoObsDesc}
                      onChange={e => setNuevoObsDesc(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Nivel de Impacto</label>
                    <select
                      value={nuevoObsImpacto}
                      onChange={e => setNuevoObsImpacto(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="bajo">Bajo</option>
                      <option value="medio">Medio</option>
                      <option value="alto">Alto</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Medida Correctiva / Recomendación</label>
                  <input
                    type="text"
                    placeholder="Ej. Reprogramación de clases virtuales..."
                    value={nuevoObsRecom}
                    onChange={e => setNuevoObsRecom(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <button type="submit" className="px-4 py-2 bg-uleam-blue text-white text-xs font-bold rounded-lg hover:opacity-90">
                  + Registrar Obstáculo
                </button>
              </form>

              {obstaculos.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay obstáculos registrados para este periodo.</p>
              ) : (
                <div className="space-y-2">
                  {obstaculos.map((o: any) => (
                    <div key={o.id} className="p-3 bg-gray-50 rounded-lg border flex justify-between items-center text-sm">
                      <div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded mr-2 ${o.impacto === 'alto' ? 'bg-red-100 text-red-700' : o.impacto === 'medio' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-700'}`}>
                          {o.impacto.toUpperCase()}
                        </span>
                        <span className="font-semibold text-gray-800">{o.descripcion}</span>
                        {o.recomendacion && <p className="text-xs text-gray-600 mt-1">Recomendación: {o.recomendacion}</p>}
                      </div>
                      <button onClick={() => eliminarObstaculo(o.id)} className="text-xs text-red-600 hover:underline">
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </>
            ) : null}
          </div>
        )}

        {/* CONTENIDO TAB LÍDER */}
        {tab === 'lider' && esLider && (modoLider === 'mensual' || datosLider) && (
          <div className="space-y-6">
            <div className="flex gap-2">
              <button type="button" onClick={() => setModoLider('mensual')} className={`px-4 py-1.5 rounded-full text-xs font-bold border ${modoLider === 'mensual' ? 'bg-uleam-blue text-white border-uleam-blue' : 'bg-white text-gray-600 border-gray-300'}`}>Mensual</button>
              <button type="button" onClick={() => setModoLider('semestral')} className={`px-4 py-1.5 rounded-full text-xs font-bold border ${modoLider === 'semestral' ? 'bg-uleam-blue text-white border-uleam-blue' : 'bg-white text-gray-600 border-gray-300'}`}>Semestral</button>
            </div>

            {modoLider === 'mensual' ? (
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Mes del informe</label>
                    <input type="month" value={mesLider} onChange={e => setMesLider(e.target.value)} className="px-3 py-2 border rounded-lg text-sm font-semibold text-gray-800 focus:outline-none focus:border-uleam-blue" />
                  </div>
                  <button
                    onClick={() => generarInformeMensual('lider-mensual')}
                    disabled={generando || !datosMensualLider}
                    className="px-6 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 shadow transition disabled:opacity-50"
                  >
                    {generando ? 'Generando Documento...' : 'Descargar Informe Mensual .docx'}
                  </button>
                </div>
                {cargandoMensual && <p className="text-sm text-gray-500">Cargando datos del mes…</p>}
                {datosMensualLider && (
                  <>
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                      <h2 className="text-lg font-bold text-uleam-blue mb-4">2.2 Beneficiarios por Espacio — {datosMensualLider.etiquetaMes}</h2>
                      {datosMensualLider.espacios.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No hay espacios de Vinculación registrados.</p>
                      ) : (
                        <table className="w-full text-sm text-left border-collapse">
                          <thead><tr className="bg-gray-100 text-gray-700 font-bold border-b"><th className="p-2">Espacio</th><th className="p-2">Total</th><th className="p-2">Mujeres</th><th className="p-2">Hombres</th><th className="p-2">Zona</th></tr></thead>
                          <tbody>
                            {datosMensualLider.espacios.map((espacio: any) => (
                              <tr key={espacio.id} className="border-b">
                                <td className="p-2 font-semibold">{espacio.nombre}</td>
                                <td className="p-2">{espacio.total}{espacio.esAudiencia && <span className="text-xs text-gray-500"> (audiencia)</span>}</td>
                                <td className="p-2">{espacio.esAudiencia ? '—' : espacio.mujeres}</td>
                                <td className="p-2">{espacio.esAudiencia ? '—' : espacio.hombres}</td>
                                <td className="p-2 text-xs text-gray-500">{espacio.zona.canton ? `${espacio.zona.canton} · ${espacio.zona.barrio}` : <span className="text-amber-600">Sin zona (completar en Espacios)</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      <p className="text-sm font-semibold text-gray-700 mt-3">Total de beneficiarios: {datosMensualLider.general.total_beneficiarios}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                      <h2 className="text-lg font-bold text-uleam-blue mb-4">Horas de los Pasantes — {datosMensualLider.etiquetaMes}</h2>
                      {(!datosMensualLider.pasantes || datosMensualLider.pasantes.length === 0) ? (
                        <p className="text-sm text-gray-500 italic">No hay pasantes asignados.</p>
                      ) : (
                        <table className="w-full text-sm text-left border-collapse">
                          <thead><tr className="bg-gray-100 text-gray-700 font-bold border-b"><th className="p-2">Espacio</th><th className="p-2">Supervisor</th><th className="p-2">Estudiante</th><th className="p-2">Horas del mes</th><th className="p-2">Pendiente</th></tr></thead>
                          <tbody>
                            {datosMensualLider.pasantes.map((pasante: any, indice: number) => (
                              <tr key={indice} className="border-b">
                                <td className="p-2">{pasante.espacio_nombre}</td>
                                <td className="p-2 text-xs text-gray-500">{pasante.supervisor_nombre}</td>
                                <td className="p-2 font-semibold">{pasante.estudiante_nombre}</td>
                                <td className="p-2">{pasante.horas_mes} h</td>
                                <td className="p-2">
                                  {pasante.pendientes > 0 ? (
                                    <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                      ⚠ {pasante.pendientes} por aprobar
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <h2 className="text-lg font-bold text-uleam-blue">2.1 Desarrollo de Actividades</h2>
                        <button
                          type="button"
                          onClick={() => redactarMensualIA('lider')}
                          disabled={redactandoMensual || !datosMensualLider.actividades?.length}
                          className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-bold hover:bg-purple-100 disabled:opacity-50"
                        >
                          {redactandoMensual ? 'Redactando con IA...' : '✨ Redactar con IA'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">Detectadas automáticamente de sesiones y eventos aprobados del mes en todo el proyecto. Edita, completa o pide a la IA que pula la redacción.</p>
                      <textarea
                        rows={6}
                        value={(datosMensualLider.actividades || []).join('\n')}
                        onChange={e => setDatosMensualLider((previo: any) => ({ ...previo, actividades: e.target.value.split('\n').filter(Boolean) }))}
                        className="w-full p-3 border rounded-lg text-sm"
                        placeholder="Una actividad por línea…"
                      />
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                      <h2 className="text-lg font-bold text-uleam-blue mb-2">Observaciones</h2>
                      <textarea
                        rows={3}
                        value={datosMensualLider.observaciones || ''}
                        onChange={e => setDatosMensualLider((previo: any) => ({ ...previo, observaciones: e.target.value }))}
                        className="w-full p-3 border rounded-lg text-sm"
                        placeholder="Ninguna."
                      />
                      <p className="text-xs text-gray-500 mt-3">Evidencias: {datosMensualLider.evidencias?.length || 0} foto(s) de sesiones aprobadas del mes.</p>
                    </div>
                  </>
                )}
              </div>
            ) : datosLider ? (
            <>
            <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Periodo del informe semestral</label>
                <div className="flex gap-2">
                  <select
                    value={numeroLider}
                    onChange={e => setNumeroLider(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm font-semibold text-gray-800 focus:outline-none focus:border-uleam-blue"
                  >
                    <option value="1">Periodo 1 (abril – agosto)</option>
                    <option value="2">Periodo 2 (septiembre – diciembre)</option>
                  </select>
                  <select
                    value={anioLider}
                    onChange={e => setAnioLider(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm font-semibold text-gray-800 focus:outline-none focus:border-uleam-blue"
                  >
                    {ANIOS_DISPONIBLES.map(anio => (
                      <option key={anio} value={anio}>{anio}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => redactarLiderIA(true)}
                  disabled={redactandoLider}
                  className="px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-100 disabled:opacity-50"
                >
                  {redactandoLider ? 'Redactando con IA...' : '✨ Regenerar textos con IA'}
                </button>
                <button
                  type="button"
                  onClick={guardarTextosLider}
                  className="px-3 py-2 bg-gray-100 text-gray-800 border rounded-lg text-xs font-bold hover:bg-gray-200"
                >
                  Guardar textos
                </button>
                <button
                  onClick={() => generarInforme('lider')}
                  disabled={generando}
                  className="px-6 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 shadow transition disabled:opacity-50"
                >
                  {generando ? 'Generando Documento...' : 'Descargar Informe Semestral .docx'}
                </button>
              </div>
            </div>
            {redactandoLider && <p className="text-xs text-purple-700">La IA está redactando los textos del informe…</p>}

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-lg font-bold text-uleam-blue mb-1">Avance del proyecto — {datosLider.periodo?.etiquetaLarga}</h2>
              <p className="text-xs text-gray-500 mb-4">Suma de lo aprobado de todos los supervisores, con corte al {datosLider.periodo?.hasta}.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
                <div className="bg-blue-50 p-3 rounded-lg"><div className="text-xl font-bold text-uleam-blue">{datosLider.participacion?.estudiantes?.ejecutados ?? 0}</div><div className="text-xs font-semibold text-gray-600">Estudiantes participantes</div></div>
                <div className="bg-amber-50 p-3 rounded-lg"><div className="text-xl font-bold text-amber-700">{datosLider.participacion?.docentes?.ejecutados ?? 0}</div><div className="text-xs font-semibold text-gray-600">Docentes participantes</div></div>
                <div className="bg-green-50 p-3 rounded-lg"><div className="text-xl font-bold text-green-700">{datosLider.participacion?.beneficiarios_directos ?? 0}</div><div className="text-xs font-semibold text-gray-600">Beneficiarios directos</div></div>
                <div className="bg-purple-50 p-3 rounded-lg"><div className="text-xl font-bold text-purple-700">{datosLider.participacion?.beneficiarios_indirectos ?? 0}</div><div className="text-xs font-semibold text-gray-600">Beneficiarios indirectos (audiencia)</div></div>
              </div>
              {!datosLider.tareas || datosLider.tareas.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay tareas cargadas para este periodo. Se definen en Proyecto de Vinculación (el ciclo debe llamarse igual que el periodo, por ejemplo {datosLider.periodo?.etiqueta}).</p>
              ) : (
                <div className="space-y-2">
                  {datosLider.tareas.map((tarea: any) => (
                    <div key={tarea.codigo} className="text-sm">
                      <div className="flex justify-between"><span className="font-semibold text-gray-800">{tarea.codigo} {tarea.nombre}</span><span className="font-bold text-uleam-blue">{tarea.avance != null ? `${tarea.avance}%` : 'Sin cálculo'}</span></div>
                      <div className="w-full bg-gray-200 rounded h-2 my-1"><div className="bg-uleam-blue h-2 rounded" style={{ width: `${tarea.avance ?? 0}%` }} /></div>
                      <p className="text-xs text-gray-500">Realizado {tarea.realizado ?? 0} de {tarea.meta ?? '—'} {tarea.unidad}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-600 mt-4">
                Propósito (nivel MCER): Pre-Test a {datosLider.mcer?.pretests ?? 0} beneficiarios; Post-Test a {datosLider.mcer?.postests ?? 0}. {datosLider.mcer?.postests === 0 ? 'En proceso: falta aplicar el Post-Test.' : ''}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
              <h2 className="text-lg font-bold text-uleam-blue">Problema inicial vs. resultados</h2>
              <div className="text-xs text-gray-600 bg-gray-50 border rounded p-3">
                <p><strong>Problema central:</strong> {datosLider.arbol?.central}</p>
                <p className="mt-1">Se toma del árbol de problemas del proyecto (cada causa directa es una fila del formato).</p>
              </div>
              {(datosLider.problemaResultados || []).map((problema: any, indiceProblema: number) => (
                <div key={indiceProblema} className="border rounded-lg p-3 space-y-2">
                  <p className="text-sm font-semibold text-gray-800">Causa {indiceProblema + 1}: {problema.causa}</p>
                  {[
                    { campo: 'resultados', titulo: 'Resultados / logros de la actividad' },
                    { campo: 'aporte_ensenanza', titulo: 'Aportes al proceso de enseñanza-aprendizaje' },
                    { campo: 'aporte_metas', titulo: 'Aportes al logro de metas de los ODS' },
                  ].map(({ campo, titulo }) => (
                    <div key={campo}>
                      <label className="block text-xs font-bold text-gray-600 mb-1">{titulo}</label>
                      <textarea rows={2} value={problema[campo] || ''} onChange={e => actualizarProblemaLider(indiceProblema, campo, e.target.value)} className="w-full p-2 border rounded text-xs" />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
              <h2 className="text-lg font-bold text-uleam-blue">Textos del informe</h2>
              {[
                { clave: 'nuevos_problemas', titulo: 'Identificación de nuevos problemas (sugerencias para nuevos proyectos de investigación)' },
                { clave: 'contribucion_conocimientos', titulo: 'Contribución a la generación de nuevos proyectos y/o reformulación de éstos' },
                { clave: 'mejora_oferta', titulo: 'Propuesta de mejora a la oferta académica' },
                { clave: 'aporte_proyectos', titulo: 'Aporte a la elaboración de proyectos de titulación en articulación con los resultados de vinculación' },
              ].map(seccion => (
                <div key={seccion.clave}>
                  <label className="block font-bold text-gray-800 text-sm mb-1">{seccion.titulo}</label>
                  <textarea
                    rows={3}
                    value={datosLider.textos?.[seccion.clave] || ''}
                    onChange={e => {
                      const valor = e.target.value;
                      setDatosLider((previo: any) => ({ ...previo, textos: { ...previo.textos, [seccion.clave]: valor } }));
                    }}
                    className="w-full p-3 border rounded-lg text-sm text-gray-800 outline-none focus:border-uleam-blue"
                  />
                </div>
              ))}
            </div>
            </>
            ) : null}
          </div>
        )}

        {/* CONTENIDO TAB HISTORIAL */}
        {tab === 'historial' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
            <h2 className="text-lg font-bold text-uleam-blue">Historial de Informes Generados</h2>
            {historial.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Aún no se registran informes generados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-bold border-b">
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Período / Mes</th>
                      <th className="p-3">Generado Por</th>
                      <th className="p-3">Fecha de Creación</th>
                      <th className="p-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h: any) => (
                      <tr key={h.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${h.tipo.startsWith('supervisor') ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {h.tipo.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 font-semibold">{h.mes ? String(h.mes).slice(0, 7) : h.ciclo_nombre}</td>
                        <td className="p-3 text-xs text-gray-600">
                          {h.supervisor_nombres ? `${h.supervisor_nombres} ${h.supervisor_apellidos}` : 'Líder / Admin'}
                        </td>
                        <td className="p-3 text-xs text-gray-500">
                          {new Date(h.creado_en).toLocaleString('es-EC')}
                        </td>
                        <td className="p-3">
                          <a
                            href={`/vinculacion/informes/api?accion=descargar&id=${h.id}`}
                            download
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs rounded border"
                          >
                            📥 Descargar .docx
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InformesVinculacionPage() {
  return (
    <Suspense fallback={null}>
      <InformesVinculacionContenido />
    </Suspense>
  );
}
