# CLAUDE.md — Proyecto Innovaciones Pedagógicas e Internacionalización

> Instrucciones de contexto para Claude Code. 
> **NUEVO (2026-08-30):** Modelo de colaboración dual activo. Trabajas en conjunto con **Antigravity (AGY)**.

---

## 🤖 Colaboración con Antigravity

- **Antigravity** se encarga de la arquitectura, toma de decisiones complejas, automatizaciones (vía herramientas lean-ctx) y refactorizaciones profundas.
- **Tú (Claude)** te encargarás de la ejecución rápida, ajustes de UI, implementaciones específicas y asistencia continua en el código.
- Ambos agentes leen y actualizan la documentación. Mantén este archivo actualizado si realizas cambios importantes para que Antigravity también tenga contexto, y consulta `ANTIGRAVITY.md` si necesitas conocer reglas globales.

---

## Identidad del Proyecto

**Nombre:** Proyecto Innovaciones Pedagógicas e Internacionalización
**Grupo de Investigación:** Innovaciones pedagógicas para el desarrollo sostenible: inclusión, interculturalidad e interdisciplinaridad (actualización 2026-05-15, doc en `public/admin-assets/2026_GrupoInvestigacion.pdf`)
**Institución:** Universidad Laica Eloy Alfaro de Manabí (ULEAM)
**Repositorio:** https://github.com/r2damianster/pineuleam.git
**Versión actual:** 0.12.16
**Última sesión:** 2026-10-11 (Sesión 66 — video tutorial para externos de contribuciones por enlace/QR). Historial completo por sesión: `docs/HISTORIAL_SESIONES.md`.
**Ruta pública del proyecto:** `/investigacion/proyecto-innovacion` (antes `/pine`)
**Manual de usuario:** `MANUAL_USUARIO.md` (rutas del Portal PINE — login, espacios, dashboard)

---

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Estilos | TailwindCSS personalizado (colores ULEAM) |
| Sitio público (contenido) | **Neon Postgres** (SQL crudo vía `@neondatabase/serverless`, igual que el Portal PINE) — miembros, publicaciones, podcast (video_categories/videos), noticias+actividades (`actividades_difusion`, fusionada con Difusión interna). Migrado desde `lib/data.ts` en la Sesión 25; ese archivo ya solo guarda `siteSettings` + config de autorización (`profesoresAutorizados`/`profesorModulos`/`liderProyectoPropio`) + fotos del Club de Inglés. |
| **Portal PINE** (docencia/vinculación/investigación) | **Neon Postgres** vía `@neondatabase/serverless` (SQL crudo) — ver `## Portal PINE` abajo |
| **Contribuciones Académicas** (módulo aparte) | **Mismo Neon**, pero acceso vía **Prisma ORM** (`lib/prisma.ts`, `prisma/schema.prisma`) — único módulo del repo que no usa SQL crudo. Ver `## Portal PINE` → sección Contribuciones |
| Auth | Cookie httpOnly firmada (HMAC, Web Crypto) — `lib/session.ts`, unificada para todo (admin legacy + Portal) |
| Uploads (fotos/evidencias) | Cloudinary (`app/api/upload`) |
| Deploy | Vercel — Next.js en raíz del repo, auto-deploy on push a `main` |

**Dependencias clave (`package.json`):** `@neondatabase/serverless`, `bcryptjs` (hash de passwords del Portal), `cloudinary`, `docx`+`jszip` (generación de certificados y test MCER descargable), `@prisma/client`+`prisma` (módulo Contribuciones, ver nota abajo), `react-hook-form`+`yup`+`@hookform/resolvers` (formulario del wizard de Contribuciones), `zod` (validación de `POST /api/contribuciones`), `xlsx` (carga masiva de pasantes por Excel, Sesión 20), `docxtemplater`+`pizzip` (generación de documentos en `/utilidades`), `mammoth` (lectura de `.docx` para precargar memos en Pares Lectores), `pdf-parse` (extracción de texto de PDF en Contribuciones y Pares Lectores), `google-auth-library` (OAuth de subida a YouTube, `app/api/youtube/**`).

> ⚠️ **Prisma en este repo está fijado a `^6.19.3`, no actualizar a 7.x sin revisar.** Prisma 7 rompió el datasource clásico `url = env("DATABASE_URL")` del schema (exige migrar a `prisma.config.ts` + driver adapters) — el schema actual usa el patrón viejo y no compila contra Prisma 7 (Sesión 24).
>
> ⚠️ **Nunca correr `prisma db push` / `prisma migrate` contra este Neon.** `schema.prisma` solo modela `Contribution`/`ContributionAuthor`; el resto de tablas del Portal (`usuarios`, `estudiantes`, `espacios`, etc.) vive fuera del schema de Prisma. Ambos comandos comparan el schema contra **toda** la base y ofrecen **borrar** las tablas que no conocen — confirmado en Sesión 24 (`db push` listó 9 tablas con datos reales para drop, incluida `usuarios`). Para cambios futuros al schema de Contribuciones, escribir el `ALTER`/`CREATE TABLE` a mano (ver `scripts/migrate-contribuciones.js` como plantilla), igual que el resto de migraciones del proyecto.

### Colores ULEAM
- Azul institucional: `#003366`
- Dorado: `#FFD700`

---

## Portal PINE (Neon Postgres) — Sistema Operativo

> **Distinto del sitio público estático.** El sitio público (landing, `/investigacion/proyecto-innovacion`, etc.) sigue siendo 100% `lib/data.ts`. El "Portal PINE" es un sistema aparte con base de datos real (Neon), para las funciones operativas: registrar clubes/aulas, tomar asistencia, evaluar MCER, encuestas, difusión de eventos.

### Auth unificada
- **Una sola cookie httpOnly firmada** (`pine_app_session`, HMAC-SHA256 vía Web Crypto) para *todo* — Portal Y panel `/admin` legacy. Implementada en `lib/session.ts` (`createSessionCookieValue`/`verifySessionCookieValue`/`getAppSessionFromCookies`). Requiere `SESSION_SECRET` en las env vars — **sin fallback hardcodeado** (existió brevemente, se removió por seguridad).
- **Expiración "sliding" de 8 horas (Sesión 27):** la cookie ya es persistente desde siempre (sobrevive a cerrar la pestaña/navegador), pero antes expiraba a fecha fija 4h después del login sin importar si el usuario seguía activo. Ahora `SESSION_MAX_AGE_SECONDS` (`lib/session.ts`) es 8h, y `middleware.ts` reemite la cookie con maxAge completo en cada request autenticado a una ruta protegida (`conSesionRenovada()`) — el usuario se mantiene logueado mientras entre al menos una vez cada 8 horas; solo tras 8h seguidas sin ninguna visita debe volver a loguearse.
- **NO existen ya**: `lib/adminSession.ts`, `lib/userSession.ts`, el panel `/admin` con password `Pine2026` hardcodeado, ni el módulo viejo `/vinculacion/dinamicas-linguisticas/asistencia` (UUID). Todo fue consolidado/retirado en Sesión 19 — si encuentras referencias a esto en código o docs viejos, están obsoletas.
- **Login:** `/portal/login` → `POST /api/auth/portal-login`. **Registro:** `/registro` → `POST /api/auth/register` (autologuea). Desde Sesión 22, `PUBLIC_ROLES = ['profesor']` — es el único rol que se autoregistra; `estudiante` y `beneficiario` fueron retirados del todo del selector (antes `beneficiario` seguía ahí como opción viva y rompía porque insertaba en una columna ya eliminada, ver changelog Sesión 22).
- **Roles** (`usuarios.rol`): `admin` | `profesor` | `estudiante` | `beneficiario`. Autoregistro público solo permite `profesor`/`estudiante`/`beneficiario` — `admin` nunca es autoasignable.
- **`profesor` es de lista fija**, no autoregistro abierto: `lib/data.ts` → `profesoresAutorizados` (array de emails permitidos) + `profesorModulos` (qué `modulos_acceso` recibe cada uno al registrarse). Agregar gente nueva ahí, con su email real confirmado — **nunca adivinar el email**.
- **`modulos_acceso`** (`text[]` en `usuarios`, valores: `admin`/`investigacion`/`vinculacion`/`vinculacion_gestion`/`contenido_sitio`/`subir_video`/`superadmin`): controla qué ve cada quien en `/portal/dashboard` y qué rutas puede pisar (`middleware.ts`). Una persona puede tener varios. `admin` controla solo `/pine-dashboard` (indicadores) e `/investigacion/informes`. `contenido_sitio` es un módulo **distinto**, restringido solo a `arturo.rodriguez` y `jhonny.villafuerte` (líder/colíder de este proyecto) — controla `/admin/*` (las secciones CRUD del contenido estático, incluyendo Fotos y Proyectos desde Sesión 32); los PDFs de `public/admin-assets/` quedan tras el mismo gate porque `/admin-assets/...` empieza con `/admin` (el `/api/protected/assets` que existía antes se eliminó en Sesión 44, era una función de 34 MB sin llamadores). German y Verónica tienen `admin` pero NO `contenido_sitio` — ven el dashboard de indicadores pero no el panel de contenido. `subir_video` habilita a un `estudiante` (sin más permisos de docente) a subir video/evidencia. `superadmin` da acceso a `/superadmin` (ver `### Módulo Superadmin`) — hoy solo Arturo, doble candado con email hardcodeado.
- **Permisos por espacio** (no globales): `lib/permisos-espacio.ts` → `puedeOperarEspacio(usuario, espacio_id)`. Un `profesor` con módulo `vinculacion` opera cualquier espacio; un `estudiante` **solo** los espacios donde está en `espacio_instructores` (asignado por el profesor). Se usa en `/api/espacios/asignar`, `/api/tests` (MCER), `/api/encuestas`, `/api/espacios/asistencia`.

### Flujo real de Vinculación (confirmado con el usuario, Sesión 19)
Dos conceptos separados, **no anidados uno dentro del otro**:
- **"Espacio" = Gestión, solo profesor** (hoy: Arturo, Cynthia). `/vinculacion/espacios` crea/lista espacios (ej. "Club de Inglés A"); `/vinculacion/espacios/[id]` asigna estudiantes como instructores de ese espacio (única función que queda ahí).
- **"Registro" = tarea diaria, estudiante-instructor o profesor de respaldo.** Desde Sesión 43: `/vinculacion/asistencia`, `/vinculacion/registrar-evaluar` (registro nuevo + Pre-Test MCER obligatorio en un solo envío, o asignar beneficiario ya existente), `/vinculacion/evaluacion-final` (Post-Test MCER + Encuesta obligatorios juntos), más `/vinculacion/encuesta` (solo para el caso suelto de reenviar la encuesta sin MCER). Todas reusan las mismas APIs de siempre (`/api/espacios/asignar`, `/api/tests`, `/api/encuestas`, `/api/espacios/asistencia`) más el endpoint transaccional nuevo `POST /api/beneficiarios/registrar-y-evaluar` — la lógica de permisos (`puedeOperarEspacio`) no cambió.
- **Beneficiario nunca tiene cuenta.** Desde Sesión 43, un beneficiario nuevo solo se crea junto con su Pre-Test — `POST /api/beneficiarios` ya no acepta crear uno sin evaluación (el handler se eliminó a propósito); la única vía es la transacción de `POST /api/beneficiarios/registrar-y-evaluar` (o el flujo público equivalente de `/api/enlaces/[token]/pretest`), que inserta usuario+perfil+inscripción+evaluación inicial en un solo `BEGIN/COMMIT`. Sin password real (email/password_hash autogenerados, inutilizables — `usuarios.email`/`password_hash` son `NOT NULL`+`UNIQUE` en Neon). Esto reemplazó el plan original de usar `/registro?rol=beneficiario` (que sí les daba cuenta/password) — descartado a propósito, y desde Sesión 22 esa opción ya no existe ni en el código.

