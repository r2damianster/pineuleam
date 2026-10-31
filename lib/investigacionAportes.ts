// Subsistema de aportantes de Investigación — independiente de Vinculación.
// Tablas: investigacion_aportantes (quién aporta a qué proyecto) e investigacion_aportes (qué aporta,
// ligado opcionalmente a una actividad del plan = meta). Las horas son solo reconocimiento.
// Reglas:
//  - Un pasante de Vinculación (rol `estudiante`) NO puede ser aportante: si aporta, lo hace desde Vinculación.
//  - Pueden ser aportantes: docentes (`profesor`/`admin`) y colaboradores (`colaborador`, cualquier correo).
//  - Agrega y valida el líder/colíder del proyecto (lib/permisosProyecto.ts:puedeGestionarProyecto).
import type { AppSession } from './session';

export type TipoAportante = 'docente' | 'estudiante_apoyo' | 'externo';

export const TIPOS_APORTANTE: { id: TipoAportante; etiqueta: string }[] = [
  { id: 'docente', etiqueta: 'Docente' },
  { id: 'estudiante_apoyo', etiqueta: 'Estudiante de apoyo' },
  { id: 'externo', etiqueta: 'Miembro externo' },
];

export const TIPOS_APORTE = ['actividad', 'evento', 'podcast', 'producto', 'otro'] as const;
export type TipoAporte = (typeof TIPOS_APORTE)[number];

// Roles de cuenta que pueden figurar como aportantes. `estudiante` queda fuera a propósito.
export function rolPuedeSerAportante(rol: string | null | undefined): boolean {
  return rol === 'profesor' || rol === 'admin' || rol === 'colaborador';
}

// Tipo por defecto según el rol de la cuenta (el líder puede afinar entre estudiante de apoyo y externo).
export function tipoAportantePorDefecto(rol: string | null | undefined): TipoAportante {
  return rol === 'colaborador' ? 'externo' : 'docente';
}

// Proyectos a los que la persona aporta hoy (activo en investigacion_aportantes y proyecto activo).
export async function proyectosComoAportante(sql: any, usuarioId: number) {
  return (await sql`
    SELECT p.id, p.nombre_oficial, a.tipo
    FROM investigacion_aportantes a
    JOIN proyectos p ON p.id = a.proyecto_id
    WHERE a.usuario_id = ${usuarioId} AND a.activo = true AND p.activo = true
    ORDER BY p.nombre_oficial ASC
  `) as { id: string; nombre_oficial: string; tipo: TipoAportante }[];
}

// Muestra u oculta a la persona como participante en la página pública del proyecto.
// Al mostrar: crea su tarjeta en `members` si no tiene (activo=false: queda pendiente hasta que la
// administración del sitio la active en /admin/members, igual que el resto de contenido) y la agrega al
// equipo del proyecto como `participante`. Nunca publica su correo (members.email queda vacío) ni toca el
// rol de quien ya es líder/colíder/supervisor del proyecto.
export async function sincronizarTarjetaWeb(sql: any, usuarioId: number, proyectoId: string, visible: boolean) {
  if (!visible) {
    await sql`
      UPDATE proyecto_miembros SET activo = false
      WHERE proyecto_id = ${proyectoId} AND usuario_id = ${usuarioId} AND rol_en_proyecto = 'participante'
    `;
    return;
  }
  const [tarjetaExistente] = await sql`SELECT id FROM members WHERE usuario_id = ${usuarioId} LIMIT 1`;
  if (!tarjetaExistente) {
    const [persona] = await sql`SELECT nombres, apellidos FROM usuarios WHERE id = ${usuarioId}`;
    await sql`
      INSERT INTO members (id, name, role, email, is_leader, "order", activo, usuario_id)
      VALUES (${`member_${Date.now()}`}, ${`${persona.nombres} ${persona.apellidos}`.trim()},
              'Participante de Investigación', '', false, 100, false, ${usuarioId})
    `;
  }
  await sql`
    INSERT INTO proyecto_miembros (proyecto_id, usuario_id, rol_en_proyecto, orden, activo)
    VALUES (${proyectoId}, ${usuarioId}, 'participante', 100, true)
    ON CONFLICT (proyecto_id, usuario_id) DO UPDATE SET activo = true
      WHERE proyecto_miembros.rol_en_proyecto = 'participante'
  `;
}

