// lib/rollupDatos.ts
// Datos ya existentes de un proyecto que el generador de roll up ofrece (opcionales, con check):
// cifras calculadas, objetivos y ficha del proyecto. Recibe `sql` desde el handler (nunca neon() a nivel de módulo).

export interface CifraDisponible {
  key: string;
  n: string;
  l: string;
}

export interface ObjetivoProyecto {
  id: number;
  tipo: string;
  texto: string;
}

export interface DetalleProyecto {
  key: string;
  label: string;
  value: string;
}

export interface DatosRollupProyecto {
  cifras_disponibles: CifraDisponible[];
  objetivos: ObjetivoProyecto[];
  detalles: DetalleProyecto[];
}

const formatNumber = (value: number) => new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 }).format(value);

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const formatMonthYear = (value: Date | string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${MESES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

// Una consulta que falla (tabla cambiada, etc.) no debe tumbar el resto: devuelve el valor por defecto.
async function safely<T>(query: Promise<T>, fallback: T): Promise<T> {
  try { return await query; } catch { return fallback; }
}

// Contribuciones académicas aprobadas (misma fuente y criterio que /contribuciones: solo `aprobada = true`).
// Con proyectoId se limita a ese proyecto; con null cuenta toda la carrera. Los tipos en 0 no se ofrecen.
async function cifrasContribuciones(sql: any, proyectoId: string | null): Promise<CifraDisponible[]> {
  const filas: { tipo: string; total: number }[] = await safely(
    proyectoId
      ? sql`SELECT "tipoPublicacion"::text AS tipo, count(*)::int AS total FROM "Contribution" WHERE aprobada = true AND "proyectoId" = ${proyectoId} GROUP BY 1`
      : sql`SELECT "tipoPublicacion"::text AS tipo, count(*)::int AS total FROM "Contribution" WHERE aprobada = true GROUP BY 1`,
    [] as any[],
  );
  const porTipo = (tipo: string) => filas.find((fila) => fila.tipo === tipo)?.total ?? 0;
  const total = filas.reduce((suma, fila) => suma + fila.total, 0);
  const definiciones: [string, number, string, string][] = [
    ['contrib_total', total, 'Contribuciones académicas', 'Contribución académica'],
    ['contrib_ponencias', porTipo('MEMORIA_EVENTO'), 'Ponencias en eventos', 'Ponencia en eventos'],
    ['contrib_regionales', porTipo('ARTICULO_REGIONAL'), 'Artículos regionales', 'Artículo regional'],
    ['contrib_alto_impacto', porTipo('ARTICULO_ALTO_IMPACTO'), 'Artículos de alto impacto', 'Artículo de alto impacto'],
    ['contrib_libros', porTipo('LIBRO'), 'Libros', 'Libro'],
    ['contrib_capitulos', porTipo('CAPITULO_LIBRO'), 'Capítulos de libro', 'Capítulo de libro'],
    ['contrib_pi', porTipo('PROPIEDAD_INTELECTUAL'), 'Propiedad intelectual', 'Propiedad intelectual'],
  ];
  return definiciones
    .filter(([, valor]) => valor > 0)
    .map(([key, valor, etiqueta, etiquetaSingular]) => ({ key, n: formatNumber(valor), l: valor === 1 ? etiquetaSingular : etiqueta }));
}

export async function obtenerDatosRollup(sql: any, proyecto: any): Promise<DatosRollupProyecto> {
  const proyectoId: string = proyecto.id;
  const cifras: CifraDisponible[] = [];
  const addCifra = (key: string, value: number | null | undefined, label: string) => {
    if (value && value > 0) cifras.push({ key, n: formatNumber(value), l: label });
  };

  const [equipo, podcast, difusion, metasPersonalizadas, objetivos] = await Promise.all([
    safely(sql`SELECT count(*)::int AS total FROM members WHERE activo = true AND ${proyectoId} = ANY(projects)`, [{ total: 0 }]),
    safely(sql`SELECT count(*)::int AS total FROM videos WHERE activo = true AND aprobado_sitio = true AND ${proyectoId} = ANY(proyecto_id)`, [{ total: 0 }]),
    safely(sql`SELECT count(*)::int AS total FROM actividades_difusion WHERE aprobado_sitio = true AND proyecto_id = ${proyectoId}`, [{ total: 0 }]),
    safely(sql`SELECT id, descripcion, meta, unidad FROM proyecto_metas_personalizadas WHERE proyecto_id = ${proyectoId} AND meta > 0 ORDER BY id`, [] as any[]),
    safely(sql`SELECT id, tipo, texto FROM proyecto_objetivos WHERE proyecto_id = ${proyectoId} AND activo = true ORDER BY (tipo = 'general') DESC, orden ASC, id ASC`, [] as any[]),
  ]);

  addCifra('equipo', equipo[0]?.total, equipo[0]?.total === 1 ? 'Integrante del equipo' : 'Integrantes del equipo');
  addCifra('podcast', podcast[0]?.total, 'Episodios de podcast');
  addCifra('difusion', difusion[0]?.total, 'Actividades de difusión');
  cifras.push(...(await cifrasContribuciones(sql, proyectoId)));

  // Operación de Vinculación: solo el proyecto de Vinculación tiene espacios, asistencia y beneficiarios.
  if (proyectoId === 'vinculacion') {
    const [beneficiarios, espacios, pasantes, sesiones, horas] = await Promise.all([
      safely(sql`SELECT count(DISTINCT i.beneficiario_id)::int AS total FROM inscripciones_espacio i JOIN "espacios_enseñanza" e ON e.id = i.espacio_id WHERE e.area = 'vinculacion'`, [{ total: 0 }]),
      safely(sql`SELECT count(*)::int AS total FROM "espacios_enseñanza" WHERE area = 'vinculacion'`, [{ total: 0 }]),
      safely(sql`SELECT count(DISTINCT ei.usuario_id)::int AS total FROM espacio_instructores ei JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id WHERE e.area = 'vinculacion'`, [{ total: 0 }]),
      safely(sql`SELECT count(*)::int AS total FROM asistencia_espacio a JOIN "espacios_enseñanza" e ON e.id = a.espacio_id WHERE e.area = 'vinculacion' AND a.estado_aprobacion = 'aprobado'`, [{ total: 0 }]),
      safely(sql`SELECT COALESCE(sum(h.horas), 0)::float AS total FROM horas_asistencia_instructor h JOIN asistencia_espacio a ON a.id = h.asistencia_id JOIN "espacios_enseñanza" e ON e.id = a.espacio_id WHERE e.area = 'vinculacion' AND a.estado_aprobacion = 'aprobado'`, [{ total: 0 }]),
    ]);
    addCifra('beneficiarios', beneficiarios[0]?.total, 'Beneficiarios registrados');
    addCifra('espacios', espacios[0]?.total, 'Espacios de enseñanza');
    addCifra('pasantes', pasantes[0]?.total, 'Estudiantes pasantes');
    addCifra('sesiones', sesiones[0]?.total, 'Sesiones realizadas');
    addCifra('horas', Math.round(horas[0]?.total ?? 0), 'Horas de vinculación');
  }

  // Metas declaradas del proyecto (solo las que tienen valor).
  addCifra('meta_directos', proyecto.meta_beneficiarios_directos, 'Meta: beneficiarios directos');
  addCifra('meta_indirectos', proyecto.meta_beneficiarios_indirectos, 'Meta: beneficiarios indirectos');
  addCifra('meta_estudiantes', proyecto.meta_estudiantes, 'Meta: estudiantes');
  addCifra('meta_docentes', proyecto.meta_docentes, 'Meta: docentes');
  metasPersonalizadas.forEach((meta: any) => addCifra(`meta_${meta.id}`, Number(meta.meta), `Meta: ${meta.descripcion}`));

  const detalles: DetalleProyecto[] = [];
  const addDetalle = (key: string, label: string, value: string | null | undefined) => {
    if (value && String(value).trim()) detalles.push({ key, label, value: String(value).trim() });
  };
  addDetalle('unidad_academica', 'Unidad académica', proyecto.unidad_academica);
  addDetalle('carrera', 'Carrera', proyecto.carrera);
  addDetalle('entidad_beneficiaria', 'Entidad beneficiaria', proyecto.entidad_beneficiaria);
  addDetalle('linea_investigacion', 'Línea de investigación', proyecto.linea_investigacion);
  addDetalle('ods', 'ODS', proyecto.ods);
  addDetalle('zona', 'Zona', proyecto.zona);
  addDetalle('parroquia', 'Parroquia', proyecto.parroquia);
  const inicio = formatMonthYear(proyecto.vigencia_inicio);
  const fin = formatMonthYear(proyecto.vigencia_fin);
  addDetalle('vigencia', 'Vigencia', inicio && fin ? `${inicio} – ${fin}` : inicio || fin);
  addDetalle('codigo', 'Código', proyecto.codigo);

  return { cifras_disponibles: cifras, objetivos, detalles };
}

// Cifras generales de toda la carrera (roll up general, no de un proyecto en particular).
// El orden importa: el roll up de la carrera marca por defecto las primeras 4.
export async function obtenerCifrasCarrera(sql: any): Promise<CifraDisponible[]> {
  const [proyectos, integrantes, podcast, difusion, beneficiarios, contribuciones] = await Promise.all([
    safely(sql`SELECT count(*)::int AS total FROM proyectos WHERE activo = true`, [{ total: 0 }]),
    safely(sql`SELECT count(*)::int AS total FROM members WHERE activo = true`, [{ total: 0 }]),
    safely(sql`SELECT count(*)::int AS total FROM videos WHERE activo = true AND aprobado_sitio = true`, [{ total: 0 }]),
    safely(sql`SELECT count(*)::int AS total FROM actividades_difusion WHERE aprobado_sitio = true`, [{ total: 0 }]),
    safely(sql`SELECT count(DISTINCT i.beneficiario_id)::int AS total FROM inscripciones_espacio i JOIN "espacios_enseñanza" e ON e.id = i.espacio_id WHERE e.area = 'vinculacion'`, [{ total: 0 }]),
    cifrasContribuciones(sql, null),
  ]);
  const otras: CifraDisponible[] = [];
  const addCifra = (key: string, value: number | null | undefined, label: string) => {
    if (value && value > 0) otras.push({ key, n: formatNumber(value), l: label });
  };
  addCifra('c_beneficiarios', beneficiarios[0]?.total, 'Beneficiarios de vinculación');
  addCifra('c_podcast', podcast[0]?.total, 'Episodios de podcast');
  addCifra('c_difusion', difusion[0]?.total, 'Actividades de difusión');
  addCifra('c_proyectos', proyectos[0]?.total, 'Proyectos del grupo');
  addCifra('c_integrantes', integrantes[0]?.total, 'Integrantes');
  // Orden: total de contribuciones, ponencias, beneficiarios, podcast (las 4 por defecto) y luego el resto.
  const buscar = (lista: CifraDisponible[], key: string) => lista.find((cifra) => cifra.key === key);
  const principales = [buscar(contribuciones, 'contrib_total'), buscar(contribuciones, 'contrib_ponencias'), buscar(otras, 'c_beneficiarios'), buscar(otras, 'c_podcast')]
    .filter((cifra): cifra is CifraDisponible => Boolean(cifra));
  const resto = [...contribuciones, ...otras].filter((cifra) => !principales.includes(cifra));
  return [...principales, ...resto];
}
