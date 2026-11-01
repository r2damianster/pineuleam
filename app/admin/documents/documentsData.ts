export type DocumentCategoryId =
  | 'marco'
  | 'oficios'
  | 'actas'
  | 'eventos'
  | 'certificados'
  | 'informes-mensuales'
  | 'informes-periodicos'
  | 'publicaciones';

export type ProjectDocument = {
  id: string;
  title: string;
  filename: string;
  description: string;
  icon: string;
  date: string; // YYYY-MM-DD, fecha real del documento
  period: string;
  category: DocumentCategoryId;
};

export type DocumentCategory = {
  id: DocumentCategoryId;
  label: string;
  icon: string;
  description: string;
};

// El orden de este arreglo es el orden de las secciones en la vista "Por categoría".
export const documentCategories: DocumentCategory[] = [
  {
    id: 'marco',
    label: 'Marco del proyecto',
    icon: '📘',
    description: 'Documentos base: proyecto, grupo de investigación, presupuesto, avales y logo.',
  },
  {
    id: 'oficios',
    label: 'Oficios y resoluciones',
    icon: '📨',
    description: 'Comunicaciones oficiales, cambio de liderazgo e invitaciones.',
  },
  {
    id: 'actas',
    label: 'Actas y convocatorias',
    icon: '📝',
    description: 'Actas de reunión, convocatorias y registros de asistencia.',
  },
  {
    id: 'eventos',
    label: 'Eventos y capacitaciones',
    icon: '🎤',
    description: 'Informes y materiales de eventos, jornadas y capacitaciones.',
  },
  {
    id: 'certificados',
    label: 'Certificados',
    icon: '🎓',
    description: 'Certificados emitidos por capacitaciones.',
  },
  {
    id: 'informes-mensuales',
    label: 'Informes mensuales',
    icon: '📋',
    description: 'Reportes mensuales de actividades del proyecto.',
  },
  {
    id: 'informes-periodicos',
    label: 'Informes trimestrales y consolidados',
    icon: '📊',
    description: 'Informes trimestrales, ejecutivos y consolidados por período.',
  },
  {
    id: 'publicaciones',
    label: 'Publicaciones',
    icon: '📄',
    description: 'Artículos y publicaciones con acceso por DOI.',
  },
];