### Pasantes (estudiantes-instructores) — alta por el profesor, activación en el primer login
`/vinculacion/pasantes` (solo profesor/admin con módulo `vinculacion`) es un **CRUD completo** — crear, editar, eliminar. Crear un pasante nuevo solo pide nombres/apellidos/email (`POST /api/estudiantes`); queda con `usuarios.activado = false` y un `password_hash` placeholder inutilizable. **No hay pantalla de registro para el pasante** — la primera vez que intenta entrar en `/portal/login` con ese email, `app/api/auth/portal-login/route.ts` detecta `activado = false` y guarda lo que escribió en el campo de password como su clave definitiva (`activado` pasa a `true`), en vez de compararla contra una existente. De ahí en adelante el login es el de siempre (`bcrypt.compare`). Esto es la implementación real del "estudiante debe tener lista fija" que quedaba pendiente — ya no es un array hardcodeado, es una fila en `usuarios` con `activado=false`.

**Carga masiva por Excel (Sesión 20):** en la misma página, sección "Carga Masiva por Excel" — botón descarga plantilla `.xlsx` (columnas Nombres/Apellidos/Email, generada client-side con `xlsx`/SheetJS), input de archivo parsea el `.xlsx` subido en el navegador (`XLSX.read` + `sheet_to_json`, columnas detectadas sin importar mayúsculas) y llama `POST /api/estudiantes/bulk` con `dryRun:true` → tabla de vista previa con estado por fila (✅ OK / ❌ motivo: campos faltantes, email inválido, duplicado en el archivo, o ya existente en `usuarios`). Nada se guarda hasta pulsar "Confirmar y Crear", que reenvía solo las filas válidas con `dryRun:false` — mismo endpoint hace el insert real (misma lógica de placeholder `password_hash` + `activado=false` que el alta individual). El alta uno-por-uno original no cambió, es una sección aparte en la misma página.

Investigación (hoy: Jhonny, German, Cristina, Johana) — nota histórica de Sesión 19, **ya obsoleta**: en su momento la tarjeta "Gestionar Investigación" no tenía links reales. Desde entonces (sin sesión que lo documentara hasta la auditoría de Sesión 33) se repuso el link a `/investigacion/espacios` y se sumó el módulo de Informes Mensuales (`/investigacion/informes`) — ver `### Módulo Informes Mensuales de Investigación` más abajo. Investigación ya tiene función propia real, esto no es solo "Próximamente".

**Gestión de Carrera** (`/gestion-carrera`) es aparte: cualquier docente (investigación o vinculación) registra ahí eventos generales de difusión, categorizados como Investigación (¿qué proyecto?) / Vinculación / Asignatura (texto libre) — no reemplaza el formulario simple de Difusión que ya usa el estudiante-instructor dentro de su espacio.

### Tablas Neon (esquema real, no siempre igual a `scripts/migrate.js` — hubo drift por cambios hechos fuera de git)
| Tabla | Para qué | Notas |
|---|---|---|
| `usuarios` | Personas del Portal (todos los roles) | Fuente de verdad de "quién es quién" en el sistema nuevo |
| `perfiles_estudiantes` / `perfiles_beneficiarios` | Datos extra según rol | perfiles_estudiantes: carrera/modalidad. perfiles_beneficiarios (Sesión 21): contacto, edad, tiene_discapacidad/tipo_discapacidad, situacion_ocupacional (solo_estudia\|estudia_trabaja\|solo_trabaja\|desempleado_no_estudia) + condicionales rol_laboral / nivel_educativo (universidad\|colegio\|escuela) / carrera / curso — reemplaza la antigua columna situacion_laboral (texto libre) |
| `espacios_enseñanza` | Clubes/aulas/cohortes | Columna `area`: `vinculacion`\|`investigacion`. Sesión 55: `usa_aulas BOOLEAN` (default `false`) — opt-in a subaulas, solo lo activa el líder de Vinculación/superadmin (`puedeGestionarVinculacion`). Sesión 56: `entidad_id` (FK a `entidades_beneficiarias`, nullable) — la entidad anfitriona real del espacio (ONG, unidad educativa, ULEAM-FEDU), distinta del espacio en sí. |
| `entidades_beneficiarias` | Catálogo de entidades beneficiarias reales (Sesión 56) | `id, nombre, tipo, activo`. Un espacio ocurre DENTRO de una entidad — antes solo existía `proyectos.entidad_beneficiaria` (1 texto libre para todo el proyecto). CRUD mínimo en `GET/POST /api/entidades-beneficiarias`, asignación por espacio en `/vinculacion/espacios`. |
| `aulas` | Subaulas/subgrupos opcionales dentro de un espacio (Sesión 55) | `espacio_id`, `nombre`, `activa`. Solo se usa cuando `espacios_enseñanza.usa_aulas = true`; CRUD en `/api/espacios/[id]/aulas` (y `/[aulaId]`), gestionable solo por el líder de Vinculación/superadmin. Todo alta de beneficiario en un espacio con `usa_aulas` exige `aula_id` (`lib/aulasEspacio.ts:resolverAulaInscripcion`, usado en `registrar-y-evaluar`, `espacios/asignar` y `enlaces`); `enlaces_evaluacion.aula_id` liga el QR de pretest a un aula. Sin esto los beneficiarios nuevos quedaban sin aula y no salían en la asistencia (caso Juan Montalvo, 2026-10-05). |
| `espacio_instructores` | Qué estudiante es instructor de qué espacio | Base del control de acceso por espacio. Sesión 55: `aula_id` nullable (`ON DELETE SET NULL`) para acotar el checklist de asistencia a la aula elegida cuando el espacio la usa. |
| `inscripciones_espacio` | Beneficiarios asignados a un espacio | Sesión 55: `aula_id` nullable, mismo uso que en `espacio_instructores`. |
| `ciclos_academicos` | Semestres | Compartido entre áreas, no se etiqueta |
| `evaluaciones_mcer` | Resultados del test MCER | `beneficiario_id` es **entero** → `usuarios.id` (se corrigió en Sesión 19, antes era UUID roto contra la tabla vieja `beneficiarios`) |
| `encuestas_satisfaccion` | Encuestas de satisfacción + impacto percibido | Sesión 62: `impacto_estudios`/`uso_aprendido`/`seguridad_hablar`/`oportunidades` (1-5), `recomendaria` (0-10, NPS), `espacio_id`, `origen` (`qr_beneficiario`\|`panel_pasante`\|`panel_docente`) y `registrado_por`. `encuesta_evaluaciones_instructor`: `calificacion` nullable + `no_aplica`, `observacion`, `sesiones_compartidas` (CHECK nota o no aplica). Filas anteriores quedan con las columnas nuevas en NULL. |
| `actividades_difusion` | Eventos/podcasts (Difusión + Gestión de Carrera) | `categoria`/`proyecto`/`asignatura`/`descripcion`/`hora`/`observaciones` + `profesores_responsables integer[]` (Sesión 23, ver abajo) |
| `asistencia_espacio` / `asistencia_beneficiarios` | Bitácora de asistencia por espacio | Reemplaza el módulo viejo `bitacora_asistencia` (UUID). Desde Sesión 41: `asistencia_espacio` gana `hora_inicio`/`hora_fin` (obligatorias), `foto_url`/`foto_public_id` (opcional) y `estado_aprobacion` (`pendiente`\|`aprobado`\|`rechazado`) + `aprobado_por`/`fecha_aprobacion`/`motivo_rechazo` — supervisión en `/vinculacion/supervisar`. Sesión 55: `auditoria_ia_estado` (`ok`\|`discrepancia`\|`no_disponible`\|`pendiente`), `auditoria_ia_conteo_detectado`, `auditoria_ia_conteo_esperado` — auditoría IA de la foto, informativa, nunca bloquea (ver `### Sesión 55`). |
| `calificaciones_ciclo` | ⚠️ **Sin usar** | Feature "Calificaciones" del panel docente se eliminó (Sesión 19, decisión del usuario: el test MCER es la única evaluación real). Tabla queda huérfana, no se borró. |
| `Contribution` / `ContributionAuthor` | Contribuciones académicas de docentes (artículos, libros, capítulos, memorias de evento, propiedad intelectual) | **Nombres con mayúscula, sin snake_case** — a diferencia de todo el resto del esquema, porque se manejan vía Prisma (`prisma/schema.prisma`) sin `@@map`, no SQL crudo. Creadas a mano en Sesión 24 con `scripts/migrate-contribuciones.js` (no con `prisma db push`, ver advertencia en `## Stack Técnico`). Visibilidad: `GET`/`DELETE /api/contribuciones` solo `modulos_acceso: admin`; `POST` cualquier docente (`rol: profesor\|admin`) autenticado. |
| `fotos` | Banco de fotos administrable (Sesión 32, ampliado Sesión 36, 52 y 53) | `ubicaciones TEXT[]` decide dónde aparece cada foto — valores reales hoy: `portada` (`PhotoCarousel`), `docencia-galeria` (`ActivityGallery`), `redlea-galeria` (`RedLEAGaleria`), `club-ingles` (`EnglishClubSection`), más una galería por proyecto (Sesión 52). `posicion INT` (0-100, Sesión 34) controla el recorte vertical. Ocultar sin borrar vía `activo`. Sesión 52: `proyectos`, `menores`, `visibilidad`, `descartada` (+`foto_descartada(url)`). Sesión 53: `calidad` (`no_revisada|aceptable|mala`, segunda confirmación aparte de `menores`) y `propuestas TEXT[]` (cola de "proponer para portada", distinta de `ubicaciones`: proponer nunca publica). |
| `proyectos` | Catálogo de proyectos/redes del grupo, controla el nav público (Sesión 32) | Creada en una sesión anterior no documentada (probablemente Antigravity) pero nunca leída por código hasta Sesión 32 — ahora `components/Header.tsx` la consume vía `/api/proyectos` con fallback hardcodeado si falla. `tipo='plantilla_simple'` (desarrollo_habilidades, mentoring, y cualquiera nuevo creado desde `/admin/proyectos`) vs `tipo='personalizada'` (internacionalizacion, vinculacion, docencia_innovadora, redlea — página con código bespoke, solo se puede ocultar/reordenar desde admin, no recrear). |
| `enlaces_evaluacion` | Enlaces/QR públicos sin login para pretest/postest (Sesión 28) | `token` UUID, `tipo` pretest\|postest, `test_tipo` mcer\|encuesta, `max_usos`/`usos_actuales`. Consumida por `/api/enlaces/**` |
| `encuesta_evaluaciones_instructor` | Calificación de cada estudiante-instructor dentro de la encuesta ampliada (Sesión 29) | Una fila por instructor evaluado, no una sola pregunta genérica — se genera dinámicamente según `espacio_instructores` |
| `perfiles_horario_tutorias` | Horario de tutorías de cada profesor, publicable en la web pública (Sesión 27/31) | `usuarios.horario_tutorias_publico` (Sesión 31) decide si sale en `GET /api/docentes/horario-tutorias` (público) — default `false`, opt-in |
| `perfiles_titulos_academicos` | Títulos académicos que el propio profesor gestiona desde `/portal/perfil` | Consumida por `app/api/perfil/titulos/**` |
| `informes_mensuales` | Historial de informes mensuales de Investigación generados (`/investigacion/informes`) | Ver `### Módulo Informes Mensuales de Investigación` arriba — módulo documentado recién en Sesión 33 pese a existir desde antes |
| `modalidades_titulacion`, `rubricas`, `evaluaciones`, `evaluacion_observaciones`, `evaluacion_indicadores` | Pares Lectores (`/utilidades/pares-lectores`) | Creadas por `scripts/migrate-utilidades.js`, ver `### Módulo /utilidades` arriba |
| `superadmin_audit_log` | Log de auditoría de cada acción del módulo Superadmin | Ver `### Módulo Superadmin` arriba — módulo entero sin documentar hasta Sesión 33 |
| `revistas_diamante` | Catálogo de 5.612 revistas diamante para el Buscador de revistas (`/utilidades/revistas`, Sesión 67) | Creada con `scripts/migrate-revistas-diamante.js`; carga `import-revistas-diamante.js` (desde `zenodo.xlsx`), `enriquecer-revistas-openalex.js` (temas/títulos recientes por ISSN, reanudable) y `normalizar-perfil-revistas.js` (**correr siempre al final**: deja `perfil_texto` sin tildes/minúsculas para el full-text). ~52 MB tabla+índice con el enriquecimiento completo (5.536 de 5.612 revistas encontradas en OpenAlex; BD total 66 MB de 500 MB al 2026-11-06). **Citar siempre la fuente:** Universitat de València, Servei de Biblioteques i Documentació (2026), *Revistas Diamante. Revisión septiembre 2026* (v6), Zenodo, https://zenodo.org/records/22763970 — ya va en el pie de la página y en el CSV exportado. |
| `enlaces_difusion` | Enlaces/QR temporales sin login para que alguien SIN cuenta registre un evento/podcast (Sesión 37) | `token` UUID, `creado_por` (profesor que lo generó), `expira_en`, `max_usos`/`usos_actuales`, `activo` (revocable). Consumida por `/api/enlaces-difusion/**`. Las filas que crea en `actividades_difusion` nacen con `origen='externo_temporal'` y `aprobado_sitio=false` forzado en el servidor — misma cola de moderación de `/admin/contenido` que el resto de difusión. |
| `horas_podcast_pasante` | Horas acreditables por participar en un podcast de Vinculación (Sesión 38) | Una fila por pasante por episodio, `video_id`+`usuario_id` UNIQUE. Ver `lib/horasPodcast.ts` para la fórmula. Las horas solo cuentan en el seguimiento (`/portal/dashboard`, `/vinculacion/pasantes`) cuando el `videos.aprobado_sitio` del episodio es `true` — no hay columna propia de estado, se resuelve con JOIN en cada lectura. **Distinto de la aprobación de horas** (`estado_aprobacion` de esta misma tabla, Sesión 50): aprobar horas y publicar el video (`aprobado_sitio`) son decisiones separadas; desde la Sesión 53, un supervisor puede publicar el video con `PATCH /api/videos/[id]/aprobar` sin que eso apruebe las horas, y viceversa. |
| `videos` (columnas nuevas, Sesión 53) | Quién puede aprobar/publicar el video sin `contenido_sitio` | `profesores_responsables INTEGER[]` (igual patrón que `actividades_difusion`) y `actividad_difusion_id` (FK, solo se llena si el video nació junto con un registro de `/vinculacion/difusion` — sin backfill de los videos previos a esta sesión). Ver `lib/permisosAprobacionContenido.ts`. |
| `horas_asistencia_instructor` | Horas acreditables por sesión de asistencia aprobada (Sesión 41) | Una fila por instructor por sesión, `asistencia_id`+`usuario_id` UNIQUE. Horas = `hora_fin - hora_inicio` real (`lib/horasAsistencia.ts`), acreditadas a todos los instructores del espacio (`espacio_instructores`), sin repartir. A diferencia de podcast, se insertan/borran directamente al aprobar/rechazar en `PATCH /api/vinculacion/supervisar-asistencia/[id]` (no se resuelven por JOIN de un estado ajeno). |

