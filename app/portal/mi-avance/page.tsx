'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

interface Espacio {
  id: number;
  nombre: string;
  area: string;
}

interface BeneficiarioDetalle {
  id: number;
  nombres: string;
  apellidos: string;
  nota_pre: number | null;
  subnivel_pre: string | null;
  nota_post: number | null;
  subnivel_post: string | null;
  asistencias_presentes: number;
  total_sesiones: number;
}

interface Resena {
  id: number;
  comentarios_sugerencias: string;
  fecha_registro: string;
  satisfaccion_general: number;
}

interface Avance {
  espacios: Espacio[];
  beneficiarios: number;
  asistenciasRegistradas: number;
  evaluacionesMcer: number;
  encuestasEnTuEspacio: number;
  difusion: { aprobadas: number; pendientes: number; podcasts: number };
  horasPodcast: { total: number; episodios: number; pendientes: number; episodiosPendientes: number };
  horasAsistencia: { total: number; sesiones: number; sesionesPendientes: number };
  horasInvestigacion: { total: number; reportes: number; pendientes?: number } | null;
  horasAutonomas?: { total: number; pendientes: number; maximo: number };
  asistenciasRechazadas?: { id: number; fecha: string; espacio_nombre: string; motivo_rechazo: string | null; registrada_por_mi: boolean }[];
  beneficiariosDetalle?: BeneficiarioDetalle[];
  resenas?: Resena[];
  percepcionBeneficiarios?: { respuestas: number; umbral: number; visible: boolean; promedio: number | null; observaciones: string[] };
  metaHoras?: number;
  topesHoras?: { asistencia: number | null; autonomas: number | null; investigacion: number | null; podcast: number | null; meta: number };
}

