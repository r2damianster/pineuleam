# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- **Buscador de revistas diamante** (`/utilidades/revistas`): sugiere revistas de acceso abierto sin costo según título (obligatorio), resumen, abstract, keywords y referencias; ranking por afinidad temática, referencias (Crossref) y cuartil, con explicación por revista y exportación CSV. Nueva tabla `revistas_diamante` (catálogo de la Universitat de València, Zenodo https://zenodo.org/records/22763970, enriquecido con OpenAlex).

- Sumar las horas autónomas aprobadas a `GET /api/admin/stats` (Dashboard PINE), indicadores de supervisión, tarjeta "Mi Avance" del dashboard y `/api/estudiantes` (hoy solo suman en `/portal/mi-avance`).
- Aviso opcional al pasante cuando el supervisor rechaza una actividad autónoma o de investigación (hoy solo avisa por asistencia rechazada).
- Completar la zona (Cantón/Parroquia/Barrio/Ubicación) de los espacios "Cross Worlds for Connections", "Fundación Submarino Amarillo" y "UE Manuela Cañizares Speaking Club" en `/vinculacion/espacios` (no confirmados, quedaron sin dato a propósito).

## [0.12.14] - 2026-09-29 (Sesión 57 — Informe Mensual de Vinculación, adicional al semestral)

### ✨ Added
- `lib/informeMensualTareas.ts` + `app/vinculacion/informes/_lib/docxMensual.ts` — informe MENSUAL (líder y supervisor) por mes calendario: beneficiarios y sexo por espacio, zona por espacio, actividades narrativas del mes, evidencias fotográficas. Adicional al informe semestral (marco lógico), no lo reemplaza — sub-selector "Semestral | Mensual" en cada pestaña de `/vinculacion/informes`.
- `espacios_enseñanza.zona_canton/zona_parroquia/zona_barrio/zona_ubicacion` (`scripts/migrate-zona-espacios.js`) — editable en `/vinculacion/espacios`.
- `informes_vinculacion.tipo` acepta `lider-mensual`/`supervisor-mensual` (`scripts/migrate-informes-mensuales-vinculacion.js`).

### 🐛 Fixed
- Notificación `informe-supervisor-pendiente` (`lib/notificaciones.ts`) comparaba contra `informes_vinculacion.mes`, columna que el informe semestral deja `NULL` a propósito desde la Sesión 56 — el aviso disparaba siempre, sin importar si el informe ya se había generado. Ahora compara por `ciclo_id` del periodo fijo anterior.
- Dashboard (`/portal/dashboard`) decía "Informe Mensual del Supervisor" para un informe que ya era semestral desde la Sesión 56 — corregido el texto del enlace.

## [0.12.12] - 2026-09-27 (Sesión 55 — dedupe en tiempo real, checklists conscientes, subaulas, auditoría IA)

### ✨ Added
- `lib/similitudRegistros.ts` — motor de similitud (Levenshtein + Jaccard, sin dependencias externas) para Asistencia/Difusión/Beneficiario, y `POST /api/vinculacion/verificar-similitud` (verificación previa, solo lectura). Umbrales fijos: ≥90% bloqueo total, 70-89% aviso con confirmación explícita (`confirmado_similitud`), <70% sin fricción. Mismo gate cableado como verificación final en `POST /api/espacios/asistencia`, `POST /api/difusion` y `POST /api/beneficiarios/registrar-y-evaluar`.
- Bloqueo duro de concurrencia: un beneficiario no puede quedar presente en dos espacios con horario dentro de un margen de 2h — se desmarca automático en el frontend y se rechaza (409) si se fuerza en el POST real.
- `components/ResumenValidacionModal.tsx` — resumen + confirmación explícita antes de guardar, reusado en los 3 flujos.
- Subaulas opcionales por espacio de Vinculación: tabla `aulas`, `espacios_enseñanza.usa_aulas`, `aula_id` en `espacio_instructores`/`inscripciones_espacio` (`scripts/migrate-aulas.js`). API `app/api/espacios/[id]/aulas[/[aulaId]]`, gestionable solo por el líder de Vinculación/superadmin (`lib/modulos.ts:puedeGestionarVinculacion`).
- Auditoría IA (Groq vision, `lib/groqVision.ts`) de la foto de asistencia — solo informativa, nunca bloquea; degrada con elegancia si se agota la cuota (`auditoria_ia_estado='no_disponible'`). Columnas nuevas en `asistencia_espacio` (`scripts/migrate-auditoria-ia-asistencia.js`), badge en `/vinculacion/supervisar`.