| `actividades_investigacion_pasante` | Horas/actividades de investigación reportadas por un pasante con `modulos_acceso: investigacion` (Sesión 39, sin sesión previa que lo documentara — encontrada en la limpieza de esta sesión, ya era código real en producción) | `POST/GET /api/actividades-investigacion`, UI en `/vinculacion/investigacion-actividades`. Una fila por reporte. **Desde Sesión 50 requiere aprobación del supervisor** (`estado_aprobacion`, `aprobado_por`, `fecha_aprobacion`, `motivo_rechazo`); solo las aprobadas suman horas. |
| `actividades_autonomas_pasante` | Horas/actividades autónomas del pasante — planificar, crear recursos, etc. (Sesión 50, continuación) | Creada con `scripts/migrate-actividades-autonomas.js`. Mismo esquema que investigación (`usuario_id`, `fecha`, `descripcion`, `horas`, `estado_aprobacion` con CHECK, `aprobado_por`, `fecha_aprobacion`, `motivo_rechazo`, `creado_en`). **Tope de 16 h por pasante** (`lib/horasAutonomas.ts`), validado en `POST /api/actividades-autonomas`; cuentan pendientes+aprobadas, las rechazadas liberan cupo. UI del pasante: `/vinculacion/actividades-autonomas`; la aprueba el supervisor en `/vinculacion/supervisar` (pestaña Autónomas). |

**Limpieza de esquema (Sesión 39):** 13 tablas huérfanas/sin-uso confirmadas por auditoría exhaustiva de código (grep de `FROM/JOIN/INTO/UPDATE` en todo `app/`+`lib/`, cero coincidencias) **eliminadas de Neon** — `estudiantes`, `espacios`, `beneficiarios`, `bitacora_asistencia`, `bitacora_estudiantes`, `bitacora_beneficiarios` (esquema UUID viejo pre-Sesión-19, tenían 3 cuentas huérfanas ya inservibles — Andy Castillo, Josselyn Mera, Ailys Bailón, confirmado que debían re-registrarse de todos modos), `avance_investigacion`, `seguimiento_laboral`, `eventos_difusion`, `eventos_estudiantes`, `encuesta_satisfaccion` (singular), `calificaciones_ciclo`, `asistencias_eventos` (las últimas 8, todas con 0 filas, creadas fuera de git). `actividades_investigacion_pasante` estaba en la misma lista de "sin documentar" pero **se confirmó como feature real en uso** (ver fila de arriba) — no se tocó.

### Variables de entorno requeridas (Neon/Portal)
`DATABASE_URL` (Neon), `SESSION_SECRET` (firma de `pine_app_session`), `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` (uploads). Todas ya están en Vercel Production — ver `.env.local.example` para desarrollo local.

### Módulo `/utilidades` — generación de documentos administrativos (Sesión 27)

Generador de documentos `.docx` para trámites de la carrera, integrado dentro de `app/utilidades/` (venía de un proyecto standalone "Utilidades" — la carpeta portable original `carrera-herramientas/` se eliminó en esta sesión, ya no se usa). 5 herramientas: **Acta Técnica**, **Oficios**, **Convocatorias** (a docentes o a estudiantes vía Excel), **PATs Maestría** (paquete PAT-003 a PAT-006), **Pares Lectores** (evaluación de trabajos de titulación). Todas con redacción asistida por IA (Groq) para los campos de texto libre.
- **Buscador de revistas diamante (`/utilidades/revistas`, Sesión 67):** sexta herramienta, no genera `.docx`. Entrada: título (obligatorio) + resumen/abstract/keywords/referencias/idioma/filtros. Motor en `_lib/revistasRanking.ts` (candidatas por full-text con prefijos sobre `revistas_diamante.perfil_texto`, ponderación idf, puntaje = temático 55 % + referencias 25 % + impacto/cuartil 20 %; sin referencias 75/25), `_lib/revistasExterno.ts` (Crossref para revistas citadas, Groq para conceptos ES/EN, ambos opcionales) y `_lib/revistasTexto.ts`. API `POST /utilidades/revistas/api/buscar` con `requireDocenteApi()`; no guarda nada del artículo. Exporta CSV en cliente. Atribución del dataset obligatoria (ver fila `revistas_diamante`).

- **Selector de docentes (Acta Técnica, Oficios, Convocatorias a docentes):** hasta esta sesión leían de una tabla `docentes` separada de `usuarios` — que además **nunca llegó a crearse en la Neon de producción real** (el fetch fallaba silenciosamente con "relation docentes does not exist", el frontend caía a un array vacío, y nadie lo notó porque el modo manual siempre estaba disponible). Se unificó: en vez de crear esa tabla huérfana, `usuarios` ganó columnas opcionales `titulo_grado`/`post_grado`/`cargo_institucional`/`es_director`/`dependencia` (`scripts/migrate-usuarios-docentes.js`). Una fila de `usuarios` aparece en estos selectores cuando `titulo_grado IS NOT NULL`, sin importar su `rol` de auth — `app/utilidades/_lib/docentes.ts` es la única fuente (`getAllDocentes`/`getDocentesByCarrera`/`getAllCarreras`), consumida sin cambios por Convocatorias/Oficios y ahora también por Acta Técnica (antes 100% texto libre manual).
- **Dos tipos de fila en `usuarios` para este directorio:** (a) docentes reales de PINE con `rol='profesor'`, `activado=false` — se activan solos con su email real en su primer login (idéntico al alta de pasantes); (b) autoridades externas que **nunca** inician sesión (Decano, Rectora Subrogante, Director DIPSB) con `rol=NULL` (columna ya nullable, no se tocó el CHECK) y `activado=false` permanente, invisibles para todo el middleware/auth — mismo patrón de email placeholder que `beneficiarios`.
- **14 personas sembradas** (Sesión 27, todas confirmadas explícitamente por el usuario): Arturo Rodríguez, Jhonny Villafuerte, Cintya Zambrano (ya eran usuario real); María Cristina Basantes Robalino, Gabriel Bazurto Alcívar, Laura Mena Sánchez, Ulbio Farfán Corrales (unifica lo que en un seed viejo nunca aplicado aparecían como dos personas distintas, "Gonzalo" y "Ulbio" Farfán), Jorge Corral Joniaux, Germán Carrera Moreno (Coordinador de Carrera — no "Director", corregido en esta sesión), Verónica Chávez Zambrano (Responsable de Comisión Académica), Yasmín Bermúdez Velasco (Secretaria de Carrera — no es docente, pero firma/participa en los mismos documentos de `/utilidades`) — pre-alta pendiente de activación; Jackeline Terranova Ruiz (Rectora Subrogante — actualizado en esta sesión, antes decía Vicerrectora Académica), Klever Alfredo Delgado Reyes (Director DIPSB), Pedro Quijije Anchundia (Decano, Facultad de Educación y Turismo) — autoridades externas sin cuenta real.
- **Otras tablas del módulo** (no tocadas en esta unificación, siguen igual): `modalidades_titulacion`, `rubricas`, `evaluaciones`, `evaluacion_observaciones`, `evaluacion_indicadores` (Pares Lectores) — creadas por `scripts/migrate-utilidades.js`, que ya NO crea/siembra `docentes`.
- **Auditoría de las 5 herramientas (Sesión 27, a pedido del usuario) — 3 hallazgos reales corregidos:**
  1. ⚠️ **Ninguna de las 20 API routes de `/utilidades` verificaba sesión** — `middleware.ts` protege las páginas pero su `matcher` excluye `/api` explícitamente (necesario para las APIs públicas del sitio, ej. `/api/members`), y ninguna ruta de `/utilidades/**/api/**` hacía el chequeo por su cuenta (a diferencia de `/api/beneficiarios`, `/api/estudiantes`, etc., que sí llaman `getAppSessionFromCookies()` dentro del handler). Cualquiera sin sesión podía generar documentos institucionales o leer/modificar evaluaciones de Pares Lectores solo conociendo la URL. Corregido con un helper nuevo (`app/utilidades/_lib/auth.ts:requireDocenteApi()`, mismo criterio que el middleware: `rol` profesor o admin) agregado a las 20 rutas.
  2. El "Tutor" que firma PAT-006 (PATs Maestría) estaba **hardcodeado a "Dr. Rodríguez Zambrano Arturo Damián, PhD"** sin importar qué maestría/responsable se hubiera seleccionado — las 3 maestrías tienen responsables distintos ya calculados en `datos.responsable` (Vanessa Vargas Parraga, Diana Delgado Mero, Gabriel Bazurto Alcívar). Corregido en `_lib/patMaestria.ts`.
  3. Pares Lectores: el campo "evaluador/a" (quien hace la evaluación) no se autocompletaba con el usuario logueado — mismo patrón de autoselección que ya se agregó a Firmante/Convocante/Elaborado por, aplicado aquí también.
  4. Pares Lectores, ronda 2 (a pedido del usuario): "Tutor/a" (quien dirigió la tesis) ahora se elige de la lista de docentes igual que Convocante/Firmante en las otras herramientas — no se autocompleta con el logueado porque es una persona distinta del evaluador/a. Además, el paso 1 ahora acepta subir el memo **y** el trabajo de titulación (antes solo el memo) — la IA usa ambos textos para precargar los datos, ya que el memo no siempre trae todo (ej. tutor/a, título exacto); los archivos subidos ahí se reusan al crear la evaluación, sin pedirlos de nuevo en el paso 3.