export interface AvanceActividadPlan {
  id: number;
  actividad: string;
  unidad: string | null;
  meta: number | null;
  avance: number;
  pendiente: number;
  porcentaje: number | null;
  mide: 'horas' | 'aportes';
}

export interface AvanceMetasProyecto {
  proyecto_id: string;
  ciclo_id: number | null;
  actividades: AvanceActividadPlan[];
  personas: {
    docentes: { meta: number | null; actual: number };
    estudiantes: { meta: number | null; actual: number };
  };
}

// Ciclo académico vigente hoy (fechas de ciclos_academicos), o el más reciente si hoy no cae en ninguno.
export async function cicloVigenteId(sql: any): Promise<number | null> {
  const [fila] = await sql`
    SELECT id FROM ciclos_academicos
    ORDER BY (CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin) DESC, fecha_inicio DESC
    LIMIT 1
  `;
  return fila ? Number(fila.id) : null;
}

// Avance de las metas de un proyecto en un ciclo. Se CALCULA, nunca se captura a mano:
//  - Cada actividad del plan (proyecto_actividades_plan) suma los aportes VALIDADOS ligados a ella.
//    Si su `unidad` habla de horas, suma horas; en cualquier otro caso cuenta aportes.
//  - Los aportes por validar se muestran aparte como `pendiente` y no cuentan en el avance.
//  - Personas: aportantes activos del proyecto (docentes y estudiantes de apoyo) frente a
//    proyecto_metas_ciclo.meta_docentes / meta_estudiantes. Los externos no cuentan contra una meta.
export async function calcularAvanceMetas(sql: any, proyectoId: string, cicloId: number | null): Promise<AvanceMetasProyecto> {
  const actividades = await sql`
    SELECT a.id, a.actividad, a.unidad, a.meta_cantidad::float AS meta,
           COALESCE(SUM(x.horas) FILTER (WHERE x.estado_validacion = 'validado'), 0)::float AS horas_validadas,
           COUNT(x.id) FILTER (WHERE x.estado_validacion = 'validado')::int AS aportes_validados,
           COALESCE(SUM(x.horas) FILTER (WHERE x.estado_validacion = 'pendiente'), 0)::float AS horas_pendientes,
           COUNT(x.id) FILTER (WHERE x.estado_validacion = 'pendiente')::int AS aportes_pendientes
    FROM proyecto_actividades_plan a
    JOIN proyecto_objetivos o ON o.id = a.objetivo_id
    LEFT JOIN investigacion_aportes x ON x.actividad_plan_id = a.id
    WHERE o.proyecto_id = ${proyectoId} AND a.activo = true
      AND (${cicloId}::int IS NULL OR a.ciclo_id = ${cicloId} OR a.ciclo_id IS NULL)
    GROUP BY a.id
    ORDER BY a.actividad
  `;
  const [metaPersonas] = cicloId
    ? await sql`SELECT meta_docentes, meta_estudiantes FROM proyecto_metas_ciclo WHERE proyecto_id = ${proyectoId} AND ciclo_id = ${cicloId}`
    : [undefined];
  // Docentes = aportantes tipo docente ∪ docentes del equipo (proyecto_miembros), sin duplicar personas:
  // un líder/colíder/participante docente cuenta aunque nadie lo haya registrado además como aportante.
  const [conteoPersonas] = await sql`
    SELECT
      (SELECT COUNT(DISTINCT usuario_id)::int FROM (
         SELECT usuario_id FROM investigacion_aportantes
         WHERE proyecto_id = ${proyectoId} AND activo = true AND tipo = 'docente'
         UNION
         SELECT pm.usuario_id FROM proyecto_miembros pm JOIN usuarios u ON u.id = pm.usuario_id
         WHERE pm.proyecto_id = ${proyectoId} AND pm.activo = true
           AND pm.rol_en_proyecto IN ('lider', 'colider', 'participante') AND u.rol IN ('profesor', 'admin')
       ) docentes_proyecto) AS docentes,
      (SELECT COUNT(DISTINCT usuario_id)::int FROM (
         SELECT usuario_id FROM investigacion_aportantes
         WHERE proyecto_id = ${proyectoId} AND activo = true AND tipo = 'estudiante_apoyo'
         UNION
         -- Pasantes con módulo investigación que reportaron horas en este proyecto (no rechazadas).
         SELECT a.usuario_id FROM actividades_investigacion_pasante a
         WHERE a.proyecto_id = ${proyectoId} AND a.estado_aprobacion <> 'rechazado'
         UNION
         -- Estudiantes/colaboradores del equipo del proyecto.
         SELECT pm.usuario_id FROM proyecto_miembros pm JOIN usuarios u ON u.id = pm.usuario_id
         WHERE pm.proyecto_id = ${proyectoId} AND pm.activo = true AND u.rol IN ('estudiante', 'colaborador')
       ) estudiantes_proyecto) AS estudiantes
  `;

  return {
    proyecto_id: proyectoId,
    ciclo_id: cicloId,
    actividades: actividades.map((fila: any) => {
      const midePorHoras = /hora/i.test(fila.unidad || '');
      const avance = midePorHoras ? fila.horas_validadas : fila.aportes_validados;
      const pendiente = midePorHoras ? fila.horas_pendientes : fila.aportes_pendientes;
      const meta = fila.meta && fila.meta > 0 ? fila.meta : null;
      return {
        id: fila.id,
        actividad: fila.actividad,
        unidad: fila.unidad,
        meta,
        avance,
        pendiente,
        porcentaje: meta ? Math.min(100, Math.round((avance / meta) * 100)) : null,
        mide: midePorHoras ? 'horas' : 'aportes',
      } as AvanceActividadPlan;
    }),
    personas: {
      docentes: { meta: metaPersonas?.meta_docentes || null, actual: conteoPersonas?.docentes ?? 0 },
      estudiantes: { meta: metaPersonas?.meta_estudiantes || null, actual: conteoPersonas?.estudiantes ?? 0 },
    },
  };
}

