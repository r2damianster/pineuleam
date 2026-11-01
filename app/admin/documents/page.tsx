import Link from 'next/link';

type Doc = { id: string; title: string; filename: string; description: string; icon: string; date: string; period: string };

function DocCard({ doc }: { doc: Doc }) {
  const isExternalUrl = doc.filename.startsWith('http://') || doc.filename.startsWith('https://');
  const fileUrl = isExternalUrl ? doc.filename : `/admin-assets/${doc.filename}`;
  const isPdf = doc.filename.toLowerCase().endsWith('.pdf');
  const buttonLabel = isExternalUrl ? 'Acceder' : isPdf ? 'Ver PDF' : 'Abrir';

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition">
      <div className="flex items-start space-x-4">
        <div className="text-5xl">{doc.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-gray-900">{doc.title}</h3>
            <span className="inline-block px-2 py-1 text-xs font-semibold bg-uleam-blue/10 text-uleam-blue rounded">{doc.period}</span>
          </div>
          <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date(doc.date).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="mt-2 text-sm text-gray-600">{doc.description}</p>
          <div className="mt-4 flex gap-3">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-uleam-blue text-white rounded-lg hover:bg-blue-800 transition text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {buttonLabel}
            </a>
            {!isExternalUrl && (
              <a
                href={fileUrl}
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const documents = {
  proyecto: [
    {
      id: 'ficha-presupuestaria',
      title: 'Ficha Presupuestaria 2025',
      filename: '2025_FICHA_PRESUPUESTARIA.pdf',
      description: 'Documento oficial de la ficha presupuestaria del proyecto 2025',
      icon: '💰',
      date: '2025-01-01',
      period: '2025-1',
    },
    {
      id: 'acta-tecnica-reunion-01',
      title: 'Acta Técnica de Reunión N°1 — 2025',
      filename: '2025_ActaTecnicaReunion01.pdf',
      description: 'Reasignación del liderazgo del proyecto e incorporación de nuevos integrantes al equipo. Regularización de la participación del Dr. Arturo Rodríguez Zambrano en el sistema institucional.',
      icon: '📝',
      date: '2025-05-22',
      period: '2025-1',
    },
    {
      id: 'grupo-investigacion-2026',
      title: 'Grupo de Investigación — Actualización 2026',
      filename: '2026_GrupoInvestigacion.pdf',
      description: 'Actualización del grupo de investigación "Innovaciones pedagógicas para el desarrollo sostenible: inclusión, interculturalidad e interdisciplinaridad".',
      icon: '🔬',
      date: '2026-05-15',
      period: '2026-1',
    },
    {
      id: 'aporte-economico-externo-especies-2026',
      title: 'Aporte Económico Externo en Especies — 2026',
      filename: '2026-05-19_AporteEconomicoExternoEspecies-signed.pdf',
      description: 'Documento firmado de aporte económico externo en especies al proyecto (19 de mayo de 2026).',
      icon: '🤝',
      date: '2026-05-19',
      period: '2026-1',
    },
    {
      id: 'invitacion-conferencia-unesum-innova-2026',
      title: 'Invitación — Conferencia magistral UNESUM INNOVA 2026',
      filename: '2026-10-22_InvitacionConferenciaUNESUMInnova-signed.pdf',
      description: 'Oficio N.º 019 de la Dirección Académica de la UNESUM (30 de septiembre de 2026) que invita al Dr. Arturo Rodríguez Zambrano como conferencista magistral en el XIX Seminario de Trabajo Científico Metodológico UNESUM INNOVA 2026 (22 de octubre de 2026, 10h30–12h00). Respaldo de la contribución y la noticia correspondientes. Documento firmado.',
      icon: '🎤',
      date: '2026-10-22',
      period: '2026-2',
    },
    {
      id: 'proyecto-actualizado-2026',
      title: 'Proyecto de Innovaciones Pedagógicas e Internacionalización (Actualizado 2026)',
      filename: '2026-04-14_ProyectoActualizado.pdf',
      description: 'Documento marco institucional actualizado sobre el Proyecto de Innovaciones Pedagógicas e Internacionalización para el desarrollo sostenible.',
      icon: '📘',
      date: '2026-04-14',
      period: '2026-1',
    },
    {
      id: 'aval-red',
      title: 'Aval de Red',
      filename: '2025-09-24_AvalRed.pdf',
      description: 'Aval de red académica al Proyecto de Innovaciones Pedagógicas e Internacionalización.',
      icon: '🌐',
      date: '2025-09-24',
      period: '2025-2',
    },
    {
      id: 'proyecto-ajuste-curricular-sustantivo',
      title: 'Proyecto de Ajuste Curricular Sustantivo (PAA-06-F-008)',
      filename: '2024-01-05_ProyectoAjusteCurricularSustantivoPINE-signed.pdf',
      description: 'Documento oficial firmado (CES) de reducción a 8 niveles y ajuste del perfil de egreso de la carrera Pedagogía de los Idiomas Nacionales y Extranjeros.',
      icon: '📐',
      date: '2024-01-05',
      period: '2024-1',
    },
    {
      id: 'oficio-cambio-lideres-proyectos-investigacion-2026',
      title: 'Oficio 20-2026-CIFEYT — Propuesta de cambio de líderes de proyectos',
      filename: '2026-06-01_OficioCambioLideresProyectosInvestigacion.pdf',
      description: 'Oficio de la Comisión de Investigación al Decano proponiendo al Dr. Arturo Rodríguez Zambrano como nuevo líder del proyecto en reemplazo del Dr. Jhonny Villafuerte (1 de junio de 2026).',
      icon: '📨',
      date: '2026-06-01',
      period: '2026-1',
    },
    {
      id: 'resolucion-148-cambio-liderazgo-2026',
      title: 'Resolución RCF-SO-002-N°148-2026 — Cambio de liderazgo del proyecto',
      filename: '2026-07-20_Resolucion148CambioLiderazgoInvestigacion-signed.pdf',
      description: 'Resolución firmada del Consejo de Facultad (sesión del 20 de julio de 2026) que aprueba el cambio de liderazgo del proyecto.',
      icon: '⚖️',
      date: '2026-07-20',
      period: '2026-1',
    },
    {
      id: 'oficio-037-notificacion-resolucion-148-2026',
      title: 'Oficio 037-CF-FET-2026-PJQA-N — Notificación de la Resolución 148',
      filename: '2026-07-22_OficioNotificacionResolucion148CambioLideres-signed.pdf',
      description: 'Oficio firmado del Consejo de Facultad que notifica la Resolución N° RCF-ET-SO-02-N°0148-2026 sobre el cambio de liderazgo (22 de julio de 2026).',
      icon: '📬',
      date: '2026-07-22',
      period: '2026-1',
    },
  ],
  vinculacion: [
    {
      id: 'capacitacion-portal-pine-vinculacion',
      title: 'Capacitación — Portal PINE: Vinculación',
      filename: '2026-09-16_CapacitacionPortalPINE-Vinculacion.pptx',
      description: 'Diapositivas (16) de la capacitación «Guía para pasantes-instructores de Vinculación» sobre el uso del Portal PINE.',
      icon: '🎓',
      date: '2026-09-16',
      period: '2026-1',
    },
  ],
  actividades: [
    {
      id: 'fomento-escritura-creativa',
      title: 'Fomento de la Escritura Creativa 2026',
      filename: '2026_FomentoEscrituraCreativa.pdf',
      description: 'Evento donde estudiantes y docentes universitarios y del colegio Juan Montalvo presentaron productos y estrategias de lectura creativa.',
      icon: '✍️',
      date: '2026-04-28',
      period: '2026-1',
    },
    {
      id: 'convocatoria-docentes-10-junio-2026',
      title: 'Convocatoria Docentes — Socialización 10 de junio del 2026',
      filename: '2026_ConvocatoriaDocentes.pdf',
      description: 'Convocatoria docente para la socialización de proyectos de investigación, vinculación y tesis doctorales, realizada el miércoles 10 de junio de 2026 (10h00–14h30).',
      icon: '📢',
      date: '2026-06-10',
      period: '2026-1',
    },
    {
      id: 'convocatoria-estudiantes-delegados-10-junio-2026',
      title: 'Convocatoria Estudiantes Delegados — Socialización 10 de junio del 2026',
      filename: '2026_ConvocatoriaEstudiantesDelegados.pdf',
      description: 'Convocatoria a estudiantes delegados para la socialización de proyectos de investigación, vinculación y tesis doctorales del 10 de junio de 2026, con registro fotográfico del evento.',
      icon: '📢',
      date: '2026-06-10',
      period: '2026-1',
    },
    {
      id: 'acta-interclase-2-junio-2026',
      title: 'Acta Interclase 2 — 2 de junio del 2026',
      filename: '2026_ActaInterclase2_02Junio.pdf',
      description: 'Acta de la sesión Interclase 2 donde se anunció el tema de la magia y se presentó el diagnóstico del proyecto.',
      icon: '📝',
      date: '2026-06-02',
      period: '2026-1',
    },
    {
      id: 'acta-interclase-3-30-junio-2026',
      title: 'Acta Interclase 3 — 30 de junio del 2026',
      filename: '2026_ActaInterclase3_30Junio.pdf',
      description: 'Convocatoria y registro de asistencia de la InterClass de Innovación Didáctica en Educación Inicial y Pedagogía de Idiomas, con la docente Lucy López Bermeo.',
      icon: '📝',
      date: '2026-06-30',
      period: '2026-1',
    },
    {
      id: 'asistencia-capacitacion-redaccion-articulos-02-julio-2026',
      title: 'Asistencia — Capacitación Redacción de Artículos Científicos, 2 de julio del 2026',
      filename: '2026_AsistenciaCapacitacionRedaccionArticulosCientificos.pdf',
      description: 'Registro de asistencia de la capacitación sobre redacción de artículos científicos, dictada por los docentes Jhonny Villafuerte y Arturo Rodríguez a la carrera de Lengua y Literatura, como contribución del proyecto PINE. Incluye registro fotográfico del evento.',
      icon: '📢',
      date: '2026-07-02',
      period: '2026-1',
    },
    {
      id: 'informe-mensual-junio-2026',
      title: 'Informe Mensual de Actividades — Junio 2026',
      filename: '2026_InformeMensual_Junio.pdf',
      description: 'Informe de actividades de la Comisión de Aseguramiento de la Calidad correspondiente a junio 2026. Detalla 6 actividades cumplidas: 3 publicaciones científicas, 2 eventos de socialización y 1 sesión académica. Dirigido a la carrera PINE.',
      icon: '📋',
      date: '2026-06-30',
      period: '2026-1',
    },
    {
      id: 'oficio-cobertura-conversatorio-disney',
      title: 'Oficio FET-DF-961-2026-PJQA — Cobertura del Conversatorio Experiencia Disney',
      filename: '2026-07-06_OficioSolicitudCoberturaConversatorioDisney.pdf',
      description: 'Solicitud del Decanato a Comunicación e Imagen Institucional para la cobertura del conversatorio «Experiencia Disney: Prácticas Preprofesionales que Trascienden Fronteras» (6 de julio de 2026).',
      icon: '📣',
      date: '2026-07-06',
      period: '2026-1',
    },
    {
      id: 'informe-socializacion-disney',
      title: 'Informe de Socialización — Disney',
      filename: 'Informe_sOCIALZACIÓN_dISNEY-signed.pdf',
      description: 'Informe de la actividad de socialización realizada con Disney. Documento firmado y certificado.',
      icon: '🎬',
      date: '2026-07-24',
      period: '2026-1',
    },
    {
      id: 'jornada-academica-interdisciplinaria-24julio-2026',
      title: 'Jornada Académica Interdisciplinaria — Facultad de Educación y Turismo',
      filename: 'Informe_feriaInterdisciplinaria-signed.pdf',
      description: 'Informe detallado de la Jornada Académica Interdisciplinaria realizada el 24 de julio de 2026, organizada por las carreras de Educación Básica, Educación Inicial y Psicología Educativa. Incluye pósteres científicos, conferencias, dramatizaciones y expresiones artísticas. Documento firmado y certificado.',
      icon: '🎓',
      date: '2026-07-24',
      period: '2026-1',
    },
    {
      id: 'certificados-capacitacion-asier-romero-fet',
      title: 'Certificados — Capacitación Dr. Asier Romero Andonegi (FET)',
      filename: '2026-08-13_CertificadosCapacitacionAsierRomero-FET-signed.pdf',
      description: 'Certificados de la Facultad de Educación y Turismo a 14 docentes por la capacitación internacional dictada por el Dr. Asier Romero Andonegi (Universidad del País Vasco, UPV/EHU) en Manta del 4 al 13 de agosto de 2026: pensamiento crítico y uso pedagógico de la IA, análisis del discurso en español, y mentoría para el desarrollo profesional docente (40 horas académicas). Documento firmado y certificado.',
      icon: '🎓',
      date: '2026-08-13',
      period: '2026-1',
    },
    {
      id: 'certificados-doctorandos-ehu-asier-romero',
      title: 'Certificados — Doctorandos EHU/RED-LEA, capacitación Dr. Asier Romero',
      filename: '2026-08-13_CertificadosDoctorandosEHU-AsierRomero-signed.pdf',
      description: 'Certificados de la Red de Investigación Científica sobre Comprensión Lectora y Escritura Académica y Creativa (RED-LEA) a 4 doctorandos EHU/UPV por la capacitación "Didácticas y uso ético de la Inteligencia Artificial en el contexto universitario", dictada por el Dr. Asier Romero Andonegi en Manta del 4 al 13 de agosto de 2026 (40 horas académicas). Incluye certificado de Arturo Rodríguez Zambrano. Documento firmado y certificado.',
      icon: '🎓',
      date: '2026-08-13',
      period: '2026-1',
    },
  ],
  informes: [
    {
      id: 'informe-trimestral-jul-sep-2025',
      title: 'Informe Trimestral — Trimestre 3 (Julio-Septiembre 2025)',
      filename: '__2025_3 INFORME TRIMESTRE JUL SEP_____.pdf',
      description: 'Informe trimestral correspondiente al tercer trimestre de 2025 (julio-septiembre), período inicial del proyecto PINE.',
      icon: '📊',
      date: '2025-09-30',
      period: '2025-2',
    },
    {
      id: 'informe-trimestral-oct-dic-2025',
      title: 'Informe Trimestral — Trimestre 4 (Octubre-Diciembre 2025)',
      filename: '__2025_4 INFORME TRIMESTRE OCT-DIC_____.pdf',
      description: 'Informe trimestral correspondiente al cuarto trimestre de 2025 (octubre-diciembre), cierre del primer año del proyecto PINE.',
      icon: '📊',
      date: '2025-12-31',
      period: '2025-2',
    },
    {
      id: 'informe-ejecutivo-drp-2025',
      title: 'Informe Ejecutivo — DRP 2025',
      filename: 'Informe-Ejetutivo-DRP.pdf',
      description: 'Informe ejecutivo del proyecto durante 2025.',
      icon: '📄',
      date: '2025-12-31',
      period: '2025-2',
    },
    {
      id: 'informe-actividades-abril-2026',
      title: 'Informe de Actividades — Abril 2026',
      filename: '2026_InformeActividadesAbril.pdf',
      description: 'Informe mensual de actividades del proyecto correspondiente a abril 2026.',
      icon: '📋',
      date: '2026-04-30',
      period: '2026-1',
    },
    {
      id: 'informe-mensual-comision-mayo-2026',
      title: 'Informe Mensual de Comisión — Mayo 2026',
      filename: '2026_InformeMensualComision_Mayo.pdf',
      description: 'Informe mensual de comisión correspondiente a mayo 2026.',
      icon: '📋',
      date: '2026-05-31',
      period: '2026-1',
    },
    {
      id: 'logo-grupo-investigacion-completo',
      title: 'Logo Completo — Grupo de Investigación',
      filename: '2026_LogoGrupoCompleto.png',
      description: 'Versión completa del logo del Grupo de Investigación (uso interno/oficial, no para difusión web).',
      icon: '🖼️',
      date: '2026-06-08',
      period: '2026-1',
    },
    {
      id: 'informe-consolidado-eidpa-2026-1',
      title: 'Informe Consolidado EIDPA 2026-1 — Funciones Sustantivas',
      filename: '2026_1_Informe_Consolidado-signed.pdf',
      description: 'Informe consolidado de cumplimiento de actividades de investigación y vinculación. Período: Enero-Junio 2026. Dirigido a la Comisión de Aseguramiento de la Calidad. Documento firmado y certificado.',
      icon: '📑',
      date: '2026-07-13',
      period: '2026-1',
    },
    {
      id: 'informe-mensual-junio-2026',
      title: 'Informe Mensual de Actividades — Junio 2026',
      filename: '2026_InformeMensual_Junio-signed.pdf',
      description: 'Informe mensual de la Comisión de Aseguramiento de la Calidad para junio 2026. Detalla 6 actividades cumplidas: 3 publicaciones científicas, 2 eventos de socialización y 1 sesión académica. Documento firmado.',
      icon: '📋',
      date: '2026-06-30',
      period: '2026-1',
    },
    {
      id: 'informe-mensual-comision-julio-2026',
      title: 'Informe Mensual de Comisión — Julio 2026',
      filename: '2026_InformeMensualComision_Julio.pdf',
      description: 'Informe mensual de comisión correspondiente a julio 2026. Detalla 6 actividades cumplidas: capacitación en redacción de artículos, jornada académica interdisciplinaria, producción de 5 episodios de podcast, registro de 3 publicaciones científicas, creación de nueva categoría de podcast "Más Allá del Lienzo" e incorporación de nuevo miembro al equipo. Documento firmado por el líder del proyecto.',
      icon: '📋',
      date: '2026-08-03',
      period: '2026-1',
    },
    {
      id: 'informe-mensual-comision-agosto-2026',
      title: 'Informe Mensual de Comisión — Agosto 2026',
      filename: '2026-09-04_InformeMensualComision_Agosto-signed.pdf',
      description: 'Informe mensual de comisión correspondiente a agosto 2026. Detalla el lanzamiento del Portal PINE (Neon Postgres) con autenticación unificada y módulos de Vinculación/Investigación/Gestión de Carrera, la capacitación internacional de 40 horas con el Dr. Asier Romero Andonegi (UPV/EHU) con 18 personas certificadas, 2 publicaciones científicas y 2 episodios de podcast. Documento firmado por el líder del proyecto.',
      icon: '📋',
      date: '2026-09-04',
      period: '2026-1',
    },
    {
      id: 'informe-mensual-investigacion-octubre-2026',
      title: 'Informe Mensual de Actividades — Octubre 2026',
      filename: '2026-10-31_InformeMensualInvestigacion-signed.pdf',
      description: 'Reporte mensual del líder de proyecto para octubre 2026: 18 actividades registradas, 9 episodios de podcast, conferencia magistral en UNESUM INNOVA 2026, IV Congreso Internacional INEDUS, 15 horas de apoyo estudiantil, 1 artículo y 10 ponencias. Documento firmado por el líder del proyecto.',
      icon: '📋',
      date: '2026-10-31',
      period: '2026-2',
    },
    {
      id: 'pub-lascano-villafuerte-confidence-2026',
      title: 'Confidence and Formal Speech in High School Students in English Language: Mentoring in EFL instruction',
      filename: 'https://doi.org/10.32996/jeltal.2026.8.8.13',
      description: 'Lascano Parrales, M. J., & Villafuerte-Holguín, J. (2026). Publicación en Journal of English Language Teaching and Applied Linguistics, 8(8), 142–156. Acceso mediante DOI.',
      icon: '📄',
      date: '2026-08-01',
      period: '2026-1',
    },
  ],
};

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documentos del Proyecto</h1>
          <p className="mt-2 text-sm text-gray-600">
            Acceso exclusivo para administradores - Documentos confidenciales del proyecto
          </p>
        </div>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
        >
          ← Volver al Dashboard
        </Link>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Confidencial:</strong> Estos documentos son exclusivos del equipo administrativo. 
              No compartir externamente.
            </p>
          </div>
        </div>
      </div>

      {/* Documentos del Proyecto */}
      <div>
        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span>📁</span> Documentos Generales
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {documents.proyecto.map((doc) => (
            <DocCard key={doc.id} doc={doc} />
          ))}
        </div>
      </div>

      {/* Vinculación */}
      <div>
        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span>🤝</span> Vinculación
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {documents.vinculacion.map((doc) => (
            <DocCard key={doc.id} doc={doc} />
          ))}
        </div>
      </div>

      {/* Actividades */}
      <div>
        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span>🗂️</span> Actividades
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {documents.actividades.map((doc) => (
            <DocCard key={doc.id} doc={doc} />
          ))}
        </div>
      </div>

      {/* Informes por Período */}
      <div>
        <h2 className="text-xl font-bold text-gray-700 mb-6 flex items-center gap-2">
          <span>📊</span> Informes por Período Académico
        </h2>

        {/* Período 2025-2 (Sep-Ene) */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-600 mb-4 pl-4 border-l-4 border-uleam-blue">
            Período 2025-2 (Septiembre 2025 - Enero 2026)
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            {documents.informes.filter((doc) => doc.period === '2025-2').map((doc) => (
              <DocCard key={doc.id} doc={doc} />
            ))}
          </div>
        </div>

        {/* Período 2026-1 (Ene-Ago) */}
        <div>
          <h3 className="text-lg font-semibold text-gray-600 mb-4 pl-4 border-l-4 border-uleam-blue">
            Período 2026-1 (Enero 2026 - Agosto 2026)
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            {documents.informes.filter((doc) => doc.period === '2026-1').map((doc) => (
              <DocCard key={doc.id} doc={doc} />
            ))}
          </div>
        </div>

        {/* Período 2026-2 (Sep-Dic) */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-600 mb-4 pl-4 border-l-4 border-uleam-blue">
            Período 2026-2 (Septiembre 2026 - Diciembre 2026)
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            {documents.informes.filter((doc) => doc.period === '2026-2').map((doc) => (
              <DocCard key={doc.id} doc={doc} />
            ))}
          </div>
        </div>
      </div>

      {/* Info Section */}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">ℹ️ Información</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Los archivos PDF se abren en una nueva pestaña para visualización</li>
          <li>• Use el botón "Descargar" para guardar una copia local</li>
          <li>• Estos documentos están protegidos y solo accesibles desde el panel de administración</li>
          <li>• Para agregar nuevos documentos, colóquelos en la carpeta <code className="bg-blue-100 px-2 py-0.5 rounded">/public/admin-assets/</code></li>
        </ul>
      </div>
    </div>
  );
}