### Módulo Superadmin (`/superadmin`) — existía en el código, nunca documentado hasta Sesión 33

Auditoría de Sesión 33 encontró un módulo completo, funcional y en producción, ausente de CLAUDE.md/ANTIGRAVITY.md/README.md/MANUAL_USUARIO.md desde que se construyó. Es un explorador directo de la base de datos Neon completa — mucho más poder de acceso que cualquier otro módulo del sitio, por eso se documenta aparte con énfasis en el riesgo.

- **Qué hace:** lista todas las tablas (`/superadmin`), ve/edita filas de una tabla elegida con su schema real (`/superadmin/[table]`), corre SQL arbitrario de solo lectura o escritura contra la Neon de producción (`/superadmin/sql`), permite impersonar cualquier usuario ("Ver como") desde `/superadmin/ver-como`, y guarda un log de auditoría de cada acción (`/superadmin/audit`, tabla `superadmin_audit_log`).
- **Funcionalidad "Ver como" (Sesión 46):** accesible desde `/superadmin/ver-como` y desde la barra superior de `/superadmin`. Ofrece:
  - **Filtro 1 (Roles y Módulos):** casillas de verificación para Roles (`profesor`, `estudiante`, `admin`, `beneficiario`), Módulos (`vinculacion`, `investigacion`, `subir_video`, etc.) y selector de **usuarios con múltiples accesos / roles (2+ módulos)**.
  - **Filtro 2 (Persona):** búsqueda en tiempo real por nombres, apellidos, correo o cédula.
  - **Mecanismo:** `POST /api/superadmin/impersonate` emite la cookie HMAC con los datos del usuario objetivo y la propiedad `impersonatedBy` conservando los datos del Superadmin original (`lib/session.ts`).
  - **Barra Flotante Global (`components/ImpersonationBanner.tsx`):** banner amarillo fijo en la parte superior del sitio que indica que el modo *"Ver como"* está activo y expone el botón `↩ Volver a Superadmin` (`POST /api/superadmin/impersonate/revert`).
  - **Auditoría:** todas las impersonaciones e inicios/cierres registran eventos `impersonate` e `impersonate_revert` en `superadmin_audit_log` (`lib/superadmin-auth.ts`).
- **Doble candado, redundante a propósito:** `middleware.ts` (Edge runtime, no puede importar `@neondatabase/serverless` directo) exige `modulos_acceso.includes('superadmin')` **y** el email en `SUPERADMIN_EMAILS` (hardcodeado en `lib/superadmin-auth.ts`, hoy solo `arturo.rodriguez@uleam.edu.ec`) — ambos chequeos están duplicados también dentro de cada API route (`app/api/superadmin/**`) porque el middleware por sí solo no alcanza a proteger `/api` en este proyecto (su `matcher` excluye `/api`, ver nota en `### Módulo /utilidades` arriba sobre el mismo patrón).
- **`lib/superadmin-db.ts`** arma el SQL dinámico (nombre de tabla/columna viene del usuario en el explorador visual) validando cada identificador contra `information_schema` antes de interpolarlo — mitiga inyección SQL en la capa de "explorar tabla", pero el runner de `/superadmin/sql` ejecuta la query tal cual la escriba quien tenga acceso, sin sandbox — es una herramienta de "manos libres" total sobre la Neon de producción, no un CRUD con barandas.
- **Por qué importa documentarlo:** cualquier cambio futuro a `modulos_acceso` o a la whitelist de emails debe considerar que ese módulo existe — agregar `superadmin` al array de alguien (o a `SUPERADMIN_EMAILS`) le da control total sobre toda la base, no solo sobre "su" área.

### Módulo Informes Mensuales de Investigación (`/investigacion/informes`) — existía, documentado como "pendiente" por error

CLAUDE.md decía desde Sesión 19 que Investigación "todavía no tiene ninguna función propia" — desactualizado, corregido en Sesión 33. El módulo genera el informe mensual que antes se armaba a mano en Word (ver los `.docx`/`.pdf` de `docs/`, ej. `Formato-Informe-Mensual-Comision.docx`):

- `/investigacion/informes` (protegido en `middleware.ts`, rol `profesor|admin` + `modulos_acceso` `investigacion` o `admin`) — selecciona un rango de fechas, trae actividades/publicaciones/episodios de podcast de ese período (`GET .../datos`), arma un resumen ejecutivo asistido por IA, genera el documento (`.../generar`) y lo deja descargable (`.../descargar`), guardando un historial de informes generados (`.../historial`, tabla `informes_mensuales`).
- No estaba mencionado en `## Estado Actual`, `## Estructura de Archivos`, `## Portal PINE` → tablas Neon, ni en `MANUAL_USUARIO.md` — los 4 se corrigieron en Sesión 33.

---

## Estado Actual (actualizado 2026-09-08, Sesión 33 — auditoría exhaustiva de esta tabla, antes congelada desde Sesión 26)

| Módulo | Estado | % |
|--------|--------|---|
| Sitio público (landing + páginas de proyecto) | ✅ Completo — contenido en Neon Postgres (migrado desde `lib/data.ts` estático, Sesión 25), footer/equipo/hub/RED LEA contextuales por proyecto, i18n ES/EN completo (Sesión 26) | 100% |
| Admin Panel (CRUD contenido del sitio) | ✅ Completo — gateado por `modulos_acceso: contenido_sitio` (solo Arturo+Jhonny), ya no por `Pine2026` ni por `admin` genérico. Persiste en Neon (ya no "legacy"/in-memory). 7 secciones: Miembros, Podcast, Categorías, Publicaciones, Noticias, Actividades y Difusión, Documentos, Configuración, **Fotos** y **Proyectos** (Sesión 32) | 100% |
| Portal PINE — Auth unificada | ✅ Completo (Sesión 19) | 100% |
| Portal PINE — Vinculación (espacios/instructores/beneficiarios/MCER/encuesta/asistencia) | ✅ Completo, probado end-to-end en producción (Sesión 19) | 100% |
| Portal PINE — Investigación | ✅ Creación de espacios + **generador de Informes Mensuales** (`/investigacion/informes`, ver `### Módulo Informes Mensuales de Investigación` abajo) — dato de "solo creación de espacios, 30%" quedó obsoleto, el módulo de informes ya es una función real completa | 100% |
| Gestión de Carrera (eventos multi-área) | ✅ Completo (Sesión 19) | 100% |
| Contribuciones Académicas | ✅ Completo — wizard con campos comunes **y** los ~17 campos específicos por tipo (`scripts/migrate-contribucion-campos-tipo.js`, `migrate-contribucion-autor-estudiante.js`, ambas migraciones aplicadas sin sesión documentada hasta ahora). ⏳ Sigue faltando exportación CSV y tests (Jest/Cypress) del plan original — dato de "60%, faltan ~15 campos" quedó obsoleto | 90% |
| Módulo `/utilidades` (Acta Técnica/Oficios/Convocatorias/PAT-Maestría/Pares Lectores) | ✅ Selector de docentes unificado en `usuarios` con 14 personas del directorio confirmadas por el usuario (la fila decía "13" por error de transcripción — el propio detalle de Sesión 27 siempre dijo 14), funcional en las herramientas que lo usan (Sesión 27) | 100% |
| **Superadmin** (`/superadmin`) | ✅ Completo pero **nunca documentado hasta esta sesión** — explorador de tablas + runner de SQL crudo sobre toda la Neon, doble candado (`modulos_acceso: superadmin` + email hardcodeado en `lib/superadmin-auth.ts`, hoy solo Arturo). Ver `### Módulo Superadmin` abajo | 100% |
| **Banco de Fotos + config de proyectos/nav** (Sesión 32) | ✅ `/admin/photos` (banco de fotos administrable, carrusel en portada) + `/admin/proyectos` (ocultar/reordenar cualquier proyecto o red del nav, crear proyectos nuevos "plantilla_simple" sin código) | 100% |
| Deploy Vercel | ✅ Auto-deploy activo en push a `main` | 100% |

**Progreso general del sitio público: ~99%. Portal PINE (Neon): recién construido, en uso real solo por Arturo hasta que el resto del equipo se autoregistre.**

## Documentos generales del proyecto (2026-09-24)

Dos PDFs privados exclusivos del proyecto Innovaciones Pedagógicas e Internacionalización, en `public/admin-assets/` y registrados en `/admin/documents` (categoría `proyecto`):
- `2026-05-19_AporteEconomicoExternoEspecies-signed.pdf` — aporte económico externo en especies (firmado, 19-may-2026).
- `2025-09-24_AvalRed.pdf` — aval de red. Fecha tomada del nombre original (`20250924`); confirmar si era 2026.

---

## ⚠️ Auditoría 2026-09-24 y guardrails de despliegue (LEER ANTES DE PUSHEAR)

Auditoría pedida por el usuario tras fallos de deploy y trabajo en paralelo con Antigravity. Fuentes: `git log`, Vercel (deployments + build logs + runtime logs), `tsc`, barrido de rutas API y de docs.