export const projectDocuments: ProjectDocument[] = [
  // ── Marco del proyecto ────────────────────────────────────────────────
  {
    id: 'proyecto-ajuste-curricular-sustantivo',
    title: 'Proyecto de Ajuste Curricular Sustantivo (PAA-06-F-008)',
    filename: '2024-01-05_ProyectoAjusteCurricularSustantivoPINE-signed.pdf',
    description: 'Documento oficial firmado (CES) de reducción a 8 niveles y ajuste del perfil de egreso de la carrera Pedagogía de los Idiomas Nacionales y Extranjeros.',
    icon: '📐',
    date: '2024-01-05',
    period: '2024-1',
    category: 'marco',
  },
  {
    id: 'ficha-presupuestaria',
    title: 'Ficha Presupuestaria 2025',
    filename: '2025_FICHA_PRESUPUESTARIA.pdf',
    description: 'Documento oficial de la ficha presupuestaria del proyecto 2025',
    icon: '💰',
    date: '2025-01-01',
    period: '2025-1',
    category: 'marco',
  },
  {
    id: 'aval-red',
    title: 'Aval de Red',
    filename: '2025-09-24_AvalRed.pdf',
    description: 'Aval de red académica al Proyecto de Innovaciones Pedagógicas e Internacionalización.',
    icon: '🌐',
    date: '2025-09-24',
    period: '2025-2',
    category: 'marco',
  },
  {
    id: 'proyecto-actualizado-2026',
    title: 'Proyecto de Innovaciones Pedagógicas e Internacionalización (Actualizado 2026)',
    filename: '2026-04-14_ProyectoActualizado.pdf',
    description: 'Documento marco institucional actualizado sobre el Proyecto de Innovaciones Pedagógicas e Internacionalización para el desarrollo sostenible.',
    icon: '📘',
    date: '2026-04-14',
    period: '2026-1',
    category: 'marco',
  },
  {
    id: 'grupo-investigacion-2026',
    title: 'Grupo de Investigación — Actualización 2026',
    filename: '2026_GrupoInvestigacion.pdf',
    description: 'Actualización del grupo de investigación "Innovaciones pedagógicas para el desarrollo sostenible: inclusión, interculturalidad e interdisciplinaridad".',
    icon: '🔬',
    date: '2026-05-15',
    period: '2026-1',
    category: 'marco',
  },
  {
    id: 'aporte-economico-externo-especies-2026',
    title: 'Aporte Económico Externo en Especies — 2026',
    filename: '2026-05-19_AporteEconomicoExternoEspecies-signed.pdf',
    description: 'Documento firmado de aporte económico externo en especies al proyecto (19 de mayo de 2026).',
    icon: '🤝',
    date: '2026-05-19',
    period: '2026-1',
    category: 'marco',
  },
  {
    id: 'logo-grupo-investigacion-completo',
    title: 'Logo Completo — Grupo de Investigación',
    filename: '2026_LogoGrupoCompleto.png',
    description: 'Versión completa del logo del Grupo de Investigación (uso interno/oficial, no para difusión web).',
    icon: '🖼️',
    date: '2026-06-08',
    period: '2026-1',
    category: 'marco',
  },

  // ── Oficios y resoluciones ────────────────────────────────────────────
  {
    id: 'oficio-cambio-lideres-proyectos-investigacion-2026',
    title: 'Oficio 20-2026-CIFEYT — Propuesta de cambio de líderes de proyectos',
    filename: '2026-06-01_OficioCambioLideresProyectosInvestigacion.pdf',
    description: 'Oficio de la Comisión de Investigación al Decano proponiendo al Dr. Arturo Rodríguez Zambrano como nuevo líder del proyecto en reemplazo del Dr. Jhonny Villafuerte (1 de junio de 2026).',
    icon: '📨',
    date: '2026-06-01',
    period: '2026-1',
    category: 'oficios',
  },
  {
    id: 'oficio-cobertura-conversatorio-disney',
    title: 'Oficio FET-DF-961-2026-PJQA — Cobertura del Conversatorio Experiencia Disney',
    filename: '2026-07-06_OficioSolicitudCoberturaConversatorioDisney.pdf',
    description: 'Solicitud del Decanato a Comunicación e Imagen Institucional para la cobertura del conversatorio «Experiencia Disney: Prácticas Preprofesionales que Trascienden Fronteras» (6 de julio de 2026).',
    icon: '📣',
    date: '2026-07-06',
    period: '2026-1',
    category: 'oficios',
  },
  {
    id: 'resolucion-148-cambio-liderazgo-2026',
    title: 'Resolución RCF-SO-002-N°148-2026 — Cambio de liderazgo del proyecto',
    filename: '2026-07-20_Resolucion148CambioLiderazgoInvestigacion-signed.pdf',
    description: 'Resolución firmada del Consejo de Facultad (sesión del 20 de julio de 2026) que aprueba el cambio de liderazgo del proyecto.',
    icon: '⚖️',
    date: '2026-07-20',
    period: '2026-1',
    category: 'oficios',
  },
  {
    id: 'oficio-037-notificacion-resolucion-148-2026',
    title: 'Oficio 037-CF-FET-2026-PJQA-N — Notificación de la Resolución 148',
    filename: '2026-07-22_OficioNotificacionResolucion148CambioLideres-signed.pdf',
    description: 'Oficio firmado del Consejo de Facultad que notifica la Resolución N° RCF-ET-SO-02-N°0148-2026 sobre el cambio de liderazgo (22 de julio de 2026).',
    icon: '📬',
    date: '2026-07-22',
    period: '2026-1',
    category: 'oficios',
  },
  {
    id: 'invitacion-conferencia-unesum-innova-2026',
    title: 'Invitación — Conferencia magistral UNESUM INNOVA 2026',
    filename: '2026-10-22_InvitacionConferenciaUNESUMInnova-signed.pdf',
    description: 'Oficio N.º 019 de la Dirección Académica de la UNESUM (30 de septiembre de 2026) que invita al Dr. Arturo Rodríguez Zambrano como conferencista magistral en el XIX Seminario de Trabajo Científico Metodológico UNESUM INNOVA 2026 (22 de octubre de 2026, 10h30–12h00). Respaldo de la contribución y la noticia correspondientes. Documento firmado.',
    icon: '🎤',
    date: '2026-10-22',
    period: '2026-2',
    category: 'oficios',
  },

  // ── Actas y convocatorias ─────────────────────────────────────────────
  {
    id: 'acta-tecnica-reunion-01',
    title: 'Acta Técnica de Reunión N°1 — 2025',
    filename: '2025_ActaTecnicaReunion01.pdf',
    description: 'Reasignación del liderazgo del proyecto e incorporación de nuevos integrantes al equipo. Regularización de la participación del Dr. Arturo Rodríguez Zambrano en el sistema institucional.',
    icon: '📝',
    date: '2025-05-22',
    period: '2025-1',
    category: 'actas',
  },
  {
    id: 'acta-interclase-2-junio-2026',
    title: 'Acta Interclase 2 — 2 de junio del 2026',
    filename: '2026_ActaInterclase2_02Junio.pdf',
    description: 'Acta de la sesión Interclase 2 donde se anunció el tema de la magia y se presentó el diagnóstico del proyecto.',
    icon: '📝',
    date: '2026-06-02',
    period: '2026-1',
    category: 'actas',
  },
  {
    id: 'convocatoria-docentes-10-junio-2026',
    title: 'Convocatoria Docentes — Socialización 10 de junio del 2026',
    filename: '2026_ConvocatoriaDocentes.pdf',
    description: 'Convocatoria docente para la socialización de proyectos de investigación, vinculación y tesis doctorales, realizada el miércoles 10 de junio de 2026 (10h00–14h30).',
    icon: '📢',
    date: '2026-06-10',
    period: '2026-1',
    category: 'actas',
  },
  {
    id: 'convocatoria-estudiantes-delegados-10-junio-2026',
    title: 'Convocatoria Estudiantes Delegados — Socialización 10 de junio del 2026',
    filename: '2026_ConvocatoriaEstudiantesDelegados.pdf',
    description: 'Convocatoria a estudiantes delegados para la socialización de proyectos de investigación, vinculación y tesis doctorales del 10 de junio de 2026, con registro fotográfico del evento.',
    icon: '📢',
    date: '2026-06-10',
    period: '2026-1',
    category: 'actas',
  },
  {
    id: 'acta-interclase-3-30-junio-2026',
    title: 'Acta Interclase 3 — 30 de junio del 2026',
    filename: '2026_ActaInterclase3_30Junio.pdf',
    description: 'Convocatoria y registro de asistencia de la InterClass de Innovación Didáctica en Educación Inicial y Pedagogía de Idiomas, con la docente Lucy López Bermeo.',
    icon: '📝',
    date: '2026-06-30',
    period: '2026-1',
    category: 'actas',
  },
  {
    id: 'asistencia-capacitacion-redaccion-articulos-02-julio-2026',
    title: 'Asistencia — Capacitación Redacción de Artículos Científicos, 2 de julio del 2026',
    filename: '2026_AsistenciaCapacitacionRedaccionArticulosCientificos.pdf',
    description: 'Registro de asistencia de la capacitación sobre redacción de artículos científicos, dictada por los docentes Jhonny Villafuerte y Arturo Rodríguez a la carrera de Lengua y Literatura, como contribución del proyecto PINE. Incluye registro fotográfico del evento.',
    icon: '📢',
    date: '2026-07-02',
    period: '2026-1',
    category: 'actas',
  },

  // ── Eventos y capacitaciones ──────────────────────────────────────────
  {
    id: 'fomento-escritura-creativa',
    title: 'Fomento de la Escritura Creativa 2026',
    filename: '2026_FomentoEscrituraCreativa.pdf',
    description: 'Evento donde estudiantes y docentes universitarios y del colegio Juan Montalvo presentaron productos y estrategias de lectura creativa.',
    icon: '✍️',
    date: '2026-04-28',
    period: '2026-1',
    category: 'eventos',
  },
  {
    id: 'jornada-academica-interdisciplinaria-24julio-2026',
    title: 'Jornada Académica Interdisciplinaria — Facultad de Educación y Turismo',
    filename: 'Informe_feriaInterdisciplinaria-signed.pdf',
    description: 'Informe detallado de la Jornada Académica Interdisciplinaria realizada el 24 de julio de 2026, organizada por las carreras de Educación Básica, Educación Inicial y Psicología Educativa. Incluye pósteres científicos, conferencias, dramatizaciones y expresiones artísticas. Documento firmado y certificado.',
    icon: '🎓',
    date: '2026-07-24',
    period: '2026-1',
    category: 'eventos',
  },
  {
    id: 'informe-socializacion-disney',
    title: 'Informe de Socialización — Disney',
    filename: 'Informe_sOCIALZACIÓN_dISNEY-signed.pdf',
    description: 'Informe de la actividad de socialización realizada con Disney. Documento firmado y certificado.',
    icon: '🎬',
    date: '2026-07-24',
    period: '2026-1',
    category: 'eventos',
  },
  {
    id: 'capacitacion-portal-pine-vinculacion',
    title: 'Capacitación — Portal PINE: Vinculación',
    filename: '2026-09-16_CapacitacionPortalPINE-Vinculacion.pptx',
    description: 'Diapositivas (16) de la capacitación «Guía para pasantes-instructores de Vinculación» sobre el uso del Portal PINE.',
    icon: '🎓',
    date: '2026-09-16',
    period: '2026-1',
    category: 'eventos',
  },

  // ── Certificados ──────────────────────────────────────────────────────
  {
    id: 'certificados-capacitacion-asier-romero-fet',
    title: 'Certificados — Capacitación Dr. Asier Romero Andonegi (FET)',
    filename: '2026-08-13_CertificadosCapacitacionAsierRomero-FET-signed.pdf',
    description: 'Certificados de la Facultad de Educación y Turismo a 14 docentes por la capacitación internacional dictada por el Dr. Asier Romero Andonegi (Universidad del País Vasco, UPV/EHU) en Manta del 4 al 13 de agosto de 2026: pensamiento crítico y uso pedagógico de la IA, análisis del discurso en español, y mentoría para el desarrollo profesional docente (40 horas académicas). Documento firmado y certificado.',
    icon: '🎓',
    date: '2026-08-13',
    period: '2026-1',
    category: 'certificados',
  },
  {
    id: 'certificados-doctorandos-ehu-asier-romero',
    title: 'Certificados — Doctorandos EHU/RED-LEA, capacitación Dr. Asier Romero',
    filename: '2026-08-13_CertificadosDoctorandosEHU-AsierRomero-signed.pdf',
    description: 'Certificados de la Red de Investigación Científica sobre Comprensión Lectora y Escritura Académica y Creativa (RED-LEA) a 4 doctorandos EHU/UPV por la capacitación "Didácticas y uso ético de la Inteligencia Artificial en el contexto universitario", dictada por el Dr. Asier Romero Andonegi en Manta del 4 al 13 de agosto de 2026 (40 horas académicas). Incluye certificado de Arturo Rodríguez Zambrano. Documento firmado y certificado.',
    icon: '🎓',
    date: '2026-08-13',
    period: '2026-1',
    category: 'certificados',
  },

  // ── Informes mensuales ────────────────────────────────────────────────
  {
    id: 'informe-actividades-abril-2026',
    title: 'Informe de Actividades — Abril 2026',
    filename: '2026_InformeActividadesAbril.pdf',
    description: 'Informe mensual de actividades del proyecto correspondiente a abril 2026.',
    icon: '📋',
    date: '2026-04-30',
    period: '2026-1',
    category: 'informes-mensuales',
  },
  {
    id: 'informe-mensual-comision-mayo-2026',
    title: 'Informe Mensual de Comisión — Mayo 2026',
    filename: '2026_InformeMensualComision_Mayo.pdf',
    description: 'Informe mensual de comisión correspondiente a mayo 2026.',
    icon: '📋',
    date: '2026-05-31',
    period: '2026-1',
    category: 'informes-mensuales',
  },
  {
    id: 'informe-mensual-junio-2026-sin-firma',
    title: 'Informe Mensual de Actividades — Junio 2026 (versión sin firma)',
    filename: '2026_InformeMensual_Junio.pdf',
    description: 'Informe de actividades de la Comisión de Aseguramiento de la Calidad correspondiente a junio 2026. Detalla 6 actividades cumplidas: 3 publicaciones científicas, 2 eventos de socialización y 1 sesión académica. Dirigido a la carrera PINE.',
    icon: '📋',
    date: '2026-06-30',
    period: '2026-1',
    category: 'informes-mensuales',
  },
  {
    id: 'informe-mensual-junio-2026',
    title: 'Informe Mensual de Actividades — Junio 2026 (firmado)',
    filename: '2026_InformeMensual_Junio-signed.pdf',
    description: 'Informe mensual de la Comisión de Aseguramiento de la Calidad para junio 2026. Detalla 6 actividades cumplidas: 3 publicaciones científicas, 2 eventos de socialización y 1 sesión académica. Documento firmado.',
    icon: '📋',
    date: '2026-06-30',
    period: '2026-1',
    category: 'informes-mensuales',
  },
  {
    id: 'informe-mensual-comision-julio-2026',
    title: 'Informe Mensual de Comisión — Julio 2026',
    filename: '2026_InformeMensualComision_Julio.pdf',
    description: 'Informe mensual de comisión correspondiente a julio 2026. Detalla 6 actividades cumplidas: capacitación en redacción de artículos, jornada académica interdisciplinaria, producción de 5 episodios de podcast, registro de 3 publicaciones científicas, creación de nueva categoría de podcast "Más Allá del Lienzo" e incorporación de nuevo miembro al equipo. Documento firmado por el líder del proyecto.',
    icon: '📋',
    date: '2026-08-03',
    period: '2026-1',
    category: 'informes-mensuales',
  },
  {
    id: 'informe-mensual-comision-agosto-2026',
    title: 'Informe Mensual de Comisión — Agosto 2026',
    filename: '2026-09-04_InformeMensualComision_Agosto-signed.pdf',
    description: 'Informe mensual de comisión correspondiente a agosto 2026. Detalla el lanzamiento del Portal PINE (Neon Postgres) con autenticación unificada y módulos de Vinculación/Investigación/Gestión de Carrera, la capacitación internacional de 40 horas con el Dr. Asier Romero Andonegi (UPV/EHU) con 18 personas certificadas, 2 publicaciones científicas y 2 episodios de podcast. Documento firmado por el líder del proyecto.',
    icon: '📋',
    date: '2026-09-04',
    period: '2026-1',
    category: 'informes-mensuales',
  },
  {
    id: 'informe-mensual-investigacion-octubre-2026',
    title: 'Informe Mensual de Actividades — Octubre 2026',
    filename: '2026-10-31_InformeMensualInvestigacion-signed.pdf',
    description: 'Reporte mensual del líder de proyecto para octubre 2026: 18 actividades registradas, 9 episodios de podcast, conferencia magistral en UNESUM INNOVA 2026, IV Congreso Internacional INEDUS, 15 horas de apoyo estudiantil, 1 artículo y 10 ponencias. Documento firmado por el líder del proyecto.',
    icon: '📋',
    date: '2026-10-31',
    period: '2026-2',
    category: 'informes-mensuales',
  },

  // ── Informes trimestrales y consolidados ──────────────────────────────
  {
    id: 'informe-trimestral-jul-sep-2025',
    title: 'Informe Trimestral — Trimestre 3 (Julio-Septiembre 2025)',
    filename: '__2025_3 INFORME TRIMESTRE JUL SEP_____.pdf',
    description: 'Informe trimestral correspondiente al tercer trimestre de 2025 (julio-septiembre), período inicial del proyecto PINE.',
    icon: '📊',
    date: '2025-09-30',
    period: '2025-2',
    category: 'informes-periodicos',
  },
  {
    id: 'informe-trimestral-oct-dic-2025',
    title: 'Informe Trimestral — Trimestre 4 (Octubre-Diciembre 2025)',
    filename: '__2025_4 INFORME TRIMESTRE OCT-DIC_____.pdf',
    description: 'Informe trimestral correspondiente al cuarto trimestre de 2025 (octubre-diciembre), cierre del primer año del proyecto PINE.',
    icon: '📊',
    date: '2025-12-31',
    period: '2025-2',
    category: 'informes-periodicos',
  },
  {
    id: 'informe-ejecutivo-drp-2025',
    title: 'Informe Ejecutivo — DRP 2025',
    filename: 'Informe-Ejetutivo-DRP.pdf',
    description: 'Informe ejecutivo del proyecto durante 2025.',
    icon: '📄',
    date: '2025-12-31',
    period: '2025-2',
    category: 'informes-periodicos',
  },
  {
    id: 'informe-consolidado-eidpa-2026-1',
    title: 'Informe Consolidado EIDPA 2026-1 — Funciones Sustantivas',
    filename: '2026_1_Informe_Consolidado-signed.pdf',
    description: 'Informe consolidado de cumplimiento de actividades de investigación y vinculación. Período: Enero-Junio 2026. Dirigido a la Comisión de Aseguramiento de la Calidad. Documento firmado y certificado.',
    icon: '📑',
    date: '2026-07-13',
    period: '2026-1',
    category: 'informes-periodicos',
  },

  // ── Publicaciones ─────────────────────────────────────────────────────
  {
    id: 'pub-lascano-villafuerte-confidence-2026',
    title: 'Confidence and Formal Speech in High School Students in English Language: Mentoring in EFL instruction',
    filename: 'https://doi.org/10.32996/jeltal.2026.8.8.13',
    description: 'Lascano Parrales, M. J., & Villafuerte-Holguín, J. (2026). Publicación en Journal of English Language Teaching and Applied Linguistics, 8(8), 142–156. Acceso mediante DOI.',
    icon: '📄',
    date: '2026-08-01',
    period: '2026-1',
    category: 'publicaciones',
  },
];