// Líderes y colíderes activos del proyecto (docentes). Son los "profesores responsables" de lo que un
// aportante registra: ellos aprueban su publicación (lib/permisosAprobacionContenido.ts) y validan su aporte.
export async function lideresDelProyecto(sql: any, proyectoId: string): Promise<number[]> {
  const filas = await sql`
    SELECT DISTINCT pm.usuario_id
    FROM proyecto_miembros pm
    JOIN usuarios u ON u.id = pm.usuario_id
    WHERE pm.proyecto_id = ${proyectoId} AND pm.activo = true
      AND pm.rol_en_proyecto IN ('lider', 'colider') AND u.rol IN ('profesor', 'admin')
  `;
  return filas.map((fila: any) => Number(fila.usuario_id));
}

// ¿Puede esta sesión registrar aportes en el proyecto? Solo quien es aportante activo de ese proyecto.
export async function puedeRegistrarAporte(sql: any, usuario: AppSession, proyectoId: string): Promise<boolean> {
  if (!rolPuedeSerAportante(usuario.rol)) return false;
  const usuarioId = Number(usuario.id);
  if (Number.isNaN(usuarioId)) return false;
  const filas = await sql`
    SELECT 1 FROM investigacion_aportantes
    WHERE proyecto_id = ${proyectoId} AND usuario_id = ${usuarioId} AND activo = true
  `;
  return filas.length > 0;
}