### Fallo de deploy real encontrado (Vercel, proyecto `pineuleam` (antes `carrerapineuleam`))
- `dpl_HqedNdC9…` — commit `012d646` (feat difusión con IA/maestría, 2026-09-23) → **ERROR**: `Syntax Error … Expected ',', got 'hora'` en `app/vinculacion/difusion/page.tsx:61-67` (objeto de estado inicial con claves duplicadas/coma faltante: `audiencia_alcanzada` dos veces). Se pusheó **sin correr `npm run build`/`tsc`**. Producción siguió sirviendo el build anterior hasta que `c486110` lo arregló (~3 h después). Nada roto en runtime: 0 errores en logs de producción últimos 7 días.
- Deploys `CANCELED` (3) = commits de solo docs que llegaron pegados a otro commit; `vercel-ignore-build.sh` los salta a propósito (evita cuota de ~300 funciones por deploy). No son fallos.

### Bug de "Ver como" en producción (2026-09-24) — código y esquema desincronizados
- Síntoma: al suplantar a un usuario, `new row for relation "superadmin_audit_log" violates check constraint "superadmin_audit_log_tipo_accion_check"`. Causa: Sesión 46 agregó `impersonate`/`impersonate_revert` en `lib/superadmin-auth.ts` pero **nunca se amplió el CHECK en Neon**; la feature no funcionó desde su despliegue. Corregido en Neon vía MCP + `scripts/migrate-audit-impersonate.js` (y `migrate-superadmin.js` actualizado).
- **Lección:** si un cambio de código agrega un valor a un enum/CHECK/union que vive también en la BD, migrar la BD en el mismo cambio y probar el flujo real (no solo `build`). `tsc`/`build` no detectan constraints de Postgres.

### Reglas obligatorias (Claude y Antigravity)
1. **Antes de `git push` con cambios en `.ts/.tsx`: `npx tsc --noEmit` y `npm run build` deben pasar localmente.** El auto-commit hook empuja solo; si editaste código, verifica antes de cerrar la sesión.
2. Nunca dejar claves duplicadas en objetos de estado de formularios (React `useState({...})`): tras pegar bloques generados, releer el objeto completo.
3. `neon()` nunca a nivel de módulo; en GET públicos sin sesión usar `{ fetchOptions: { cache: 'no-store' } }` (ver Sesión 31/37).
4. Commits de solo `.md`/`docs/` no generan deploy (por diseño). Si un cambio de código va mezclado con docs, sí despliega.
5. Tras push: confirmar en Vercel (`list_deployments`) que el estado es `READY`; si `ERROR`, leer `list_deployment_events` y corregir antes de seguir.
6. Migraciones de esquema: correr auditoría `information_schema` primero; nunca `prisma db push`/`migrate`.

### Hallazgos de la auditoría (abiertos salvo que diga lo contrario)
- ✅ **CORREGIDO 2026-09-24** (`scratch/` en `.gitignore` y fuera de git; skill sin email real ni clave fija). Original: **`scratch/` (7 scripts) y `.agents/skills/gestion-estudiantes/` estaban trackeados en git.** El skill trae un email real de estudiante y el password de ejemplo `Pine2026`, más un comando `reset-password` directo contra la Neon de producción. Sugerido: `scratch/` a `.gitignore` y `git rm --cached`; revisar que el skill nunca use una clave fija real.
- ✅ **CORREGIDO 2026-09-24** (usa el email de la sesión activa). Original: `esSuperAdminOLider()` usaba `impersonatedBy.email`: al usar "Ver como" sobre un profesor normal, el superadmin **sigue viendo todo** en supervisión → la vista impersonada no refleja lo que ese profesor realmente vería. Corregir usando el email efectivo del usuario impersonado.
- ✅ **Resuelto en Sesión 50:** `LIDERES_PROYECTO_EMAILS` se eliminó; el permiso de líder es el módulo `vinculacion_gestion` (`lib/modulos.ts:puedeGestionarVinculacion`). La supervisión de asistencia filtra por `espacios_enseñanza.profesor_id` para profesores regulares.
- ✅ **CORREGIDO 2026-09-24** (403 si no es profesor/admin). Original: `GET /api/espacios/instructores?profesor_ids=` no validaba rol: cualquier sesión (incl. estudiante) lista pasantes de esos profesores (solo id/nombre). Bajo riesgo; restringir a profesor/admin o a `puedeOperarEspacio`.
- 🟡 `.env.local.example` estaba desactualizado (mencionaba password `Pine2026` y `ADMIN_SESSION_SECRET` obsoletos; faltaban Cloudinary/YouTube) → corregido en esta auditoría.
- ✅ **CORREGIDO 2026-09-24** (orden 48→47→46→44→45→43→42, entradas 44/46/47, `package.json` 0.12.2). Original: documentación desordenada: secciones "Cambios Recientes" fuera de orden (48, 43, 45, 42…), no existen secciones propias de Sesiones 44, 46 (solo en CHANGELOG/Superadmin), 47; pie de CLAUDE.md decía Sesión 43/v0.10.16 (corregido); `package.json` sigue en `0.1.0`; README decía 0.12.1 (corregido).
- ✅ **CORREGIDO 2026-09-24** (ver Sesión 44/47). Original: funcionalidad sin documentar: página de Política de Privacidad (ES/EN), subida de audio en MCER con recorte a 30 s (`lib/mcerAudio.ts`, `@breezystack/lamejs`), editar/eliminar espacios de vinculación, contador de instructores/supervisor, horas de investigación de pasantes e import de vinculación 2026-2, permisos de supervisión por profesor. Ver CHANGELOG para el detalle parcial.
- ✅ Verificado OK: `tsc --noEmit` limpio; ninguna ruta API nueva sin chequeo de sesión (las sin sesión son login/registro/públicas por diseño; informes usan `requireInvestigacionApi`); sin `neon()` a nivel de módulo; sin secretos/cadenas de conexión hardcodeados; `docencia/ciclos` ya usa `no-store`.

## Reglas y arquitectura vigentes (resumen de las sesiones 8-66)

> El historial detallado por sesión (qué se hizo, pruebas, incidentes) vive en [`docs/HISTORIAL_SESIONES.md`](docs/HISTORIAL_SESIONES.md); `CHANGELOG.md` resume por versión. Las referencias "Sesión N" de este archivo apuntan a ese historial. Aquí quedan solo las reglas que siguen rigiendo el código.

### Permisos y roles
- **Fuente única de helpers:** `lib/modulos.ts`. Módulos (`usuarios.modulos_acceso`): `vinculacion` = Supervisor (aprueba lo de SUS pasantes, los de sus espacios por `profesor_id`); `vinculacion_gestion` = Líder de Vinculación (crea espacios, administra pasantes, ve la supervisión de todos; implica `vinculacion`); `investigacion`; `subir_video`; `contenido_sitio` (`/admin`, solo Arturo+Jhonny); `admin` (`/admin/roles`, `/pine-dashboard`); `superadmin` (no editable desde la UI). No hay listas de emails para permisos, salvo el doble candado de `lib/superadmin-auth.ts`. No ampliar módulos ni helpers sin confirmación del usuario.
- **Los módulos viajan firmados en la cookie** (`pine_app_session`): un cambio en Neon se ve tras pasar por `/portal/dashboard` (compara y re-emite vía `GET /api/auth/sync`). Los chequeos de API leen la cookie.
- **Módulos derivados:** para docentes, `modulos_acceso` = derivados de `proyecto_miembros` ∪ `modulos_manuales` − `modulos_excluidos` (`lib/permisosPertenencia.ts`, `recalcularModulos`). Para pasantes (`rol='estudiante'`) la asignación es directa.
- **Por proyecto:** toda función administrable por proyecto (fotos, textos, equipo, noticias) se autoriza con `lib/permisosProyecto.ts` (`puedeGestionarProyecto` consulta `proyecto_miembros` en cada petición, nunca la cookie). Un líder/colíder administra solo su proyecto; portada y lo global son de administración del sitio.
- **Aprobación de contenido fuera de `contenido_sitio`** (supervisor de un pasante, profesor responsable, líder del proyecto): siempre por `lib/permisosAprobacionContenido.ts`. Quien aprueba nunca es quien registró, salvo que se haya marcado a sí mismo como responsable. Aprobar horas y publicar el video son decisiones separadas.
- **Roles `secretaria` y `colaborador`:** acceso por defecto-denegado en `middleware.ts` (`RUTAS_SECRETARIA`/`RUTAS_COLABORADOR`). Una API nueva que solo exija sesión debe rechazar ambos (el `matcher` del middleware excluye `/api`).
- **Bajo "Ver como"** los permisos se evalúan con la identidad suplantada.

### Datos y Neon
- `neon()` nunca a nivel de módulo; en GET públicos sin `cookies()` usar `{ fetchOptions: { cache: 'no-store' } }` (el Data Cache de Next cachea por texto de query; `force-dynamic` no lo evita).
- Cambio de código que agrega un valor a un enum/CHECK/union que vive también en la BD: migrar la BD en el mismo cambio y probar el flujo real, no solo `tsc`/`build`. Probar cada consulta nueva contra Neon real.
- Nunca `prisma db push`/`migrate` (ver `## Stack Técnico`). Las columnas `mes` de `informes_vinculacion`/`supervision_obstaculos` son `date`: normalizar `YYYY-MM` a `YYYY-MM-01`.
- **Plantillas `.docx`:** todas en `/templates` (nombres kebab-case con prefijo por módulo). Una plantilla leída en runtime con ruta dinámica necesita su entrada en `next.config.js` → `outputFileTracingIncludes`, o falla con `ENOENT` solo en Vercel.
- **Migrar de forma aditiva** y dejar el script en `scripts/`; nunca crear tablas en Neon fuera de un script versionado.

### Dominio de Vinculación
- **Horas:** las acredita el supervisor al aprobar (`estado_aprobacion`); topes por pasante en `lib/topesHoras.ts` (`verificarCupo`, `horasContables`); asistencia = `hora_fin − hora_inicio` reales (`lib/horasAsistencia.ts`), solo a quien quedó presente en `asistencia_instructores`; podcast con `lib/horasPodcast.ts`.
- **Periodos fijos del proyecto** (`lib/periodosProyecto.ts`): 1 = abril–agosto, 2 = septiembre–diciembre; no coinciden con `ciclos_academicos`. El informe semestral no guarda `mes` (identidad `(tipo, supervisor_id, ciclo_id)`); el mensual sí.
- **Beneficiario:** nunca tiene cuenta; solo se crea junto con su Pre-Test (`POST /api/beneficiarios/registrar-y-evaluar` o el enlace público). Postest MCER + encuesta siempre juntos.
- **Encuestas:** toda encuesta pasa por `lib/encuestaImpacto.ts` (`validarEncuesta`, `pasantesAEvaluar`, `guardarEncuesta`); se califica solo a los pasantes que coincidieron con el beneficiario.
- **Duplicados y tope de invitados:** `lib/similitudRegistros.ts` (umbrales 70 % aviso / 90 % bloqueo; también dentro de los POST de guardado) y `lib/topeInvitadosAsistencia.ts` (nunca exponer el número calculado). No reimplementar Levenshtein/Jaccard.
- **Subaulas:** opt-in por espacio (`usa_aulas`), gate `puedeGestionarVinculacion`.
- **Auditoría IA de la foto** (`lib/groqVision.ts`): solo informativa, nunca bloquea ni niega horas. El id del modelo de visión de Groq puede cambiar.
- **Investigación** es un subsistema aparte (`investigacion_aportantes`/`investigacion_aportes`): un pasante de Vinculación no es aportante; el avance de metas se calcula, nunca se captura.