### 🔧 Changed
- `/vinculacion/asistencia`: los checklists de beneficiarios/titulares/invitados nacen desmarcados (antes preseleccionaba todo); el formulario se reestructuró en verificar → confirmar (resumen) → guardar.
- `GET /api/beneficiarios` y `GET /api/espacios/instructores` aceptan `aula_id` opcional para acotar por subaula.

## [0.12.11] - 2026-09-27 (Sesión 54 — tope preventivo de invitados en asistencia)

### ✨ Added
- `lib/topeInvitadosAsistencia.ts:calcularTopeInvitados()` — techo preventivo al número de pasantes invitados por sesión de asistencia, según beneficiarios y titulares presentes (`ceil(beneficiarios/2) - titulares`, piso de 1 si no hay titulares presentes). No es una regla reactiva a un caso de abuso puntual: previene a futuro sin bloquear cobertura real de ausencias ni apoyo frecuente a un espacio con demanda genuina. `POST /api/espacios/asistencia` rechaza con 400 si se excede, sin revelar el número calculado. Ver CLAUDE.md → Sesión 54.

## [0.12.10] - 2026-09-27 (Sesión 53, continuación — H1 + QR líder/colíder)

### ✨ Added
- `puedeGenerarEnlaceDifusion` (`lib/permisos-enlace-difusion.ts`) ahora también deja generar el QR/enlace de acceso temporal a cualquier líder/colíder de un proyecto (`proyectosGestionables`), no solo a quien tenga módulo `vinculacion`/`investigacion`/`contenido_sitio`. `GET /api/auth/me` expone `puede_generar_enlace` calculado en el servidor; `/vinculacion/difusion` y `/gestion-carrera` lo consumen en vez de duplicar la lógica en el cliente.

### 🔧 Changed
- **Reconectado `lib/permisosPertenencia.ts`** (H1, desconectado sin darse cuenta desde un auto-commit posterior a la Sesión 51): `PATCH /api/admin/roles` (para docentes) y `POST/PATCH /api/members` ahora llaman `recalcularModulos()` tras cualquier cambio de rol en `proyecto_miembros` — asignar/quitar líder, colíder o supervisor de un proyecto recalcula `modulos_acceso` en el mismo paso. `scripts/migrate-reconectar-permisos-pertenencia.js` sembró `modulos_manuales`/`modulos_excluidos` primero, verificando que el efectivo calculado no cambiara nada para ningún docente existente antes de cablear la escritura.
- Nuevo `scripts/test-permisos-pertenencia.mjs` (9 casos, usuario descartable, autolimpiable).

## [0.12.9] - 2026-09-27 (Sesión 53)

### ✨ Added
- **Aprobación de contenido sin depender solo de administración del sitio** (`lib/permisosAprobacionContenido.ts`):
  - Podcast de un pasante de club: su supervisor lo aprueba y publica (video + actividad) desde `/vinculacion/supervisar` → Podcast (`PATCH /api/videos/[id]/aprobar`).
  - Cualquier evento/podcast: aprueba cualquiera de sus `profesores_responsables`, incluida la autoaprobación de un docente sobre su propio registro (`PATCH /api/actividades-difusion/[id]` con `{aprobar:true}`, solo aprobar — no editar).
  - `/portal/aprobaciones` (nueva): cola personal de "profesor responsable" (`GET /api/mis-aprobaciones`), con tarjeta en `/portal/dashboard` y notificación `contenido-por-aprobar-responsable`.
  - `/portal/subir-video` exige elegir profesor(es) responsable(s) al subir.
- **Segunda confirmación al aprobar: calidad de la foto**, aparte de menores (`fotos.calidad`) — no bloquea la aprobación de horas del pasante, solo la publicación de la foto.
- **Cola de propuestas para portada** (`fotos.propuestas`): un líder propone (`accion: 'proponer'`), administración aprueba o rechaza desde `/admin/photos` (filtro Estado → "Propuestas para portada") — la portada sigue siendo la única ubicación curada solo por administración.
- **Rotación de galerías de proyecto** (`fotos_ubicaciones.rotar`) en vez de un tope curado a mano: recientes siempre presentes + muestra aleatoria del resto.

### 🔧 Changed
- Migración `scripts/migrate-aprobacion-responsables.js` (`fotos.calidad`/`propuestas`, `videos.profesores_responsables`/`actividad_difusion_id`, `fotos_ubicaciones.rotar`).
- `scripts/test-fotos-permisos.mjs` ampliado a 80 casos.

