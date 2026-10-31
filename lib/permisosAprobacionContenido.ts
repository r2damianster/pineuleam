// lib/permisosAprobacionContenido.ts — Sesión 53
// Quién puede aprobar y publicar un video/actividad de difusión sin depender solo de
// administración del sitio. Tres vías, cualquiera basta:
//   1. Administración del sitio (puedeAdministrarSitio) — respaldo universal, siempre puede.
//   2. Supervisor del pasante que subió el contenido (mismo alcance que ya usa
//      /vinculacion/supervisar para horas: profesor_id de los espacios donde ese pasante
//      es instructor). Solo aplica si quien subió es un pasante (rol='estudiante').
//   3. Profesor responsable elegido al registrar (`profesores_responsables`), sin importar
//      quién subió — incluye la autoaprobación de un docente que se marcó a sí mismo como
//      único responsable (decisión explícita del usuario, 2026-09-27).
//
// Sin imports de Node/Neon a nivel de módulo — recibe `sql` desde el handler.

import type { AppSession } from './session';
import { puedeAdministrarSitio, puedeGestionarProyecto } from './permisosProyecto';

interface FilaAprobableVideo {
  propuesto_por?: number | string | null;
  participantes_estudiantes?: (number | string)[] | null;
  profesores_responsables?: (number | string)[] | null;
}

interface FilaAprobableActividad {
  registrador_id?: number | string | null;
  profesores_responsables?: (number | string)[] | null;
}

/** Supervisor de un pasante = profesor_id del espacio de Vinculación donde ese pasante es titular
 *  (en los espacios donde está de apoyo, el dueño solo confirma asistencia, no lo supervisa). */
async function esSupervisorDePasante(sql: any, supervisorId: number, pasanteId: number): Promise<boolean> {
  const filas = await sql`
    SELECT 1 FROM espacio_instructores ei
    JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
    WHERE ei.usuario_id = ${pasanteId} AND ei.tipo = 'titular' AND e.area = 'vinculacion' AND e.profesor_id = ${supervisorId}
    LIMIT 1
  `;
  return filas.length > 0;
}

/** Ids de proyectos donde esta persona es líder/colíder activo (solo pertenencia real, sin el
 *  "todos" de administración del sitio: admin ya recibe sus propios avisos de pendientes). */
export async function proyectosQueLidera(sql: any, usuarioId: number): Promise<string[]> {
  if (Number.isNaN(usuarioId)) return [];
  const filas = await sql`
    SELECT DISTINCT proyecto_id FROM proyecto_miembros
    WHERE usuario_id = ${usuarioId} AND activo = true AND rol_en_proyecto IN ('lider', 'colider')
  `;
  return filas.map((fila: any) => String(fila.proyecto_id));
}

/** Líder/colíder activo de al menos uno de los proyectos del registro (Sesión 60). */
async function esLiderDeAlgunProyecto(sql: any, usuario: AppSession, proyectos: unknown): Promise<boolean> {
  if (!Array.isArray(proyectos)) return false;
  for (const proyectoId of proyectos) {
    if (typeof proyectoId === 'string' && (await puedeGestionarProyecto(sql, usuario, proyectoId))) return true;
  }
  return false;
}

export async function puedeAprobarVideo(sql: any, usuario: AppSession, video: Record<string, any> & FilaAprobableVideo): Promise<boolean> {
  if (puedeAdministrarSitio(usuario)) return true;
  const usuarioId = Number(usuario.id);
  if (Number.isNaN(usuarioId)) return false;

  const responsables = video.profesores_responsables ?? [];
  if (responsables.map(Number).includes(usuarioId)) return true;
  if (await esLiderDeAlgunProyecto(sql, usuario, [...(video.proyecto_id ?? []), ...(video.proyectos_actividad ?? [])])) return true;

  // Vía del supervisor: solo si quien propuso el video es un pasante (rol='estudiante').
  if (video.propuesto_por != null) {
    const [proponente] = await sql`SELECT rol FROM usuarios WHERE id = ${video.propuesto_por}`;
    if (proponente?.rol === 'estudiante') {
      if (Number(video.propuesto_por) === usuarioId) return false; // el pasante no se autoaprueba
      if (await esSupervisorDePasante(sql, usuarioId, Number(video.propuesto_por))) return true;
      // También cuenta si supervisa a cualquiera de los participantes marcados.
      for (const participanteId of video.participantes_estudiantes ?? []) {
        if (await esSupervisorDePasante(sql, usuarioId, Number(participanteId))) return true;
      }
    }
  }
  return false;
}

export async function puedeAprobarActividad(sql: any, usuario: AppSession, actividad: Record<string, any> & FilaAprobableActividad): Promise<boolean> {
  if (puedeAdministrarSitio(usuario)) return true;
  const usuarioId = Number(usuario.id);
  if (Number.isNaN(usuarioId)) return false;
  const responsables = actividad.profesores_responsables ?? [];
  if (responsables.map(Number).includes(usuarioId)) return true;
  return esLiderDeAlgunProyecto(sql, usuario, actividad.proyectos);
}