### Fotos y contenido público
- Banco único = tabla `fotos` (`ubicaciones`, `proyectos`, `menores`, `calidad`, `descartada`, `propuestas`). **Menores solo por revisión humana** (sin IA); CHECK `fotos_publicable_sin_menores`. Topes suaves por ubicación (`fotos_ubicaciones`); portada = solo administración del sitio; las galerías de proyecto rotan.
- Texto visible del sitio público: siempre por `lib/i18n.tsx` (ES/EN). En herramientas internas (`/admin`, `/portal`, `/vinculacion`, `/gestion-carrera`, `/contribuciones`) va en español.
- Contribuciones por enlace/QR: solo las genera un docente; todo envío externo nace `aprobada=false`; el tipo lo fija el enlace.

### Proyectos del grupo — nombres oficiales

Usados tal cual en el dropdown "Proyecto" del wizard de Contribuciones (`app/contribuciones/new/[type]/page.tsx` → `PROYECTOS`) y en los registros de Neon. Confirmados por el usuario; las etiquetas cortas de `lib/data.ts` son solo para UI del Portal:

| Líder | Etiqueta corta (`liderProyectoPropio`/UI) | Nombre oficial completo (PAT / BD) |
|---|---|---|
| Arturo Rodríguez / Jhonny Villafuerte | Innovaciones Pedagógicas e Internacionalización | "Lograr la innovación pedagógica e internacionalización del proceso de formación inicial y continua de docentes para el desarrollo humano y sostenible." |
| German Carrera | Desarrollo de Habilidades Lingüísticas | "Desarrollo de las habilidades lingüísticas del idioma inglés en estudiantes de educación superior en Ecuador." |
| Cynthia Zambrano | Dinámicas Lingüísticas en Contextos Locales | Dinámicas Lingüísticas en Contextos Locales (título de `/vinculacion/dinamicas-linguisticas`) |
| Verónica Chávez | Mentoring | "Desarrollo Humano y perfil profesional en la formación de docentes: Mentoría y Aprendizaje Socioemocional" — `/investigacion/mentoring` |

`CategoriaDocente` (escalafón ULEAM, incluye `AGREGADO_III`) debe mantenerse sincronizado en Neon (`ALTER TYPE … ADD VALUE`, nunca `db push`), `prisma/schema.prisma`, `app/api/contribuciones/route.ts` (zod) y `CATEGORIAS_DOCENTE` del wizard. `tipoArticulo` es un campo libre e independiente de `tipoPublicacion`.

### Verificación
- En este checkout `npx tsc`/`npx next` pueden ser binarios placeholder: usar `node node_modules/typescript/bin/tsc --noEmit` y `node node_modules/next/dist/bin/next build`.
- Antes de editar un archivo compartido: `git diff origin/main -- <archivo>` (hubo auto-commits que revirtieron trabajo ajeno). Nunca trabajar en `main` directamente.

---

## Estructura de Archivos

> **Actualizado Sesión 33** — el árbol de abajo estaba congelado desde ~Sesión 24/25 (no reflejaba `/utilidades`, `/superadmin`, `/investigacion/informes`, Fotos/Proyectos de Sesión 32, ni la mayoría de `lib/`). Es una vista representativa, no exhaustiva — `scripts/` sola tiene ~50 archivos, `app/api/` tiene más de 25 subcarpetas; para el detalle completo usar `Glob`/`ls` en vez de confiar en este árbol al pie de la letra.

```
carreraPINE/                       ← RAÍZ = Next.js app
├── CLAUDE.md                      # Este archivo (instrucciones para Claude)
├── ANTIGRAVITY.md                 # Instrucciones equivalentes para Antigravity
├── MANUAL_USUARIO.md              # Manual del Portal PINE, por rol
├── README.md / CHANGELOG.md       # README resume módulos/stack actual, CHANGELOG resume hitos por versión
├── requeirmientos.md              # Documento de requerimientos del proyecto
├── implementation_plan_es.md      # Plan de implementación (Contribuciones Académicas, Sesión 24)
├── package.json
├── middleware.ts                  # Ver lista completa de protectedRoutes en ## Autenticación Admin — bastante más que /admin/*
├── .env.local.example
├── PLANTILLA_USAR/                # Bandeja de entrada de plantillas .docx pendientes de procesar/subir (material humano, no código)
├── templates/                      # TODAS las plantillas .docx que el código lee en runtime (Sesión 58) — nombres kebab-case descriptivos, prefijo por módulo (`informe-vinculacion-*`, `informe-investigacion-*`, `utilidades-*`). Antes vivían repartidas en `app/utilidades/_templates/` y `app/vinculacion/informes/_templates/` (ambas carpetas ya no existen)
│
├── app/
│   ├── page.tsx, layout.tsx       # Landing pública (incluye PhotoCarousel ubicacion="portada", Sesión 32)
│   ├── admin/                     # Panel CRUD sitio estático (gateado por modulos_acceso:contenido_sitio — solo Arturo+Jhonny)
│   │   ├── dashboard/, members/, videos/, categories/, publications/, documents/, settings/
│   │   ├── photos/                # Banco de Fotos (Sesión 32)
│   │   └── proyectos/             # Config de proyectos/nav — ocultar/reordenar/crear (Sesión 32)
│   ├── proyectos/[slug]/          # Página pública data-driven para proyectos tipo 'plantilla_simple' (Sesión 32)
│   ├── portal/{login,dashboard,perfil,subir-video}/  # Entrada única del Portal PINE
│   ├── registro/                  # Autoregistro — solo profesor (whitelist), único rol público desde Sesión 22
│   ├── vinculacion/                # Gestión (profesor) vs Registro (estudiante+profesor) — ver ## Portal PINE
│   │   ├── espacios/               # Gestión: crear/listar espacios; [id] = asignar instructores (única función que queda ahí)
│   │   ├── pasantes/               # Gestión: vista agregada de estudiantes-instructores, solo profesor/admin
│   │   ├── asistencia/, registrar-evaluar/, evaluacion-final/, encuesta/, difusion/  # Registro: páginas planas, selector de espacio propio (difusion no tiene selector). registrar-evaluar = registro+Pre-Test obligatorio; evaluacion-final = Post-Test+Encuesta obligatorios; encuesta = solo reenvío suelto (Sesión 43)
│   │   ├── publico/[token]/        # Pretest/postest públicos sin login vía enlace/QR (Sesión 28)
│   │   └── dinamicas-linguisticas/ # Página PÚBLICA de contenido (no confundir con nada de arriba)
│   ├── investigacion/
│   │   ├── espacios/              # Crear/listar espacios de investigación — SÍ tiene link activo desde /portal/dashboard (corregido en Sesión 33, antes decía "sin enlazar")
│   │   ├── informes/              # Generador de Informes Mensuales (Sesión 33 lo documenta por primera vez, el módulo ya existía)
│   │   └── proyecto-innovacion/, desarrollo-habilidades/, mentoring/  # Páginas públicas de proyecto
│   ├── docencia/docencia-innovadora/, redlea/, publicaciones/, boletines/  # Páginas públicas adicionales
│   ├── gestion-carrera/           # Registro de eventos, cualquier docente
│   ├── contribuciones/            # Contribuciones académicas (Sesión 24, campos por tipo completados sin sesión documentada) — listado (solo admin) + wizard (docentes)
│   │   ├── page.tsx                # Listado, protegido por middleware (modulos_acceso:admin)
│   │   └── new/{page.tsx,[type]/page.tsx}  # Paso 1 (elegir tipo) + Paso 2 (formulario)
│   ├── utilidades/                # Acta Técnica, Oficios, Convocatorias, PAT-Maestría, Pares Lectores, Certificados — cada API route se autoprotege con requireDocenteApi() (ver ### Módulo /utilidades)
│   ├── superadmin/                # Explorador de tablas + SQL runner sobre toda la Neon — documentado recién en Sesión 33 (ver ### Módulo Superadmin)
│   ├── pine-dashboard/            # KPIs, solo modulos_acceso:admin
│   ├── docencia/ (raíz), login/, admin/login/  # Redirects de compatibilidad, sin links internos activos
│   └── api/                       # Más de 25 grupos de rutas — auth, espacios, beneficiarios, estudiantes, tests, encuestas, difusion,
│                                   # upload, photos, proyectos, members, publications, videos, video-categories,
│                                   # actividades-difusion, enlaces, docentes, perfil, contribuciones, youtube, superadmin, admin/stats,
│                                   # ... (protected/assets se eliminó en Sesión 44) — ver ## Portal PINE para el detalle de auth de cada grupo
│
├── components/                    # ~40 componentes del sitio público — ver components/admin/ (DataTable) y components/redlea/ (5 componentes propios)
│
├── lib/
│   ├── data.ts                    # Config de autorización (profesoresAutorizados/profesorModulos/liderProyectoPropio) + fotos Club de Inglés + footerContexts
│   ├── db.ts                      # In-memory CRUD de siteSettings + getNewsletters() (sí lee de Neon)
│   ├── i18n.tsx                   # Diccionario ES/EN completo del sitio público (~1000 líneas) — faltaba en este árbol pese a ser importado en decenas de componentes
│   ├── session.ts                 # Auth unificada del Portal (Neon) — pine_app_session
│   ├── permisos-espacio.ts        # puedeOperarEspacio() — permisos por espacio
│   ├── prisma.ts                  # Cliente Prisma (singleton) — solo lo usa el módulo Contribuciones
│   ├── questions.ts                # Banco de preguntas del Test MCER
│   ├── certificateDocx.ts          # Generación de certificados .docx
│   ├── superadmin-auth.ts, superadmin-db.ts  # Doble candado + capa de datos del módulo Superadmin
│   ├── youtube.ts                 # OAuth2Client de Google para subida a YouTube
│   ├── gradosCatalogo.ts, perfilSync.ts, periodoAcademico.ts, registrarVideoPropuesto.ts  # Utilidades puntuales, cada una con un solo consumidor
│   # lib/neon.ts se borró en Sesión 33 (0 imports en todo el repo, era el esquema UUID viejo)
│
├── prisma/schema.prisma           # Solo modela Contribution/ContributionAuthor — NO ejecutar db push/migrate (ver ## Stack Técnico)
│
├── scripts/                       # ~50 archivos, casi todos migrate-*.js/seed-*.js/fix-*.js (una sola ejecución, node --env-file=.env.local)
│   ├── migrate.js                 # Schema original (desactualizado vs realidad, ver ## Portal PINE)
│   ├── migrate-fotos.js, migrate-proyectos-extend.js  # Banco de Fotos + config de proyectos/nav (Sesión 32)
│   ├── migrate-superadmin.js      # Tabla superadmin_audit_log
│   ├── _lib-sign-session.mjs      # Helper: firma una cookie de sesión para probar flujos HTTP reales sin password
│   └── test-db.js, test-periodo-via-api.mjs  # Scripts de diagnóstico/test, no migraciones
│
├── types/index.ts                 # Interfaces TypeScript del sitio estático (AdminUser se borró en Sesión 33, 0 usos)
│
├── public/
│   ├── images/, files/            # Públicos
│   └── admin-assets/              # Privados, requiere sesión admin
│
└── docs/                          # Documentos Word/PDF de referencia humana (informes, actas) — no referenciados por código, es normal
```