---

## [0.12.8] - 2026-09-26 (Sesión 52)

### ✨ Added
- **Banco de fotos con topes + administración por líderes de proyecto** (`docs/PLAN_IMPLEMENTACION_ANTIGRAVITY_ADMIN_POR_LIDERES.md`):
  - `fotos` gana `proyectos[]` (multi-proyecto), `menores`/`visibilidad` (solo revisión humana, sin IA), `descartada` (reversible, por imagen, respetado por galerías/noticias/informes vía `foto_descartada(url)`), y títulos automáticos.
  - Topes por ubicación (`fotos_ubicaciones`, tope suave: el sitio muestra solo las N primeras).
  - Panel del líder `/portal/proyecto/[proyectoId]/fotos` (mismo componente `BancoFotos` que `/admin/photos`, alcance limitado a su proyecto vía `lib/permisosProyecto.ts`).
  - Selector de proyectos al registrar eventos/podcasts (`lib/permisosProyecto.ts:proyectosAsignables`), validado en el servidor.
  - Notificaciones `fotos-menores-por-revisar` y `fotos-sin-ubicar-proyecto`.
- **Datos:** Jhonny Villafuerte, líder de RED LEA (además de colíder de Internacionalización); backfill de 44 imágenes locales a Cloudinary.
- `scripts/test-fotos-permisos.mjs` (nuevo, matriz de permisos del banco de fotos).

---

## [0.12.7] - 2026-09-25 (Sesión 51)

### ✨ Added
- **Informes Automáticos de Vinculación (`/vinculacion/informes`)**:
  - Generación de documentos `.docx` oficiales con la librería `docx` para el **Informe Mensual Supervisor** y el **Informe Semestral Líder**.
  - Integración de gráficos PNG automáticos vía QuickChart (pasantes vs. 96h, asistencia por espacio, pastel género, barras edad, evolución mensual y planificado vs ejecutado).
  - Pestañas para vista previa editable, CRUD de obstáculos (`supervision_obstaculos`), redacción de borrador con IA para el líder (`enriquecerTexto`) e historial descargable (`informes_vinculacion`).
- **Configuración y Ficha de Proyecto (`/vinculacion/proyecto`)**:
  - Gestión de Objetivos, Actividades del Plan (con opción "Copiar al ciclo siguiente"), Metas por ciclo, Presupuesto y Textos Cualitativos.
- **Captura Operativa (Asistencia y Supervisión)**:
  - Vincular sesión con Actividad del Plan o marcar Actividad No Prevista en `/vinculacion/asistencia`.
  - Campo de observaciones del supervisor y casilla `usar_en_informe` en fotos de evidencias.
- **Regla de Notificación**:
  - Agregada regla `informe-supervisor-pendiente` en `lib/notificaciones.ts` y documentada en `NOTIFICACIONES.md`.

### ✨ Added
- **Notificaciones del Portal:** bloque "🔔 Pendientes" en `/portal/dashboard` y `GET /api/notificaciones`. Avisos derivados en vivo desde Neon (sin tabla): asistencias por aprobar, horas por aprobar (podcast, investigación y autónomas) para supervisores; videos y difusión por aprobar para `contenido_sitio`; asistencia rechazada para el pasante (ventana de 14 días). Reglas en `lib/notificaciones.ts`; guía y checklist para funciones futuras en `NOTIFICACIONES.md`.
- **Horas / Actividades Autónomas** (`/vinculacion/actividades-autonomas`): el pasante registra lo que hace por su cuenta (planificar, crear recursos…), con **tope de 16 h** (`lib/horasAutonomas.ts`). Tabla `actividades_autonomas_pasante` (`scripts/migrate-actividades-autonomas.js`). Las aprueba el supervisor en `/vinculacion/supervisar` (pestaña "Autónomas") y suman al total de 96 h de `/portal/mi-avance`.
- `/portal/mi-avance`: panel con las asistencias rechazadas (espacio, fecha, motivo) y tile de horas autónomas.

### ✅ Changed
- Dashboard, tarjeta "Registros de Vinculación": "Registrar Evento o Podcast" visible para todos los que ven la tarjeta; enlaces nuevos "Registrar Actividades de Investigación" (pasante con módulo `investigacion`) y "Registrar Horas / Actividades Autónomas" (todo pasante). Se eliminó la tarjeta aparte "Investigación (Vinculación)".
- Documentación: regla 12 en `CLAUDE.md` y sección en `ANTIGRAVITY.md` — toda función nueva que deje algo pendiente debe agregar su regla de notificación.