function Tile({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`bg-white p-5 rounded-xl shadow-sm border-t-4 ${color}`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function MiAvancePage() {
  const [avance, setAvance] = useState<Avance | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/mi-avance')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('No se pudo cargar tu avance'))))
      .then(setAvance)
      .catch((err) => setError(err.message));
  }, []);

  const totalHorasAprobadas = avance
    ? Math.round(((avance.horasAsistencia.total || 0) + (avance.horasPodcast.total || 0) + (avance.horasInvestigacion?.total || 0) + (avance.horasAutonomas?.total || 0)) * 10) / 10
    : 0;
  const metaHoras = avance?.metaHoras || 96;
  const porcentajeMeta = Math.min(100, Math.round((totalHorasAprobadas / metaHoras) * 100));

  // Un pasante con tope 0 en un tipo (ej. perfil "Solo Podcast": asistencia=0) no opera ese tipo —
  // mostrarle asistencia/beneficiarios en 0 confunde, no informa. Sin dato de topes (aún cargando o
  // API vieja) se asume habilitado, para no ocultar nada por error.
  const asistenciaHabilitada = avance?.topesHoras ? avance.topesHoras.asistencia !== 0 : true;
  const podcastHabilitado = avance?.topesHoras ? avance.topesHoras.podcast !== 0 : true;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="mb-1">
                <Link href="/portal/dashboard" className="text-xs font-semibold text-blue-600 hover:underline">
                  &larr; Volver al Portal de Pasantes
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-slate-900">Mi Avance & Espacio de Intervención</h1>
              <p className="text-sm text-slate-600 mt-1">
                Inteligencia pedagógica de tus clases, beneficiarios a cargo y seguimiento de horas acreditables.
              </p>
            </div>

            {/* Quick Action Buttons — solo las acciones del tipo de horas habilitado para este pasante */}
            <div className="flex flex-wrap gap-2">
              {asistenciaHabilitada && (
                <>
                  <Link href="/vinculacion/asistencia" className="bg-uleam-blue hover:bg-blue-900 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                    <span>📋 Tomar Asistencia Hoy</span>
                  </Link>
                  <Link href="/vinculacion/registrar-evaluar" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                    <span>+ Evaluar Beneficiario</span>
                  </Link>
                </>
              )}
              {podcastHabilitado && (
                <Link href="/vinculacion/difusion" className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                  <span>🎙 Registrar Podcast</span>
                </Link>
              )}
            </div>
          </div>

          {error && <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>}
          {!avance && !error && <div className="text-slate-500 py-12 text-center text-sm">Cargando tu información...</div>}

          {avance && (
            <div className="space-y-8">

              {/* Asistencias rechazadas por el supervisor (destino del aviso 'asistencias-rechazadas') */}
              {avance.asistenciasRechazadas && avance.asistenciasRechazadas.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                  <h2 className="text-sm font-bold text-red-800 mb-2">
                    Asistencias rechazadas por el supervisor ({avance.asistenciasRechazadas.length})
                  </h2>
                  <ul className="space-y-2">
                    {avance.asistenciasRechazadas.map((rechazo) => (
                      <li key={rechazo.id} className="text-sm text-red-900">
                        <span className="font-semibold">{rechazo.espacio_nombre}</span>
                        {' · '}{new Date(rechazo.fecha).toLocaleDateString('es-EC', { timeZone: 'UTC' })}
                        {' — '}{rechazo.motivo_rechazo || 'Sin motivo indicado'}
                        {!rechazo.registrada_por_mi && <span className="text-red-700"> (la registró otra persona del espacio)</span>}
                      </li>
                    ))}
                  </ul>
                  {avance.asistenciasRechazadas.some((rechazo) => rechazo.registrada_por_mi) ? (
                    <Link href="/vinculacion/asistencia" className="inline-block mt-3 text-xs font-semibold text-red-700 hover:underline">
                      Volver a registrar la asistencia &rarr;
                    </Link>
                  ) : (
                    <p className="mt-3 text-xs text-red-700">Quien registró la sesión debe volver a registrarla.</p>
                  )}
                </div>
              )}

              {/* Target Horaje Progress Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <span className="bg-amber-500/20 text-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      Progreso de Prácticas Preprofesionales
                    </span>
                    <h2 className="text-2xl font-bold mt-2 text-white">
                      {totalHorasAprobadas}h <span className="text-slate-400 font-normal text-base">de {metaHoras}h Acreditables Requeridas</span>
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                      {avance.horasAsistencia.sesionesPendientes > 0 || avance.horasPodcast.episodiosPendientes > 0
                        ? `Tienes horas pendientes de revisión por tu docente supervisor.`
                        : `¡Vas por buen camino! Mantén al día los registros de tu espacio.`}
                    </p>
                  </div>

                  <div className="w-full md:w-72 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                    <div className="flex justify-between text-xs text-blue-200 mb-1.5 font-semibold">
                      <span>Cumplimiento Total</span>
                      <span className="text-white font-bold">{porcentajeMeta}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div className="bg-emerald-400 h-3 rounded-full transition-all duration-500" style={{ width: `${porcentajeMeta}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-300 mt-2">
                      {asistenciaHabilitada && <span>🎓 Asistencia: {avance.horasAsistencia.total}h</span>}
                      {podcastHabilitado && <span>🎙 Podcasts: {avance.horasPodcast.total}h</span>}
                      {avance.horasInvestigacion && <span>🔬 Investigación: {avance.horasInvestigacion.total}h</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* High level KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {asistenciaHabilitada && (
                  <Tile
                    label="👥 Beneficiarios en tu Espacio"
                    value={avance.beneficiarios}
                    sub={avance.espacios.map((e) => e.nombre).join(', ') || 'Sin espacio asignado'}
                    color="border-blue-500"
                  />
                )}
                {asistenciaHabilitada && (
                  <Tile
                    label="🎓 Asistencias Dictadas"
                    value={`${avance.horasAsistencia.total} h`}
                    sub={`${avance.horasAsistencia.sesiones} sesiones aprobadas (${avance.horasAsistencia.sesionesPendientes} pend.)`}
                    color="border-teal-500"
                  />
                )}
                {podcastHabilitado && (
                  <Tile
                    label="🎙 Horas de Podcast"
                    value={`${avance.horasPodcast.total} h`}
                    sub={`${avance.horasPodcast.episodios} episodios aprobados (${avance.horasPodcast.episodiosPendientes} pend.)`}
                    color="border-purple-500"
                  />
                )}
                {avance.horasInvestigacion && (
                  <Tile
                    label="🔬 Horas de Investigación"
                    value={`${avance.horasInvestigacion.total} h`}
                    sub={`${avance.horasInvestigacion.reportes} registro(s) aprobado(s)${avance.horasInvestigacion.pendientes ? ` (${avance.horasInvestigacion.pendientes} h pend.)` : ''}`}
                    color="border-indigo-500"
                  />
                )}
                {avance.horasAutonomas && avance.horasAutonomas.maximo > 0 && (
                  <Tile
                    label="🛠 Horas Autónomas"
                    value={`${avance.horasAutonomas.total} h`}
                    sub={`Máximo ${avance.horasAutonomas.maximo} h${avance.horasAutonomas.pendientes > 0 ? ` (${avance.horasAutonomas.pendientes} h pend.)` : ''}`}
                    color="border-emerald-500"
                  />
                )}
                <Tile
                  label="📝 Tests MCER Evaluados"
                  value={avance.evaluacionesMcer}
                  sub="Diagnósticos iniciales y post-tests"
                  color="border-emerald-500"
                />
                <Tile
                  label="⭐ Encuestas Recibidas"
                  value={avance.encuestasEnTuEspacio}
                  sub="Reseñas de calidad de tus alumnos"
                  color="border-amber-500"
                />
              </div>

              {/* Beneficiary Roster & Pedagogical Progress in Pasante's Space — no aplica a un pasante de Podcast (no tiene beneficiarios propios). */}
              {!asistenciaHabilitada ? (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 text-sm text-purple-900">
                  Tu actividad de Vinculación es <strong>Podcast</strong> — no tienes beneficiarios ni Tests MCER a cargo. Tus horas acreditables salen de los episodios que registres en "🎙 Registrar Podcast" y que apruebe tu supervisor.
                </div>
              ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">👥 Beneficiarios de tu Espacio & Avance MCER</h3>
                    <p className="text-xs text-slate-500">Resultados individuales del nivel de inglés y asistencia de tus alumnos comunitarios.</p>
                  </div>
                  <span className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-semibold border border-blue-100">
                    {avance.beneficiariosDetalle?.length || 0} beneficiarios inscritos
                  </span>
                </div>

                {!avance.beneficiariosDetalle || avance.beneficiariosDetalle.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-xl">
                    Aún no hay beneficiarios registrados en tu espacio de enseñanza.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase">
                        <tr>
                          <th className="p-3">Beneficiario</th>
                          <th className="p-3 text-center">Pre-Test (Inicial)</th>
                          <th className="p-3 text-center">Post-Test (Final)</th>
                          <th className="p-3 text-center">Asistencia %</th>
                          <th className="p-3 text-center">Estado Pedagógico</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {avance.beneficiariosDetalle.map((b) => {
                          const pctAsist = b.total_sesiones > 0 ? Math.round((b.asistencias_presentes / b.total_sesiones) * 100) : 100;
                          const tieneMejora = b.nota_post !== null && b.nota_pre !== null && b.nota_post > b.nota_pre;

                          return (
                            <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-semibold text-slate-900">
                                {b.nombres} {b.apellidos}
                              </td>
                              <td className="p-3 text-center">
                                {b.nota_pre !== null ? (
                                  <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-mono border border-slate-200">
                                    {b.subnivel_pre || 'MCER'} ({b.nota_pre} pts)
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Sin Pre-Test</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {b.nota_post !== null ? (
                                  <span className={`px-2.5 py-1 rounded font-mono font-bold border ${tieneMejora ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                                    {b.subnivel_post || 'MCER'} ({b.nota_post} pts) {tieneMejora && '↑'}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Pendiente Post-Test</span>
                                )}
                              </td>
                              <td className="p-3 text-center font-bold">
                                <span className={pctAsist < 70 ? 'text-red-600' : 'text-emerald-600'}>
                                  {pctAsist}%
                                </span>
                                <span className="text-[10px] text-slate-400 block font-normal">({b.asistencias_presentes}/{b.total_sesiones} ses.)</span>
                              </td>
                              <td className="p-3 text-center">
                                {pctAsist < 70 ? (
                                  <span className="bg-red-100 text-red-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold">Riesgo Inasistencia</span>
                                ) : tieneMejora ? (
                                  <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">Progreso Excelente</span>
                                ) : (
                                  <span className="bg-blue-100 text-blue-800 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">Al Día</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              )}

              {/* Cómo te perciben los beneficiarios: anónimo y solo agregado */}
              {avance.percepcionBeneficiarios && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-lg font-bold text-slate-900">🤝 Cómo te perciben los beneficiarios</h3>
                    <p className="text-xs text-slate-500">Calificación y recomendaciones anónimas de quienes trabajaron contigo. Sin nombres, para ayudarte a mejorar.</p>
                  </div>
                  {avance.percepcionBeneficiarios.visible ? (
                    <>
                      <p className="text-sm text-slate-700">
                        <span className="text-2xl font-bold text-amber-600">{avance.percepcionBeneficiarios.promedio?.toFixed(1)} ★</span>
                        <span className="ml-2 text-xs text-slate-500">promedio de {avance.percepcionBeneficiarios.respuestas} respuestas</span>
                      </p>
                      {avance.percepcionBeneficiarios.observaciones.length > 0 && (
                        <ul className="space-y-2">
                          {avance.percepcionBeneficiarios.observaciones.map((observacion, indice) => (
                            <li key={indice} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700">“{observacion}”</li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Aún no hay suficientes respuestas ({avance.percepcionBeneficiarios.respuestas} de {avance.percepcionBeneficiarios.umbral}). Se mostrarán cuando haya al menos {avance.percepcionBeneficiarios.umbral}, para proteger el anonimato.
                    </p>
                  )}
                </div>
              )}

              {/* Beneficiary Feedback / Survey Comments */}
              {avance.resenas && avance.resenas.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-lg font-bold text-slate-900">💬 Reseñas y Opiniones de tus Alumnos</h3>
                    <p className="text-xs text-slate-500">Comentarios anónimos recopilados en las encuestas de satisfacción para tu mejora docente.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {avance.resenas.map((r) => (
                      <div key={r.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                        <div className="flex justify-between font-bold text-amber-600">
                          <span>{'★'.repeat(Math.round(r.satisfaccion_general || 5))}</span>
                          <span className="text-slate-400 font-normal text-[11px]">{new Date(r.fecha_registro).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-700 italic">"{r.comentarios_sugerencias}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Links Footer */}
              <div className="flex flex-wrap gap-3 pt-2">
                {asistenciaHabilitada && (
                  <>
                    <Link href="/vinculacion/registrar-evaluar" className="text-xs text-blue-600 font-semibold hover:underline bg-white px-3 py-2 rounded-lg border border-slate-200">
                      » Registrar y evaluar beneficiario
                    </Link>
                    <Link href="/vinculacion/asistencia" className="text-xs text-blue-600 font-semibold hover:underline bg-white px-3 py-2 rounded-lg border border-slate-200">
                      » Asistencia diaria
                    </Link>
                    <Link href="/vinculacion/evaluacion-final" className="text-xs text-blue-600 font-semibold hover:underline bg-white px-3 py-2 rounded-lg border border-slate-200">
                      » Evaluación final y encuestas
                    </Link>
                  </>
                )}
                <Link href="/vinculacion/difusion" className="text-xs text-blue-600 font-semibold hover:underline bg-white px-3 py-2 rounded-lg border border-slate-200">
                  » Registrar podcast o difusión
                </Link>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
}