---

## Equipo actual (tabla `members` en Neon)

Desde la Sesión 26, `members.projects` (`text[]`, migrado directo en Neon vía MCP — ver `scripts/migrate-members-projects.js` como referencia del mismo cambio) filtra en qué página de proyecto aparece cada quien — antes `TeamSection` mostraba a todos los miembros en todas las páginas de proyecto sin distinción, lo que hacía aparecer a German y Cynthia (líderes de proyecto propio) también en el equipo de Internacionalización. `GET /api/members?project=X` filtra por este campo; `TeamSection` acepta la prop `project` y cada página de proyecto la pasa (ver `## Estructura de Archivos`). Valores válidos: `internacionalizacion` | `vinculacion` | `desarrollo_habilidades` | `mentoring`, más cualquier proyecto nuevo creado desde `/admin/proyectos` (Sesión 32) — el panel `/admin/members` ya no tiene esta lista hardcodeada, la trae de `GET /api/proyectos?all=true`. El panel `/admin/members` tiene checkboxes para editar `projects` de cada miembro.

| ID | Nombre | Rol | Proyectos | Orden |
|----|--------|-----|-----------|-------|
| member_1 | Dr. Arturo Rodríguez | Líder de Internacionalización y Miembro de Vinculación | internacionalizacion | 1 |
| member_2 | Dr. Jhonny Villafuerte | Colíder del Proyecto | internacionalizacion | 2 |
| member_3 | Mg. Cristina Basantes | Miembro de Investigación y Colaboradora de Internacionalización (Podcast) | desarrollo_habilidades, internacionalizacion | 3 |
| member_4 | Psi. Johana Bello, Mg. | Colaboradora en Investigación y Directora de Psicología Educativa | internacionalizacion | 4 |
| member_5 | Andy Castillo | Estudiante Investigador | internacionalizacion | 5 |
| member_6 | Josselyn Mera Rivas | Estudiante Investigadora / Equipo de Podcast | internacionalizacion | 6 |
| member_8 | Ailys Jordana Bailón Borja | Estudiante Investigadora / Equipo de Podcast | internacionalizacion | 7 |
| member_7 | Doménica Valeska Vélez Bravo | Equipo de Podcast | internacionalizacion | 8 |
| member_9 | Diana Noemi Cedeño Sánchez | Estudiante Investigadora / Equipo de Podcast | internacionalizacion | 9 |
| member_10 | Dr. German Carrera Moreno, PhD. | Líder de Proyecto (Desarrollo de Habilidades Lingüísticas) — ver `/investigacion/desarrollo-habilidades` | desarrollo_habilidades | 10 |
| member_11 | Mg. Cynthia Zambrano Zambrano | Líder de Proyecto (Vinculación) — ver `/vinculacion/dinamicas-linguisticas` | vinculacion | 11 |
| member_12 | Mg. Verónica Chávez | Responsable de Comisión Académica y Líder de Proyecto (Mentoring) — ver `/investigacion/mentoring`. Sin foto todavía (placeholder). | mentoring, docencia_innovadora (Sesión 35) | 12 |
| member_13 | Laura Mena Sánchez | Miembro de Investigación | internacionalizacion, vinculacion (Sesión 35) | 13 |
| member_14 | Ulbio Farfán Corrales | Miembro de Docencia Innovadora e Interdisciplinaria (Sesión 35) — email real confirmado contra `usuarios` (Sesión 27), no adivinado | docencia_innovadora | 14 |
| member_15 | Gabriel Bazurto Alcívar | Miembro de Docencia Innovadora e Interdisciplinaria (Sesión 35) | docencia_innovadora | 15 |
| member_16 | Jorge Corral Joniaux | Miembro de Docencia Innovadora e Interdisciplinaria (Sesión 35) | docencia_innovadora | 16 |
| member_17 | Betty Marisol Yánez García | Miembro de Docencia Innovadora e Interdisciplinaria (Sesión 37) — `usuarios.id=29`, email confirmado por el usuario, apellidos "Yánez García" (no adivinados) | docencia_innovadora | 17 |

⚠️ **`member_13` (Laura Mena) ya existía en Neon sin estar documentada aquí** — encontrada recién en Sesión 35 al auditar la tabla real antes de agregar gente nueva. Mismo patrón que la tabla `proyectos` (Sesión 32): alguien (probablemente Antigravity) la agregó fuera de una sesión documentada. Regla reafirmada: **antes de insertar en `members`, consultar primero el estado real de Neon** — esta tabla de referencia puede estar desincronizada.

Cristina Basantes es el único caso con dos proyectos — confirmado explícitamente por el usuario: colídera de Desarrollo de Habilidades Lingüísticas (con German) y además colaboradora de Internacionalización (coordina el Podcast ahí). No es un ajuste automático ni aplica al resto del equipo. Verónica (mentoring+docencia_innovadora) y Laura (internacionalizacion+vinculacion) son los otros 2 casos con más de un proyecto, agregados en Sesión 35.

⚠️ **Distinto del `member_12` fabricado anteriormente:** en Sesión 19 existió un `member_12` ("Mg. Veronika Vera", líder de un supuesto proyecto "Mentoría Lingüística") que resultó ser una identidad **fabricada por Antigravity** (email inventado, sin confirmar con el usuario) — se eliminó junto con su página pública (`/investigacion/mentoria-linguistica`) y su link en el Header. El `member_12` actual (Verónica Chávez) es una persona real, ya confirmada desde antes en `profesoresAutorizados`/`profesorModulos`/`liderProyectoPropio` (`lib/data.ts`) — no confundir ambos casos. Regla de oro sigue vigente: **nunca inventar/adivinar un email o una persona**, confirmar siempre con el usuario antes de agregar a `members`, `profesoresAutorizados` o `profesorModulos`.

---

## Publicaciones actuales (`/lib/data.ts` → `publications`)

| ID | Título (abrev.) | Tipo | Categoría | Fecha |
|----|----------------|------|-----------|-------|
| pub_64 | Podcast: An educational innovation in foreign Languages instruction (libro) | book | libros | 2026-01 |
| pub_3 | Innovaciones Educativas (libro) | book | libros | 2026-04 |
| pub_62 | Total Physical Response… | article | impacto | 2026-04 |
| pub_60 | Microenseñanza con tecnologías… | article | regional | 2026-03 |
| pub_58 | Comparación nivel de lectura… | article | impacto | 2026-03 |
| pub_61 | Identifying Main Causes… | article | regional | 2026-06 |
| pub_63 | Transition from Regular English Instruction to Bilingual Education… | article | regional | 2025-01 |
| pub_64 | Podcast: An educational innovation in foreign Languages instruction (libro) | book | libros | 2026-01 |
| pub_65 | Use of Podcasts for Leadership and Emotional Intelligence Development… | article | regional | 2026-01 |
| pub_66 | Comunicación asertiva y gamificación: docentes y síndrome de Down | article | impacto | 2025-07 |
| pub_67 | Inclusive Education and the Use of Assistive Technologies… | article | regional | 2025-05 |
| pub_68 | Educational technology and teachers: effective teaching time… | article | regional | 2025-01 |
| pub_69 | Implementing Project-Based Learning in English Classes | article | regional | 2025-09 |
| pub_70 | Podcasting to sensitize gender equity in English language student teachers | article | regional | 2025-01 |
| pub_71 | El tamaño de lo que sentimos (libro ilustrado) | book | libros | 2026-06 |

**Categorías de publicaciones:** `regional` | `libros` | `impacto`
**Índices:** ErihPlus → impacto | Latindex/Dialnet → regional

---

## Base de Datos Estática (sitio público — distinta del Portal PINE/Neon)

> La fuente de verdad es `/lib/data.ts`. El admin panel legacy NO es persistente (usa db.ts en memoria). Para la base de datos real del Portal PINE (Neon Postgres), ver `## Portal PINE` arriba.

### Entidades disponibles

| Entidad | Notas |
|---------|-------|
| `members` | Equipo del proyecto |
| `publications` | Artículos, libros, conferencias |
| `videos` | Podcasts (Educa PINE + Voces Fuera del Aula) |
| `video_categories` | Categorías de videos |
| `news` | Noticias del proyecto |
| `activities` | Actividades/eventos |
| `site_settings` | URLs sociales, email de contacto |
| `adminUsers` | Usuarios del panel admin |

---

## Gestión de Archivos — Regla de Ubicación

> **CRÍTICO:** Antes de colocar cualquier archivo, determinar si debe ser público o privado.

| Carpeta | Acceso | Usar para |
|---------|--------|-----------|
| `public/images/` | **Público** (cualquier URL) | Fotos de miembros, logos, imágenes de noticias/actividades |
| `public/files/` | **Público** (cualquier URL) | PDFs de **publicaciones científicas** descargables desde la landing |
| `public/admin-assets/` | **Privado** (requiere sesión admin) | PDFs confidenciales: presupuestos, informes internos, documentos de actividades del proyecto |

### Reglas de oro
- **Nunca** poner documentos internos del proyecto (presupuestos, actas, informes de actividades) en `public/files/` ni en `public/images/` — quedan expuestos a internet.
- Solo van a `public/files/` los PDFs que el equipo quiere que el público general descargue (artículos científicos, libro del proyecto).
- Para agregar a la sección admin Documentos: copiar a `public/admin-assets/` y agregar entrada en `app/admin/documents/page.tsx`.
- Las noticias y actividades **no** llevan link de descarga pública — sus documentos van a `public/admin-assets/`.

### Estándar de nombres de archivo (Sesión 26, 2026-09-02)

**Todo archivo nuevo** en `public/images/`, `public/files/` o `public/admin-assets/` — subido por Claude o por Antigravity — debe nombrarse:

```
YYYY-MM-DD_DescripcionCorta[-signed].ext
```

- `YYYY-MM-DD`: fecha del **documento/evento** (no la fecha en que se sube). Si el archivo tiene varias fechas (ej. rango de una capacitación), usar la fecha de cierre/emisión del certificado.
- `DescripcionCorta`: PascalCase o palabras unidas por guiones, **sin espacios, tildes, ñ, mayúsculas sostenidas ni caracteres especiales** (nada de `Informe_sOCIALZACIÓN_dISNEY.pdf`).
- Sufijo `-signed` solo si el PDF está firmado digitalmente.
- Extensión en minúsculas (`.pdf`, `.jpeg`, `.png`).
- Ejemplo real: `2026-08-13_CertificadosCapacitacionAsierRomero-FET-signed.pdf`, `2026-08-13_Capacitacion-AsierRomero-Auditorio.jpeg`.

**Skill `plugin:estandar-archivos` disponible en este repo** (`.claude/skills/estandar-archivos/SKILL.md`) — Claude Code debe invocarlo antes de mover/copiar cualquier archivo nuevo a `public/`. Antigravity no tiene el mecanismo de skills de Claude Code: debe seguir esta misma regla leyéndola aquí directamente.