---

## [0.12.5] - 2026-09-24 (Sesión 49)

### ✅ Changed
- Dashboard: tarjeta "Mi Perfil" renombrada a "Yo y la Carrera" e incorpora el link al Dashboard PINE; se elimina la tarjeta "Indicadores".

## [0.12.4] - 2026-09-24 (Sesión 49)

### ✅ Changed
- Dashboard: "Registros de Vinculación" solo para pasantes, superadmin y líder de Vinculación; nueva tarjeta "Supervisión de Vinculación" (Supervisar Asistencia + Panel de Indicadores).

### 🐛 Fixed
- CHECK de `superadmin_audit_log.tipo_accion` ampliado (`impersonate`/`impersonate_revert`): "Ver como" fallaba en producción.

## [0.12.3] - 2026-09-24 (Auditoría)

### 🔒 Security
- `scratch/` ya no se versiona; skill `gestion-estudiantes` sin email real ni clave fija.
- `GET /api/espacios/instructores?profesor_ids=` exige rol profesor/admin.
- `esSuperAdminOLider` usa la identidad suplantada bajo "Ver como" (antes seguía viendo todo como superadmin).

### 📚 Documentation
- CLAUDE.md: sección de auditoría y guardrails de despliegue (causa del deploy fallido `012d646`), entradas Sesión 44/46/47, orden corregido; ANTIGRAVITY.md con reglas; `.env.local.example` actualizado (Cloudinary, YouTube, Groq); `package.json`/README en 0.12.3.

---

## [0.12.2] - 2026-09-23 (Sesión 48)

### ✅ Added & Improved
- **Selector de Participantes de Podcast (`SelectorParticipantesPodcast`) Refactorizado (Paridad con Asistencia):**
  - **Pasantes Titulares / Asignados (Checklist)**: Filtra y muestra automáticamente los pasantes asignados a él o los profesores supervisores seleccionados (ej. Keyla y Michell para el supervisor Arturo en el espacio Podcast) mediante la API `/api/espacios/instructores?profesor_ids=...`.
  - **Pasantes Invitados**: Permite seleccionar a otros pasantes de la carrera a través de un desplegable con el botón `+ Agregar invitado`, mostrándolos con un badge y botón `"Quitar"`.
  - **Docentes Participantes**: Permite incluir a otros profesores/docentes de la carrera que hayan participado en el episodio mediante selector y botón `+ Agregar docente`.
  - **Invitados Internos & Externos**: Cajas de texto para invitados universitarios o externos a la ULEAM.

- **Categoría Maestría / Posgrado (`maestria`) a Nivel Global:**
  - Se habilitó la opción **Maestría / Posgrado** (`maestria`) como categoría de evento seleccionable en `/vinculacion/difusion`, `/gestion-carrera`, `/vinculacion/publico-difusion/[token]` y en el panel de administración `/admin/contenido`.
  - Actualizado `CATEGORIA_LABEL` en `/api/difusion/generar-texto` para que la IA genere fichas de eventos de posgrado/cuarto nivel.

- **Actualizaciones en Base de Datos Neon (Producción) & Rol Institucional:**
  - **Evento ID 32** (*Inauguración de la Maestría en Pedagogía de los Idiomas Nacionales y Extranjeros*): Actualizada la categoría de `investigacion` a `maestria`.
  - **Sr. Gabriel Bazurto Alcívar (ID 15 en `usuarios`)**: Actualizado `cargo_institucional` a `'Docente / Coordinador de la Maestría en Pedagogía de los Idiomas Nacionales y Extranjeros'` en Neon DB y en `scripts/migrate-usuarios-docentes.js` (preservando ambos roles: Docente y Coordinador).

---

> ⚠️ **El proyecto abandonó PocketBase por completo** (retirado junto con la carpeta `pocketbase/` en la Sesión 8, 2026-04-26) a favor de **Neon Postgres** (SQL crudo vía `@neondatabase/serverless`), igual para el sitio público que para el Portal PINE. La lista de TODOs de PocketBase que vivía en esta sección quedó sin efecto — nunca se ejecutó, el proyecto tomó otro rumbo arquitectónico. El historial detallado sesión por sesión (33 sesiones y contando) vive en [`CLAUDE.md`](./CLAUDE.md) → `## Cambios Recientes`; este changelog resume los hitos mayores.

## [0.12.1] - 2026-09-22 (Sesión 47)

### 🐛 Fixed & Improved
- **Pantalla de Confirmación de Éxito & Redirección Automática al Portal PINE:**
  - Se corrigió el comportamiento post-envío en los 5 formularios principales del Portal / Vinculación ([`app/vinculacion/asistencia/page.tsx`](file:///c:/Users/User/Documents/Desarrollo%20Web/carreraPINE/app/vinculacion/asistencia/page.tsx), [`app/vinculacion/encuesta/page.tsx`](file:///c:/Users/User/Documents/Desarrollo%20Web/carreraPINE/app/vinculacion/encuesta/page.tsx), [`app/vinculacion/evaluacion-final/page.tsx`](file:///c:/Users/User/Documents/Desarrollo%20Web/carreraPINE/app/vinculacion/evaluacion-final/page.tsx), [`app/vinculacion/registrar-evaluar/page.tsx`](file:///c:/Users/User/Documents/Desarrollo%20Web/carreraPINE/app/vinculacion/registrar-evaluar/page.tsx), [`app/portal/subir-video/page.tsx`](file:///c:/Users/User/Documents/Desarrollo%20Web/carreraPINE/app/portal/subir-video/page.tsx)).
  - **Prevención de Registros Duplicados (Double Submit):** Al procesar un envío exitoso, el formulario se desmonta por completo para evitar que el usuario vuelva a hacer clic en el botón de guardar o refresque la página dudando si se procesó.
  - **Confirmación Visual & Redirección:** Se despliega una tarjeta visual de éxito con los resultados/resumen del registro y un temporizador regresivo de 5 a 6 segundos que redirige automáticamente a `/portal/dashboard`, incorporando botones para "Ir al Portal PINE Ahora" o "Registrar Otro".

---

## [0.12.0] - 2026-09-22 (Sesión 46)

### ✅ Added
- **Funcionalidad "Ver como" (Impersonación de Usuarios)** en el módulo de Superadmin (`/superadmin/ver-como`):
  - **Filtro 1 (Roles & Módulos):** Selección mediante casillas de verificación para Roles (`profesor`, `estudiante`, `admin`, `beneficiario`), Módulos de Acceso (`vinculacion`, `investigacion`, `subir_video`, etc.) y toggle para filtrar **usuarios con accesos múltiples (2+ módulos)** vs. acceso único.
  - **Filtro 2 (Persona):** Búsqueda de texto en tiempo real por nombres, apellidos, correo o cédula.
  - **Mecanismo de Impersonación Segura:** Firma HMAC en cookie de sesión extendida con `impersonatedBy`. Permite a un Superadmin navegar como cualquier persona del sistema y actualizar su perfil, contribuciones, asistencias o registros.
  - **Barra Flotante Global (`ImpersonationBanner`):** Banner superior sticky visible en todo el sitio mientras la impersonación está activa, con botón para restaurar la sesión original de Superadmin en un clic (`POST /api/superadmin/impersonate/revert`).
  - **Log de Auditoría:** Todas las acciones de inicio y reversión de impersonación quedan registradas en `superadmin_audit_log`.

---

## [0.11.1] - 2026-09-22 (Sesión 45)

### ✅ Added
- **Desglose de Indicadores MCER en `/pine-dashboard`**: separación clara entre **Diagnóstico MCER (Pre-Test) — Semestre Actual** (`evaluacionesIniciales / totalInscritos` -> `49 / 49`) y **Evaluaciones Finales (Post-Test) — Meta Proyecto (2 Años)** (`evaluacionesFinales / 100` -> `0 / 100`).
- **Nuevas Métricas Incorporadas en tiempo real**: Tarjeta de **Beneficiarios Inscritos & Atendidos** (`49 / 50`), **Horas Acreditadas de Vinculación y Práctica** (suma acumulada de clases, podcasts e investigación) y **Espacios de Enseñanza Activos**.

### 🐛 Fixed
- **Conteo de Investigadores Vinculados (`/api/admin/stats`)**: reemplazada la consulta a la columna vacía heredada `perfiles_estudiantes.titulo_investigacion` por el conteo real de estudiantes con módulo `'investigacion'` en `modulos_acceso` o actividades registradas en `actividades_investigacion_pasante` (retornando correctamente los **5 estudiantes** activos).

---

## [0.11.0] - 2026-09-22 (Sesión 44)

### ✅ Added
- **Dashboard Pedagógico del Pasante** (`/portal/mi-avance` y `/api/mi-avance`): barra de progreso de horas reglamentarias con la meta legal de **96 horas**, tabla de beneficiarios por espacio con notas Pre/Post MCER, porcentaje de asistencia de aula con semáforo `<70%` (riesgo de inasistencia) y reseñas cualitativas de alumnos.
- **Panel de Indicadores & Supervisión Docente** (`/vinculacion/supervisar/indicadores` y `/api/vinculacion/supervisores/indicadores`): panel analítico para profesores supervisores con desglose por pasante (horas acumuladas, beneficiarios a cargo, tests evaluados y promedio de satisfacción), matriz de ganancia pedagógica MCER y semáforo de asistencias pendientes.
- Botón directo **"📊 Ver Indicadores & Analítica"** en la cabecera de `/vinculacion/supervisar`.

### 🐛 Fixed
- Corrección de nombres de columnas reales en Neon Postgres para encuestas de satisfacción (`calificacion`, `nivel_satisfaccion`, `comentarios`, `fecha`) y escape con comillas dobles para la tabla `"espacios_enseñanza"`.

---

## [0.10.8] - 2026-09-08 (Sesión 33)

### 📚 Documentation
- Auditoría exhaustiva de `CLAUDE.md`/`ANTIGRAVITY.md`/`README.md`/`MANUAL_USUARIO.md` vs. código real — corregidos módulos enteros sin documentar (`/superadmin`, `/investigacion/informes`), datos obsoletos (Contribuciones Académicas ya está al 90% no 60%, `/investigacion/espacios` sí tiene link activo), lista incompleta de rutas protegidas y de valores de `modulos_acceso` (6 reales, se documentaban 4), y el árbol de `## Estructura de Archivos` (congelado desde ~Sesión 24/25).

### 🧹 Removed
- Archivos sin uso confirmado por grep: `RESUMEN.md`, `DEPLOY_GUIDE.md` (obsoletos, era PocketBase/Railway), `material-web-REDLEA/` (11 MB, ya volcado a `public/images/redlea/`), 2 imágenes huérfanas de RED LEA, 1 PDF huérfano de `admin-assets/`, 2 imágenes sueltas sin estandarizar, `scripts/insertButtons.cjs` (code-mod ya aplicado), `types/index.ts:AdminUser` y `lib/neon.ts` (código muerto, 0 usos).

## [0.10.7] - 2026-09-08 (Sesión 31–32)

### ✅ Added
- **Banco de Fotos administrable** (`/admin/photos`, tabla `fotos`) — subir/aprobar/ocultar/eliminar fotos (con borrado real en Cloudinary), consumido por un carrusel nuevo en la portada (`components/PhotoCarousel.tsx`).
- **Config de proyectos/nav vía Neon** (`/admin/proyectos`, tabla `proyectos` activada) — ocultar/reordenar cualquier proyecto o red del menú sin tocar código; crear proyectos nuevos "plantilla_simple" completos (hero, integración, equipo, contacto) desde el admin. `Header.tsx` arma el nav desde `/api/proyectos` con fallback hardcodeado si falla.
- Toggle "Publicar mi horario de tutorías en la web" en `/portal/perfil` (`usuarios.horario_tutorias_publico`, default `false`).

### 🐛 Fixed
- **Bug de Data Cache de `@neondatabase/serverless`:** un `GET` público que no llama `cookies()` queda cacheado para siempre por el Data Cache de Next.js, incluso con `export const dynamic = 'force-dynamic'` (ese flag no lo cubre). Corregido en 4 rutas afectadas con `neon(url, { fetchOptions: { cache: 'no-store' } })` — regla aplicada de ahora en adelante a todo GET público nuevo sin sesión.

## [0.10.6] - 2026-09-04 (Sesión 30)

### ✅ Added
- "Ocultar sin borrar" en las 5 tablas del admin de contenido (Noticias, Actividades, Publicaciones, Podcast, Miembros) — columna `activo` nueva en `publications`/`videos`/`members`; `publicar_noticias`/`publicar_actividades` (ya existían en Noticias/Actividades) ahora editables desde la UI en vez de fijas en `true`. Un clic en la tabla oculta/muestra sin borrar el registro.
- Badge "Destacado" (Noticias, Podcast) ahora clickeable directo desde la tabla, sin abrir el formulario de edición.
- Buscador de texto libre + selector de tamaño de página (10/25/50/100) integrados en `components/admin/DataTable.tsx` — heredado automáticamente por las 5 tablas del admin que lo usan.

### 🐛 Fixed
- Al ocultar una noticia/actividad, la fila también desaparecía de la lista del propio admin (el `GET` que alimenta esas páginas era el mismo que filtra el sitio público) — corregido con un parámetro `?all=true` de uso exclusivo del admin.

---

## [0.10.0] – [0.10.5] (2026-06 a 2026-09-02) — resumen de hitos

Rango largo de sesiones que llevó el proyecto de un sitio estático con panel admin en memoria a la plataforma actual. Puntos mayores (detalle sesión por sesión en `CLAUDE.md`):

- Migración completa del contenido del sitio público (miembros, publicaciones, podcast, noticias/actividades) de `lib/data.ts` estático a **Neon Postgres** — el panel `/admin` dejó de perder los cambios en cada redeploy.
- Construcción del **Portal PINE**: auth unificada con cookie firmada, roles y permisos por espacio, Vinculación (espacios, pasantes, beneficiarios, asistencia, Test MCER, encuestas, difusión), Investigación, Gestión de Carrera, Indicadores.
- **Enlaces/QR públicos sin login** para que un beneficiario tome su Test MCER o encuesta de satisfacción desde el celular (pretest con alta de datos, postest de un solo uso).
- **Contribuciones Académicas** — registro de producción académica de docentes (artículos, libros, capítulos, memorias de evento), vía Prisma (único módulo del repo que no usa SQL crudo).
- Módulo **`/utilidades`** — generación de documentos administrativos (Acta Técnica, Oficios, Convocatorias, PATs de Maestría, Pares Lectores) con redacción asistida por IA, con selector de docentes unificado sobre `usuarios`.
- **i18n ES/EN completo** en todo el sitio público, footer/equipo/hub contextuales por proyecto (antes un solo bloque genérico repetido en las 10 páginas).
- Encuesta de satisfacción ampliada (4 dimensiones + calificación por instructor) y opción "ya estoy registrado" en el pretest público para no duplicar beneficiarios.

---

## [0.3.1] - 2026-04-13 (Session 4 — Documentation & Multi-AI Setup)

### ✅ Added - CLAUDE.md
- Created project-level `CLAUDE.md` with full project context for Claude Code
- Includes tech stack, file structure, PocketBase schema, auth details, conventions
- Multi-AI compatibility section (Claude Code + Qwen Code)

### ✅ Updated - QWEN.md
- Updated to 2026-04-13 with latest git commit reference (d38b5d2)
- Added multi-AI section documenting Claude/Qwen compatibility
- Added `CLAUDE.md` reference to documentation checklist

### ✅ Updated - Documentation Sync
- `CLAUDE.md` and `QWEN.md` now mirror each other as AI context files
- `CHANGELOG.md` updated with Session 4 entry
- `README.md` updated with multi-AI assistant section
- Both AI tools can now pick up full project context on session start

### 📊 Git Status
- Commit: `d38b5d2 - docs: update documentation with complete status and pending tasks`
- Branch: main (up to date with origin/main)
- All changes to be committed and pushed

---

## [0.3.0] - 2026-04-12 (Session 3 - Admin Panel Complete + Git Push)

### ✅ Added - Admin Panel (11 pages)
- Full admin panel with sidebar navigation and layout
- Authentication system with middleware protection
- Login page with email/password and Suspense boundary
- Dashboard with statistics cards and quick actions
- CRUD for Members (create, read, update, delete)
- CRUD for Videos with YouTube URL parsing and auto embed_id
- CRUD for Video Categories with auto-slug generation
- CRUD for Publications with type selection (article, conference, book, other)
- CRUD for News with slug generation and featured flag
- CRUD for Activities with category selection
- Site Settings page with social media links and site info
- DataTable reusable component for all CRUD pages
- Admin layout with responsive sidebar navigation
- Logout functionality with cookie clearing
- Protected routes via middleware (only 2 authorized emails)

### ✅ Added - Security & Middleware
- `middleware.ts` - Route protection for /admin/*
- `lib/admin-auth.ts` - Admin authentication helpers
- Authorization whitelist (2 emails only)
- JWT token storage in cookies
- Suspense boundary for useSearchParams in login

### ✅ Added - Documentation
- `POCKETBASE_SETUP.md` - Complete guide for PocketBase setup
- `RESUMEN.md` - Executive summary of the project
- `setup-pocketbase.ps1` - PowerShell script for PocketBase download
- `.env.local.example` - Environment variables template
- Updated `QWEN.md` with detailed project status
- Updated `README.md` with complete documentation
- `.gitignore` configured for Next.js

### ✅ Technical Updates
- Build successful: 14 static pages generated
- First Load JS: 87.3 kB - 118 kB
- Middleware: 26.6 kB
- 63 files committed to GitHub
- Repository pushed to origin/main
- Commit: `7b26b55 - feat: initial project setup with landing page and admin panel`
- GitHub: https://github.com/r2damianster/carrerapineuleam.git

### 📊 Stats
- Total files in repo: 63
- Lines of code: ~11,900
- React components: 13
- Next.js pages: 14
- TypeScript interfaces: 8
- Admin CRUD pages: 7

---

## [0.2.0] - 2026-04-12 (Session 2 - Landing Page Complete)

### ✅ Added - Landing Page Components
- `Hero.tsx` - Hero section with animated background, logo, CTAs
- `About.tsx` - Project description with objectives and highlights
- `TeamSection.tsx` - Team cards with photos, roles, ORCID integration
- `VideoGallery.tsx` - Video gallery with category filtering
- `VideoCard.tsx` - Individual video card with YouTube embed
- `PublicationsSection.tsx` - Scientific publications display
- `NewsSection.tsx` - News cards with featured images
- `ActivityGallery.tsx` - Activity photo gallery with lightbox modal
- `Contact.tsx` - Contact section with social links and form

### ✅ Added - Core Components
- `Header.tsx` - Responsive navigation with sticky behavior
- `Footer.tsx` - Footer with social links and contact info
- `lib/pocketbase.ts` - PocketBase client with data fetching helpers
- `types/index.ts` - TypeScript interfaces for all data models

### ✅ Added - Configuration
- Next.js 14 with TypeScript and App Router
- TailwindCSS with custom ULEAM colors
- PostCSS configuration
- Image optimization setup
- Smooth scrolling in globals.css
- Line clamp utilities

### ✅ Assets
- Project logo: `LOGO_Proyectro.png`
- Team photos: `lider_arturo_rodriguez.jpg`, `colider_Jhonny_Villafuerte.jpg`
- Activity photos: `actividad_previa_podcast.jpeg`, `Actividad_Podcast.jpeg`
- Podcast logo: `LOGO_PRogramadePodcast.jpeg`

### ✅ Build Status
- Build successful with no errors
- Static pages generated: 4 (initial)
- First Load JS: ~117 kB

---

## [0.1.0] - 2026-04-12 (Session 1 - Initial Setup)

### ✅ Initial Project Setup
- Created project structure and folders
- Configured Next.js with TypeScript and TailwindCSS
- Defined PocketBase schema (8 collections)
- Created initial TypeScript types
- Built initial Header and Footer components
- Set up PocketBase client library
- Created `QWEN.md` and `CHANGELOG.md`
- Session interrupted due to internet issues

### 📋 Schema Defined
- members
- publications
- videos
- video_categories
- news
- activities
- site_settings
- users (built-in)

---

## Summary by Version

| Version | Date | Focus | Progress |
|---------|------|-------|----------|
| 0.1.0 | 2026-04-12 | Initial Setup (era PocketBase, prototipo) | 20% |
| 0.2.0 | 2026-04-12 | Landing Page (era PocketBase, prototipo) | 50% |
| 0.3.0 | 2026-04-12 | Admin Panel + Git (era PocketBase, prototipo) | 70% |
| 0.3.1 | 2026-04-13 | Docs + Multi-AI Setup (era PocketBase, prototipo) | 70% |
| 0.10.0 – 0.10.5 | 2026-06 a 2026-09-02 | Migración a Neon + Portal PINE + i18n completo | ~99% |
| 0.10.6 | 2026-09-04 | Admin: ocultar sin borrar + buscador/paginación | ~99% |
| 0.10.7 | 2026-09-08 | Fix Data Cache + Banco de Fotos + config proyectos/nav | ~99% |
| 0.10.8 | 2026-09-08 | Auditoría de documentación + limpieza de archivos sin uso | ~99% |

---

**Last Updated:** 2026-09-08 (Sesión 33)
**Current Version:** 0.10.8
**Detalle sesión por sesión:** ver [`CLAUDE.md`](./CLAUDE.md)