⚠️ **Archivos ya existentes (previos a Sesión 26) NO siguen este estándar** (`2026_FICHA_PRESUPUESTARIA.pdf`, `Informe_sOCIALZACIÓN_dISNEY-signed.pdf`, `Informe-Ejetutivo-DRP.pdf`, etc.) — no renombrarlos sin querer: varios están referenciados por nombre exacto en `app/admin/documents/page.tsx` y algunos PDFs de `public/files/` podrían estar linkeados desde `publications.pdf_file` en Neon. Renombrarlos requiere actualizar esas referencias en el mismo cambio — es una limpieza aparte, pendiente, no bloqueante.

---

## Flujos de Trabajo Recurrentes

### Agregar publicación con enlace únicamente
1. Abrir `lib/data.ts`
2. Agregar entrada en el array `publications` con:
   - `id`: `pub_XX` (número correlativo)
   - `type`: `'article'` | `'conference'` | `'book'` | `'other'`
   - `category`: `'impacto'` (ErihPlus, Scopus, WoS) | `'regional'` (Latindex, Dialnet) | `'libros'`
   - `doi_link`: URL del artículo o DOI
   - Omitir `pdf_file` si no hay PDF
3. Verificar TypeScript: `npx tsc --noEmit`

### Agregar publicación descargable (PDF)
1. Colocar el PDF en `public/files/` (nombre sin espacios, ej. `Nombre-Articulo.pdf`)
2. Agregar entrada en `publications` con `pdf_file: '/files/Nombre-Articulo.pdf'`
3. El componente `PublicationsSection.tsx` renderiza automáticamente el botón **PDF**

### Actualizar o agregar miembro del equipo
1. Colocar la foto en `public/images/` (puede partir de la raíz del proyecto — moverla aquí)
2. Agregar/editar entrada en el array `members` de `lib/data.ts`
3. Campos: `name`, `role`, `orcid` (opcional), `email`, `photo: '/images/archivo.jpg'`, `order`
4. Para diferenciar estudiantes usar `role: 'Estudiante Investigador'`

### Leer documentos Word para actualizar contenido
- Los `.docx` de referencia están en `docs/`
- Para extraer texto usar el skill `plugin:anthropic-skills:docx`
- Contenido a completar:
  - `docs/Proyecto_Innovaciones_Pedagógicas 2025.docx` → sección "Sobre el Proyecto" en landing
  - `docs/contenidoYoube.docx` → videos adicionales
  - `docs/contactos.docx` → site_settings (email, redes sociales)
  - `docs/publicaciones.docx` → publicaciones adicionales

### Reorganizar/limpiar estructura
- Imágenes: siempre en `public/images/` (nunca en raíz)
- PDFs descargables: `public/files/`
- Documentos de referencia: `docs/`
- No crear carpetas adicionales sin necesidad

---

## Autenticación Admin (panel legacy)

> ⚠️ **Obsoleto:** ya NO hay password fijo `Pine2026` ni lista de emails hardcodeada en middleware. El panel `/admin` se accede vía `/portal/login` con la cuenta de cada quien, y requiere `modulos_acceso` incluya **`contenido_sitio`** — **no** `admin` (son módulos distintos, ver `## Portal PINE`). `contenido_sitio` está restringido, por decisión explícita del usuario, solo a `arturo.rodriguez@uleam.edu.ec` y `jhonny.villafuerte@uleam.edu.ec` (líder/colíder de este proyecto específico) — German y Verónica tienen `admin` (ven `/pine-dashboard`) pero no `contenido_sitio`.
> **Actualizado Sesión 33:** `lib/data.ts:adminUsers` y `lib/db.ts:authenticateAdmin`/`isAdminAuthorized` (el sistema admin legacy con password `Pine2026`) **ya no existen en el código** — fueron eliminados en alguna sesión posterior sin dejarlo anotado aquí. Esta nota quedaba diciendo "código muerto, no borrado" cuando en realidad ya se había borrado; corregido para que nadie pierda tiempo buscando algo que no está.
- **Middleware — lista completa de `protectedRoutes` (`middleware.ts`), no solo un resumen:** `/portal/dashboard`, `/portal/perfil`, `/portal/subir-video`, `/vinculacion/dinamicas-linguisticas/asistencia`, `/vinculacion/espacios`, `/vinculacion/asistencia`, `/vinculacion/beneficiarios`, `/vinculacion/pasantes`, `/vinculacion/difusion`, `/vinculacion/test-mcer`, `/vinculacion/encuesta`, `/investigacion/espacios`, `/investigacion/informes`, `/gestion-carrera`, `/pine-dashboard`, `/contribuciones`, `/utilidades`, `/superadmin` — más `/admin/*` (excepto `/admin/login`) protegido aparte por `contenido_sitio`. La versión anterior de esta nota solo mencionaba 6 rutas. ⚠️ **Desactualizada desde entonces** (no incluye, por ejemplo, `/vinculacion/registrar-evaluar`, `/vinculacion/evaluacion-final`, `/vinculacion/supervisar`, `/vinculacion/topes-horas`, `/vinculacion/investigacion-actividades`, `/vinculacion/actividades-autonomas`, `/portal/mi-avance`, `/portal/proyecto`) — usar `middleware.ts` como fuente real, no esta lista. Añadidas en Sesión 53: `/portal/proyecto` (Sesión 52) y `/portal/aprobaciones` (cualquier docente, cola de "profesor responsable").
- **`modulos_acceso` tiene 6 valores reales, no 4:** además de `admin`/`contenido_sitio`/`investigacion`/`vinculacion` (los únicos documentados hasta Sesión 33), el código también chequea `subir_video` (`middleware.ts` — habilita a un `estudiante` sin más permisos a subir video/evidencia vía `/portal/subir-video` o `/vinculacion/difusion`) y `superadmin` (ver `### Módulo Superadmin`, doble candado con email hardcodeado). Ambos son reales y ya estaban en producción, solo faltaba anotarlos.
- `/investigacion/espacios` **sí tiene un link activo** desde `app/portal/dashboard/page.tsx` (tarjeta "Gestionar Investigación" → "» Administrar Espacios") — la nota de Sesión 19 que decía "se quitó el link... la página sigue en el código, sin enlazar" quedó obsoleta, el link se repuso en algún momento sin documentarlo.

---

## Comandos Útiles

```bash
# Desarrollo (desde la raíz del proyecto)
npm run dev           # http://localhost:3000

# Build y verificación
npm run build
npx tsc --noEmit      # Solo verificar TypeScript

# Git
git status
git add <archivos>
git commit -m "feat: descripción"
git push
```

---

## Instrucciones para el Asistente IA

1. **Lee este archivo primero** para entender el contexto completo
2. **App Router de Next.js 14** — no usar `pages/`
3. **`tsconfig.json` tiene `strict: true`**, pero `any` explícito se usa libremente en el código del Portal (fetch de APIs, formularios) — no es un objetivo real del proyecto, no lo trates como regla a cumplir
4. **TailwindCSS** — no añadir CSS inline salvo excepciones
5. **Colores ULEAM:** clases definidas en `tailwind.config.ts`
6. **No tocar `middleware.ts`** sin entender la lógica de auth — ahora protege bastante más que `/admin/*` (ver `## Portal PINE`)
7. **Dos fuentes de verdad distintas:** `lib/data.ts` (sitio público estático) vs Neon Postgres (Portal PINE, operativo) — no confundirlas
8. **Antes de tocar el esquema de Neon:** correr una consulta de auditoría (`information_schema.tables`/`columns`) primero — hay historial de cambios hechos fuera de git que desincronizan `scripts/migrate.js` de la realidad
8b. **`neon()` nunca a nivel de módulo** — siempre dentro de la función/handler que lo usa (ver `### Follow-up en el mismo PR: neon() a nivel de módulo...`, Sesión 37). Un `neon()` fuera de una función se ejecuta apenas Next importa ese archivo, incluido durante el build (`next build`/Vercel) — si `DATABASE_URL` no está disponible o es inválido en ese momento, tumba el build entero, no solo la ruta que lo usa. Si un cliente `sql` necesita reusarse desde varios archivos, exportarlo detrás de un getter/Proxy perezoso (ver `app/utilidades/_lib/db.ts`), no como `export const sql = neon(...)` directo.
9. **Actualizar este CLAUDE.md** cuando cambien el equipo, publicaciones, estructura, o el esquema/flujo del Portal PINE
10. **Trabajo en paralelo con Antigravity:** revisar `git log origin/main..HEAD` y `git fetch` antes de asumir que el repo está como lo dejaste — Antigravity pushea directo a `main` sin avisar
11. **Antes de editar el sitio público (páginas de proyecto, footer, equipo, textos):** leer `.claude/skills/carrerapine-workflow/SKILL.md` (Sesión 26) — codifica el flujo completo: contenido contextual por proyecto en vez de genérico, i18n obligatorio en `lib/i18n.tsx` (nunca texto español hardcodeado en componentes del sitio público), reglas para tocar Neon, sincronizar ambas ramas git, y verificar el deployment en Vercel antes de reportar algo como terminado. Después de un cambio de contenido, considerar invocar el agente `.claude/agents/content-consistency-reviewer.md` para verificar que no quedó texto sin traducir o contenido genérico donde debía ser contextual.
12. **Toda función nueva del portal que deje algo pendiente para alguien (aprobar, revisar, completar, responder) debe agregar su regla de notificación** en `lib/notificaciones.ts` (`REGLAS_NOTIFICACION`) y su fila en `NOTIFICACIONES.md`. Léelo antes de crear pantallas, formularios con aprobación o colas de moderación. La condición `aplica()` debe ser la misma que protege la pantalla destino.
13. **Todo dato administrable por proyecto** (fotos, textos, equipo, noticias) debe autorizarse con `lib/permisosProyecto.ts` (`puedeGestionarProyecto`, consulta `proyecto_miembros` en Neon en cada petición), nunca con emails hardcodeados ni solo con la cookie. Un líder/colíder administra **solo su proyecto**; la portada y lo global son de administración del sitio. Ver `docs/PLAN_IMPLEMENTACION_ANTIGRAVITY_ADMIN_POR_LIDERES.md`.

### Convenciones de código
- Componentes: PascalCase (`TeamSection.tsx`)
- Funciones/variables: camelCase
- Constantes: UPPER_SNAKE_CASE
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`)

---

**Última actualización:** 2026-10-11 (auditoría de prompts: historial de sesiones movido a `docs/HISTORIAL_SESIONES.md`, hechos obsoletos corregidos y reglas vigentes consolidadas)
**Versión:** 0.12.16
**Estado:** Sitio público funcional ✅ — Portal PINE (Neon) construido y desplegado ✅ — i18n ES/EN completo en todo el sitio público ✅ — Admin de contenido con ocultar-sin-borrar + buscador/paginación en las 5 tablas ✅ — Banco de Fotos administrable ✅ — Nav de proyectos/redes controlable desde admin (ocultar/reordenar todos, crear nuevos "plantilla_simple" sin código) ✅ — Superadmin, Informes Mensuales de Investigación y Contribuciones (90%) documentados por primera vez ✅ — Acceso temporal para externos sin cuenta (eventos/podcast, siempre pendiente de aprobación) ✅ — Área/proyecto + participantes + horas acreditables en podcasts de Vinculación (Sesión 38) ✅ — Archivos sin uso limpiados (Sesión 33) ✅ — Repo sincronizado con origin ✅
