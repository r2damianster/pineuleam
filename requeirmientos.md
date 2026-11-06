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
**Versión actual:** 0.10.3
**Última sesión:** 2026-09-01 (Sesión 22 — fix de /registro roto por el cambio de esquema de beneficiarios + manual de usuario reescrito. Ver detalle abajo)
**Ruta pública del proyecto:** `/investigacion/proyecto-innovacion` (antes `/pine`)
**Manual de usuario:** `MANUAL_USUARIO.md` (rutas del Portal PINE — login, espacios, dashboard)

---

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Estilos | TailwindCSS personalizado (colores ULEAM) |
| Sitio público (contenido) | Estático en `/lib/data.ts` (in-memory vía `/lib/db.ts`) — miembros, publicaciones, videos, noticias, actividades |
| **Portal PINE** (docencia/vinculación/investigación) | **Neon Postgres** — ver `## Portal PINE` abajo |
| Auth | Cookie httpOnly firmada (HMAC, Web Crypto) — `lib/session.ts`, unificada para todo (admin legacy + Portal) |
| Uploads (fotos/evidencias) | Cloudinary (`app/api/upload`) |
| Deploy | Vercel — Next.js en raíz del repo, auto-deploy on push a `main` |

**Dependencias clave (`package.json`):** `@neondatabase/serverless`, `bcryptjs` (hash de passwords del Portal), `cloudinary`, `docx`+`jszip` (generación de certificados y test MCER descargable).

### Colores ULEAM
- Azul institucional: `#003366`
- Dorado: `#FFD700`

---

## Portal PINE (Neon Postgres) — Sistema Operativo

> **Distinto del sitio público estático.** El sitio público (landing, `/investigacion/proyecto-innovacion`, etc.) sigue siendo 100% `lib/data.ts`. El "Portal PINE" es un sistema aparte con base de datos real (Neon), para las funciones operativas: registrar clubes/aulas, tomar asistencia, evaluar MCER, encuestas, difusión de eventos.

### Auth unificada
- **Una sola cookie httpOnly firmada** (`pine_app_session`, HMAC-SHA256 vía Web Crypto) para *todo* — Portal Y panel `/admin` legacy. Implementada en `lib/session.ts` (`createSessionCookieValue`/`verifySessionCookieValue`/`getAppSessionFromCookies`). Requiere `SESSION_SECRET` en las env vars — **sin fallback hardcodeado** (existió brevemente, se removió por seguridad).
- **NO existen ya**: `lib/adminSession.ts`, `lib/userSession.ts`, el panel `/admin` con password `Pine2026` hardcodeado, ni el módulo viejo `/vinculacion/dinamicas-linguisticas/asistencia` (UUID). Todo fue consolidado/retirado en Sesión 19 — si encuentras referencias a esto en código o docs viejos, están obsoletas.
- **Login:** `/portal/login` → `POST /api/auth/portal-login`. **Registro:** `/registro` → `POST /api/auth/register` (autologuea). Desde Sesión 22, `PUBLIC_ROLES = ['profesor']` — es el único rol que se autoregistra; `estudiante` y `beneficiario` fueron retirados del todo del selector (antes `beneficiario` seguía ahí como opción viva y rompía porque insertaba en una columna ya eliminada, ver changelog Sesión 22).
- **Roles** (`usuarios.rol`): `admin` | `profesor` | `estudiante` | `beneficiario`. Autoregistro público solo permite `profesor`/`estudiante`/`beneficiario` — `admin` nunca es autoasignable.
- **`profesor` es de lista fija**, no autoregistro abierto: `lib/data.ts` → `profesoresAutorizados` (array de emails permitidos) + `profesorModulos` (qué `modulos_acceso` recibe cada uno al registrarse). Agregar gente nueva ahí, con su email real confirmado — **nunca adivinar el email**.
- **`modulos_acceso`** (`text[]` en `usuarios`, valores: `admin`/`investigacion`/`vinculacion`/`contenido_sitio`): controla qué ve cada quien en `/portal/dashboard` y qué rutas puede pisar (`middleware.ts`). Una persona puede tener varios. `admin` controla solo `/pine-dashboard` (indicadores). `contenido_sitio` es un módulo **distinto**, restringido solo a `arturo.rodriguez` y `jhonny.villafuerte` (líder/colíder de este proyecto) — controla `/admin/*` (las 10 secciones CRUD del contenido estático) y `/api/protected/assets` (PDFs confidenciales). German y Verónica tienen `admin` pero NO `contenido_sitio` — ven el dashboard de indicadores pero no el panel de contenido.
- **Permisos por espacio** (no globales): `lib/permisos-espacio.ts` → `puedeOperarEspacio(usuario, espacio_id)`. Un `profesor` con módulo `vinculacion` opera cualquier espacio; un `estudiante` **solo** los espacios donde está en `espacio_instructores` (asignado por el profesor). Se usa en `/api/espacios/asignar`, `/api/tests` (MCER), `/api/encuestas`, `/api/espacios/asistencia`.

### Flujo real de Vinculación (confirmado con el usuario, Sesión 19)
Dos conceptos separados, **no anidados uno dentro del otro**:
- **"Espacio" = Gestión, solo profesor** (hoy: Arturo, Cynthia). `/vinculacion/espacios` crea/lista espacios (ej. "Club de Inglés A"); `/vinculacion/espacios/[id]` asigna estudiantes como instructores de ese espacio (única función que queda ahí).
- **"Registro" = tarea diaria, estudiante-instructor o profesor de respaldo.** Cuatro páginas propias, cada una con su propio selector de espacio (un estudiante puede tener varios asignados): `/vinculacion/asistencia`, `/vinculacion/beneficiarios` (asignar existente + registrar uno nuevo), `/vinculacion/test-mcer`, `/vinculacion/encuesta`. Todas reusan las mismas APIs (`/api/espacios/asignar`, `/api/tests`, `/api/encuestas`, `/api/espacios/asistencia`) — el cambio fue solo de UI (páginas planas en vez de tabs dentro del espacio), la lógica de permisos (`puedeOperarEspacio`) no cambió.
- **Beneficiario nunca tiene cuenta.** `POST /api/beneficiarios` los crea sin password real (email/password_hash autogenerados, inutilizables — `usuarios.email`/`password_hash` son `NOT NULL`+`UNIQUE` en Neon) y los asigna al espacio en el mismo paso. Esto reemplazó el plan original de usar `/registro?rol=beneficiario` (que sí les daba cuenta/password) — descartado a propósito, y desde Sesión 22 esa opción ya no existe ni en el código.

### Pasantes (estudiantes-instructores) — alta por el profesor, activación en el primer login
`/vinculacion/pasantes` (solo profesor/admin con módulo `vinculacion`) es un **CRUD completo** — crear, editar, eliminar. Crear un pasante nuevo solo pide nombres/apellidos/email (`POST /api/estudiantes`); queda con `usuarios.activado = false` y un `password_hash` placeholder inutilizable. **No hay pantalla de registro para el pasante** — la primera vez que intenta entrar en `/portal/login` con ese email, `app/api/auth/portal-login/route.ts` detecta `activado = false` y guarda lo que escribió en el campo de password como su clave definitiva (`activado` pasa a `true`), en vez de compararla contra una existente. De ahí en adelante el login es el de siempre (`bcrypt.compare`). Esto es la implementación real del "estudiante debe tener lista fija" que quedaba pendiente — ya no es un array hardcodeado, es una fila en `usuarios` con `activado=false`.

**Carga masiva por Excel (Sesión 20):** en la misma página, sección "Carga Masiva por Excel" — botón descarga plantilla `.xlsx` (columnas Nombres/Apellidos/Email, generada client-side con `xlsx`/SheetJS), input de archivo parsea el `.xlsx` subido en el navegador (`XLSX.read` + `sheet_to_json`, columnas detectadas sin importar mayúsculas) y llama `POST /api/estudiantes/bulk` con `dryRun:true` → tabla de vista previa con estado por fila (✅ OK / ❌ motivo: campos faltantes, email inválido, duplicado en el archivo, o ya existente en `usuarios`). Nada se guarda hasta pulsar "Confirmar y Crear", que reenvía solo las filas válidas con `dryRun:false` — mismo endpoint hace el insert real (misma lógica de placeholder `password_hash` + `activado=false` que el alta individual). El alta uno-por-uno original no cambió, es una sección aparte en la misma página.

Investigación (hoy: Jhonny, German, Cristina, Johana) todavía no tiene ninguna función propia — la tarjeta "Gestionar Investigación" del Portal no tiene links, solo un texto "Próximamente" (se quitó el link a `/investigacion/espacios` porque no tenía nada real detrás; la página sigue en el código, sin enlazar).

**Gestión de Carrera** (`/gestion-carrera`) es aparte: cualquier docente (investigación o vinculación) registra ahí eventos generales de difusión, categorizados como Investigación (¿qué proyecto?) / Vinculación / Asignatura (texto libre) — no reemplaza el formulario simple de Difusión que ya usa el estudiante-instructor dentro de su espacio.

### Tablas Neon (esquema real, no siempre igual a `scripts/migrate.js` — hubo drift por cambios hechos fuera de git)
| Tabla | Para qué | Notas |
|---|---|---|
| `usuarios` | Personas del Portal (todos los roles) | Fuente de verdad de "quién es quién" en el sistema nuevo |
| `perfiles_estudiantes` / `perfiles_beneficiarios` | Datos extra según rol | perfiles_estudiantes: carrera/modalidad. perfiles_beneficiarios (Sesión 21): contacto, edad, tiene_discapacidad/tipo_discapacidad, situacion_ocupacional (solo_estudia\|estudia_trabaja\|solo_trabaja\|desempleado_no_estudia) + condicionales rol_laboral / nivel_educativo (universidad\|colegio\|escuela) / carrera / curso — reemplaza la antigua columna situacion_laboral (texto libre) |
| `espacios_enseñanza` | Clubes/aulas/cohortes | Columna `area`: `vinculacion`\|`investigacion` |
| `espacio_instructores` | Qué estudiante es instructor de qué espacio | Base del control de acceso por espacio |
| `inscripciones_espacio` | Beneficiarios asignados a un espacio | |
| `ciclos_academicos` | Semestres | Compartido entre áreas, no se etiqueta |
| `evaluaciones_mcer` | Resultados del test MCER | `beneficiario_id` es **entero** → `usuarios.id` (se corrigió en Sesión 19, antes era UUID roto contra la tabla vieja `beneficiarios`) |
| `encuestas_satisfaccion` | Encuestas de satisfacción | |
| `actividades_difusion` | Eventos/podcasts (Difusión + Gestión de Carrera) | `categoria`/`proyecto`/`asignatura`/`descripcion`/`hora`/`observaciones` |
| `asistencia_espacio` / `asistencia_beneficiarios` | Bitácora de asistencia por espacio | Reemplaza el módulo viejo `bitacora_asistencia` (UUID) |
| `calificaciones_ciclo` | ⚠️ **Sin usar** | Feature "Calificaciones" del panel docente se eliminó (Sesión 19, decisión del usuario: el test MCER es la única evaluación real). Tabla queda huérfana, no se borró. |

**⚠️ Esquema viejo, huérfano, NO tocar sin decisión explícita:** `estudiantes`, `espacios`, `beneficiarios`, `bitacora_asistencia`, `bitacora_estudiantes`, `bitacora_beneficiarios` — todas UUID, del módulo de asistencia original (pre-Sesión-19). Tenían 3 cuentas reales (Andy Castillo, Josselyn Mera, Ailys Bailón) que quedaron huérfanas — deben autoregistrarse de nuevo en `/registro`, sus claves viejas no eran recuperables.

**⚠️ Tablas sin usar en ningún lado del código, creadas fuera de git (probablemente por Antigravity vía consola de Neon), sin confirmar con el usuario:** `avance_investigacion`, `seguimiento_laboral`, `eventos_difusion`, `eventos_estudiantes`, `encuesta_satisfaccion` (singular, distinta de `encuestas_satisfaccion`). Apuntan al esquema UUID viejo. **No construir nada sobre ellas sin antes preguntar** — probablemente son la base pensada para expandir Investigación/Vinculación, pero no hay contexto documentado de su diseño.

### Variables de entorno requeridas (Neon/Portal)
`DATABASE_URL` (Neon), `SESSION_SECRET` (firma de `pine_app_session`), `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` (uploads). Todas ya están en Vercel Production — ver `.env.local.example` para desarrollo local.

---

## Estado Actual (2026-08-30)

| Módulo | Estado | % |
|--------|--------|---|
| Sitio público (landing + páginas de proyecto) | ✅ Completo | 100% |
| Admin Panel legacy (CRUD sitio estático) | ✅ Completo — gateado por `modulos_acceso: contenido_sitio` (solo Arturo+Jhonny), ya no por `Pine2026` ni por `admin` genérico | 100% |
| Portal PINE — Auth unificada | ✅ Completo (Sesión 19) | 100% |
| Portal PINE — Vinculación (espacios/instructores/beneficiarios/MCER/encuesta/asistencia) | ✅ Completo, probado end-to-end en producción (Sesión 19) | 100% |
| Portal PINE — Investigación | ⏳ Solo creación de espacios; artículos científicos pendiente de definir | 30% |
| Gestión de Carrera (eventos multi-área) | ✅ Completo (Sesión 19) | 100% |
| Deploy Vercel | ✅ Auto-deploy activo en push a `main` | 100% |

**Progreso general del sitio público: ~99%. Portal PINE (Neon): recién construido, en uso real solo por Arturo hasta que el resto del equipo se autoregistre.**

---

## Cambios Recientes (Sesión 22 — 2026-09-01)

- ⚠️ **Bug fix crítico:** `/registro` todavía ofrecía autoregistrarse como `beneficiario` y usaba la columna `perfiles_beneficiarios.situacion_laboral`, eliminada en la Sesión 21 — cualquiera que se registrara así habría recibido un error 500. Corregido eliminando la opción `beneficiario` de `PUBLIC_ROLES` en `app/api/auth/register/route.ts` (ahora solo `['profesor']`, consistente con "beneficiario nunca tiene cuenta" documentado desde Sesión 19) y simplificando `app/registro/page.tsx` (ya no hay selector de rol, es directamente registro de profesor). **Lección:** al hacer un cambio de esquema, buscar *todos* los endpoints que tocan esa tabla, no solo el que se está modificando — este caso no se detectó en la verificación de Sesión 21 porque solo se probó `POST /api/beneficiarios`, no `POST /api/auth/register`.
- ✅ `MANUAL_USUARIO.md` reescrito completo para reflejar Sesiones 19-21: tabla de "quién crea tu cuenta" por rol, Registros vs Gestión de Vinculación como tarjetas separadas, páginas planas de Registros (no tabs anidados en espacio), carga masiva de pasantes por Excel, campos extendidos de beneficiarios, asistencia con checks preseleccionados, nombres correctos de tarjetas del Portal ("Indicadores", "Gestión del Sitio").
- ✅ `ANTIGRAVITY.md` sincronizado con Sesiones 20-21 (ver más abajo).

---

## Cambios Recientes (Sesión 21 — 2026-08-31)

- ✅ **Datos extendidos de beneficiarios** (`/vinculacion/beneficiarios`, modo "Registrar nuevo"): agregados edad y discapacidad (checkbox + campo "¿cuál?"). Reemplazado el campo libre "Situación laboral" por un flujo condicional: select Situación ocupacional (solo estudia / estudia y trabaja / solo trabaja / desempleado y no estudia) → si trabaja pide rol; si estudia pide nivel educativo (universidad/colegio/escuela) → si es universidad pide carrera + curso. `perfiles_beneficiarios.situacion_laboral` (texto libre) eliminada de la tabla (estaba vacía en producción, sin riesgo de pérdida de datos) — ver `scripts/migrate-beneficiarios-perfil.js`. `POST /api/beneficiarios` actualizado para insertar las columnas nuevas.

---

## Cambios Recientes (Sesión 45 — 2026-09-22)

- ✅ **Dashboard PINE (`/pine-dashboard`)**: desglosado indicador MCER en Diagnóstico Semestral (`49/49`) vs Evaluaciones Finales Meta 2 años (`0/100`), e incorporadas tarjetas de Beneficiarios Inscritos (`49/50`), Horas Acreditadas de pasantes y Espacios Activos.
- ✅ **Fix `/api/admin/stats`**: corrección del conteo de Investigadores Vinculados para consultar los 5 estudiantes reales asignados a investigación en lugar de la columna vacía heredada `perfiles_estudiantes.titulo_investigacion`.

---

## Cambios Recientes (Sesión 20 — 2026-08-31)

- ✅ **Carga masiva de pasantes por Excel** — nueva dependencia `xlsx` (SheetJS) `^0.18.5`. Endpoint nuevo `POST /api/estudiantes/bulk` (dos modos vía `dryRun`, ver detalle en `## Portal PINE` → sección Pasantes). UI en `/vinculacion/pasantes`: plantilla descargable + input de archivo + tabla de vista previa + confirmación. Alta uno-por-uno y CRUD existentes de esa página no se tocaron.
- ✅ Dashboard PINE (`/pine-dashboard`): las 4 tarjetas de KPI existentes agrupadas bajo `<h2>Vinculación</h2>` (preparado para sumar otras áreas a futuro).
- ✅ Portal (`/portal/dashboard`): tarjeta "Indicadores (Gerencia)" → "Indicadores".

---

## Cambios Recientes (Sesión 19 — 2026-08-30)

### Construcción completa del Portal PINE (Neon Postgres) + hardening de seguridad

Sesión larga, trabajo en paralelo con Antigravity en el mismo repo (varios push directos a `main` sin coordinación previa) — buena parte del trabajo fue reconciliar/corregir lo que Antigravity introdujo, no solo construir features nuevas. Ver `## Portal PINE` arriba para el estado final del sistema; aquí el resumen de lo que pasó:

- ✅ **Fix de seguridad crítico:** el panel `/admin` original usaba una cookie (`admin_session`) sin firmar, seteada por JS del cliente — cualquiera podía forjarla desde la consola del navegador y entrar sin password. Reemplazado por sesión HMAC firmada.
- ⚠️ **Antigravity introdujo el esqueleto de Neon** (`usuarios`, tablas de docencia/vinculación) con varios problemas que se corrigieron en el camino: contraseña compartida (`pineadmin2026`) sembrada para 5 cuentas con emails no confirmados/incorrectos (eliminadas), un secreto de sesión con fallback hardcodeado en el código fuente (`'fallback_secret_pine_2026'`, removido), `/admin/*` bloqueado sin condición para todos incluido el admin real (corregido), la página pública de Vinculación y `/registro` quedaron accidentalmente detrás de login (corregido).
- ✅ **Consolidación de sesión:** existían 3 cookies de sesión distintas y sin relación entre sí (`admin_session`, `usuario_session`, `pine_app_session`) — todo unificado en una sola (`pine_app_session` / `lib/session.ts`).
- ✅ **`profesoresAutorizados`** (lista fija de emails, no autoregistro abierto) + **`profesorModulos`** (asignación automática de `modulos_acceso` al registrarse) — decisión explícita del usuario: el rol `profesor` no es autoservicio libre.
- ✅ **Rediseño del flujo de Vinculación** siguiendo la cadena real descrita por el usuario (profesor crea espacio → asigna instructores → instructores operan su espacio) — antes cualquiera con sesión podía tocar cualquier espacio global. Ver `lib/permisos-espacio.ts`.
- ✅ **Área Investigación separada de Vinculación** (`espacios_enseñanza.area`) — antes compartían un solo panel confuso ("Docencia").
- ✅ **Gestión de Carrera** — registro de eventos abierto a cualquier docente, con categoría (investigación/vinculación/asignatura).
- ✅ **Eliminado:** tab "Calificaciones" del panel docente (decisión del usuario: el test MCER es la única evaluación real, esa nota manual no correspondía a nada), módulo viejo de asistencia UUID (`estudiantes`/`espacios`/`beneficiarios`/`bitacora_*`, reemplazado por el esquema nuevo sobre `usuarios`), scripts inseguros (`seed-roles.js`, `alter.js` con emails adivinados).
- ✅ `evaluaciones_mcer.beneficiario_id` corregido de UUID (apuntando a la tabla vieja) a entero contra `usuarios.id` — el guardado del test MCER estaba roto de origen.
- ℹ️ **Cabo suelto, sin resolver:** 4 tablas en Neon (`avance_investigacion`, `seguimiento_laboral`, `eventos_difusion`+`eventos_estudiantes`, `encuesta_satisfaccion` singular) creadas fuera de git, el usuario no las reconoce — quedan sin usar, a coordinar con Antigravity.
- ✅ **Resuelto:** `beneficiario` ya no tiene cuenta/password — `POST /api/beneficiarios` (nuevo) los crea como dato puro, lo da de alta el instructor/profesor desde `/vinculacion/beneficiarios`, no ellos mismos. `/registro` mantiene la opción `beneficiario` en el selector pero ya no se usa desde ningún link del sitio — candidato a quitarla del todo si nadie la necesita.
- ✅ **Resuelto (distinto al plan original):** el rol `estudiante` ya no autoregistra ni usa un array hardcodeado tipo `profesoresAutorizados`. En su lugar: el profesor pre-crea al pasante (`POST /api/estudiantes`, solo nombres/apellidos/email) con `usuarios.activado = false`; la primera vez que ese email intenta entrar por `/portal/login`, el password que escribe se guarda como su clave definitiva (`activado` pasa a `true`). Ver `### Pasantes` abajo. `/registro` ya no ofrece la opción "Estudiante" — solo `profesor` (whitelist) y `beneficiario` siguen ahí.
- ✅ Bug de paso: `isAdminAuthorized` solo dejaba pasar a 2 de los 4 `adminUsers` (German y Verónica tenían password válido pero quedaban bloqueados) — corregido para derivar de la misma lista. (Nota: este `adminUsers`/`lib/db.ts:authenticateAdmin` del panel legacy quedó como código muerto tras la migración a Neon — nada lo llama ya; candidato a limpieza futura.)
- ✅ **`/admin` restringido a Arturo+Jhonny:** el panel de contenido del sitio (10 secciones) se había quedado sin ningún link visible tras quitar el botón "Admin" del Header. Al restaurar el acceso, decisión explícita del usuario: no reutilizar el módulo `admin` genérico (lo tenían también German y Verónica, líderes de otros proyectos) — nuevo módulo `contenido_sitio`, solo para líder/colíder de este proyecto específico. Nueva tarjeta separada "Gestión del Sitio" en `/portal/dashboard` (no fusionada con "Indicadores"). Importante: el cambio en `profesorModulos` **no** actualiza retroactivamente cuentas ya registradas en Neon — hubo que hacer `UPDATE usuarios SET modulos_acceso = array_append(...)` a mano para la cuenta de Arturo.
- ⚠️ **Identidad fabricada encontrada y eliminada:** "Mg. Veronika Vera" (`member_12`, líder de un supuesto proyecto "Mentoría Lingüística", email `veronika@uleam.edu.ec`) resultó ser inventada por Antigravity — el usuario confirmó que solo `veronica.chavez@uleam.edu.ec` es real. Se eliminó la entrada en `members`, la página pública `/investigacion/mentoria-linguistica` (copia literal de `desarrollo-habilidades` con el texto cambiado) y el link del Header. Mismo patrón de fondo que los emails adivinados de Cristina/Johana corregidos antes en esta sesión — **Antigravity ha inventado datos de personas reales más de una vez sin decirlo**, verificar siempre antes de confiar en un nombre/email/proyecto que aparezca sin que el usuario lo haya mencionado primero.

---

## Cambios Recientes (Sesión 8 — 2026-04-26)

- ✅ Foto de Johana Bello actualizada (`JohanaBello.jpeg`)
- ✅ Andy Castillo agregado como Estudiante Investigador (`ANdyCastilo.png`)
- ✅ 5 nuevas publicaciones agregadas (libro + 4 artículos científicos)
- ✅ Libro descargable en PDF: `public/files/Libro-Innovaciones-Educativas.pdf`
- ✅ QWEN.md eliminado (ya no se usa Qwen)
- ✅ Carpeta `.qwen/` eliminada
- ✅ PocketBase eliminado completamente (`pocketbase/`, `.zip`, scripts, docs)
- ✅ Carpeta `frontend/` legacy eliminada
- ✅ Imágenes duplicadas de raíz eliminadas (todas en `public/images/`)
- ✅ Docs Word organizados en `docs/`
- ✅ Push a GitHub completado (commit `759f9e9`)

---

## Cambios Recientes (Sesión 9 — 2026-06-07)

- ✅ Nombre del Grupo de Investigación actualizado: "Innovaciones pedagógicas para el desarrollo sostenible: inclusión, interculturalidad e interdisciplinaridad" (doc oficial 2026-05-15)
- ✅ Documento `2026_GrupoInvestigacion.pdf` agregado a `public/admin-assets/` y registrado en `app/admin/documents/page.tsx`
- ✅ Nueva publicación `pub_64`: libro-podcast "An educational innovation in foreign Languages instruction" (Villafuerte-Holguín et al., 2026, Ediciones ULEAM), PDF descargable en `public/files/Libro-Podcast-Educacion-Innovadora.pdf`

---

## Cambios Recientes (Sesión 10 — 2026-06-07)

- ✅ Nuevos componentes de difusión QR: `QRFloatingButton.tsx` (botón flotante), `QRModal.tsx` (modal con QR + compartir WhatsApp), `QRPromoModal.tsx` (modal promocional auto-abierto)
- ✅ `ActivityGallery.tsx` y `SubstantiveFunctionsSection.tsx` agregados a la landing (galería de actividades + sección de funciones sustantivas — Docencia/Investigación/Vinculación)
- ✅ 3 nuevos miembros del **Equipo de Podcast**: Josselyn Mera Rivas, Doménica Valeska Vélez Bravo, Ailys Jordana Bailón Borja (`member_6`–`member_8`)
- ✅ Publicaciones `pub_1` y `pub_2` retiradas; nueva `pub_63` agregada: "Transition from Regular English Instruction to Bilingual Education: An Experience Using Gamification" (Piloso-Cedeño & Villafuerte-Holguín, regional)
- ✅ Fix: logo del Hero (256px) se solapaba con el texto del nav (`Inicio`, `Acerca de`, `Equipo`...) en pantallas PC de poca altura (~768px) — `Hero.tsx` ahora usa `pt-24 md:pt-28` para reservar espacio bajo el header; `Header.tsx` cambia `bg-transparent` por degradado translúcido (`from-uleam-blue/70...to-transparent backdrop-blur-sm`) y ajusta breakpoints del nombre/nav para que no se encimen en anchos medianos
- ✅ PDF "Informe Mensual Comisión Mayo" agregado a `public/admin-assets/`

---

## Cambios Recientes (Sesión 18 — 2026-08-18)

### Corrección de tags mal asignados + estructura de 3 ejes en Vinculación

- ✅ **5 videos con tag `vinculacion` incorrecto → cambiados a `investigacion`:** `video_4` (Cursos vacacionales), `video_6` (PsicoEducarte | Rol del Psicólogo Educativo), `video_15`/`video_17`/`video_20` (serie Más Allá del Lienzo). No correspondían a vinculación con la sociedad sino a colaboración interdisciplinaria/reflexión académica del proyecto. Quedan 8 videos con tag `vinculacion` (todos con mención explícita de vinculación en su descripción).
- ✅ Página `/vinculacion/dinamicas-linguisticas` reestructurada en **3 ejes** (a pedido explícito — el proyecto de vinculación se compone de estas 3 líneas):
  1. **Club de Inglés en Escenarios Locales** — nuevo componente `EnglishClubSection.tsx`, lee de un array nuevo `vinculacionEnglishClubPhotos` en `lib/data.ts` (tipo `VinculacionEnglishClubPhoto` en `types/index.ts`). A diferencia de `activities[]` (que **siempre** pertenece a la carrera completa, ver comentario en `types/index.ts`), este array es específico del proyecto de vinculación — se irá ampliando con más fotos/actividades del club a futuro. Primera foto: `public/images/ClubIngles-EscenariosLocales-Agosto2026.jpeg` (movida desde la raíz del repo, donde había quedado por auto-commit).
  2. **Podcasts y Estrategias de Difusión** — sin cambios, `TaggedVideoSection` (tag `vinculacion`).
  3. **Procesos de Investigación Educativa** — nuevo componente `VinculacionResearchSection.tsx`: muestra `pub_3` (libro "Innovaciones Educativas: Experiencias de vinculación social...") y `news_10` (capacitación de transferencia a la carrera de Pedagogía de Lengua y Literatura) como evidencia existente de investigación producida en el marco de la vinculación. Se buscó entre publicaciones/noticias ya existentes en `lib/data.ts` — no se inventó contenido nuevo.
- ℹ️ `activity_13` ("Actividades de Investigación Educativa — 5to Semestre PINE", trabajo de campo en el Gimnasio) **no** se movió a Vinculación: es una actividad de cátedra (5to semestre PINE), no de vinculación con la sociedad, y las actividades de `activities[]` no se filtran por proyecto por diseño.

---

## Cambios Recientes (Sesión 17 — 2026-08-18)

### Header con dropdowns por función sustantiva + 2 páginas de proyecto nuevas

- ✅ `Header.tsx`: nav ahora tiene 3 categorías con dropdown (click, cierre al click-afuera, versión mobile en acordeón) — **Docencia**, **Investigación**, **Vinculación**. Cada una despliega el proyecto correspondiente.
  - Investigación → `/investigacion/proyecto-innovacion` (existente, sin cambios de contenido)
  - Vinculación → `/vinculacion/dinamicas-linguisticas` (nueva) — "Dinámicas Lingüísticas en Contextos Locales"
  - Docencia → `/docencia/docencia-innovadora` (nueva) — "Docencia Innovadora e Interdisciplinaria"
- ✅ 2 páginas nuevas creadas con componentes compartidos: `ProjectHero.tsx`, `ProjectIntegrationNote.tsx` (nota de integración con el proyecto de investigación + link de vuelta), `TaggedVideoSection.tsx` (filtra podcasts por `tags` en vez de `category` — reutiliza `videos` de `lib/data.ts`, no se duplicó ningún video)
  - Los podcasts ya tenían `tags: ['docencia']` / `tags: ['vinculacion']` en `lib/data.ts` desde antes — la nueva sección los agrupa por función sustantiva sin mover ni duplicar entradas en `videos[]`
  - Cada página nueva incluye texto explícito de integración entre proyectos (producción técnica conjunta del podcast institucional vía Radio ULEAM/YouTube)
- ✅ Todas las cadenas nuevas agregadas a `lib/i18n.tsx` (ES+EN) bajo `nav.docencia/investigacion/vinculacion` y las secciones nuevas `docenciaProject` / `vinculacionProject`
- ℹ️ `ProjectHero`, `ProjectIntegrationNote`, `TaggedVideoSection` reciben `projectKey: 'docenciaProject' | 'vinculacionProject'` y resuelven sus propios textos vía `useLanguage()` — así las páginas contenedoras siguen siendo server components y conservan `export const metadata`
- ℹ️ HubProjectsSection (página `/`) no fue tocada — solo se pidió el dropdown del header, no tarjetas nuevas en el hub
- ✅ **Corrección de tags mal asignados:** 5 videos tenían `tags: ['vinculacion']` sin corresponder (colaboraciones interdisciplinarias del proyecto, no vinculación con la sociedad) → cambiados a `'investigacion'`: `video_4` (Cursos vacacionales), `video_6` (PsicoEducarte | Rol del Psicólogo Educativo), `video_15`/`video_17`/`video_20` (serie Más Allá del Lienzo). Quedan 8 videos con tag `vinculacion` (todos con mención explícita de vinculación en su descripción). Esto los saca de `/vinculacion/dinamicas-linguisticas` y les cambia el badge en `VideoCard` a "Investigación".

---

## Cambios Recientes (Sesión 16 — 2026-08-14)

### Auditoría de coherencia integral (repo, rutas, imágenes)

- ✅ **Ruta pública movida:** `app/pine` → `app/investigacion/proyecto-innovacion`. Actualizadas 3 referencias: `Header.tsx` (nav), `HubProjectsSection.tsx` (card enlace), `QRModal.tsx` (`SITE_URL` para QR + WhatsApp share)
- ✅ **9 imágenes rotas corregidas** (404 en producción) — `public/images/` se había reorganizado en subcarpetas (`logos/`, `members/`, `activities/`) pero 8 componentes seguían con paths planos viejos:
  - `Header.tsx`, `Hero.tsx` → `logo-proyecto.png` (logo del nav y hero)
  - `CertificateTemplate.tsx` → 4 logos (certificados generados)
  - `ConnectionsSection.tsx` → 3 logos
  - `HubProjectsSection.tsx` → `logo-red-lea.jpeg`
  - `VideoGallery.tsx` → `logo-radio-uleam.png`
  - `ActivityGallery.tsx`, `NewsSection.tsx` → 2 fotos de actividad podcast (datos fallback)
  - `TeamSection.tsx` → fotos líder/colíder (datos fallback) + comentario obsoleto "PocketBase" corregido
- ✅ **Referencia de repo vieja eliminada:** `CHANGELOG.md` apuntaba a `proyecto-innovacion-e-internacionalizacion.git` (nombre pre-cambio) → corregido a `carrerapineuleam.git`
- ℹ️ Pendiente de decisión (no tocado): `public/images/redlea/02-logos/` (2 imágenes sin uso), `public/admin-assets/2026_ProyectoActualizado.pdf` (huérfano, sin entrada en `app/admin/documents/page.tsx`), URLs viejas de vercel (`proyecto-innovacion-e-internacional.vercel.app`) dentro de `graphify-out/` (gitignored) y `material-web-REDLEA/*.md` (docs archivados, no código vivo)

---

## Cambios Recientes (Sesión 14 — 2026-08-14)

### Actividades de Docencia Innovadora e Interdisciplinaria

- ✅ `activity_7`: Presentación de Trabajos Finales — Mandiles para Enseñanza de Vocabulario en Inglés (4to semestre PINE, julio 2026)
- ✅ `activity_8`: Feria de Proyectos STEAM (9no semestre, junio 2026)
- ✅ `activity_9`: Educación Inclusiva en el Aula de Inglés — TDAH y TES
- ✅ `activity_10`: Feria de Estrategias de Lectura de Cuentos Infantiles (4to semestre PINE)
- ✅ `activity_11`: Práctica de Gestión de Emociones (padres y docentes)
- ✅ `activity_12`: Estrategia de Juegos de Mesa para la Práctica del Inglés (mayo 2026)
- ✅ `activity_13`: Investigación Educativa con Trabajo de Campo en Gimnasio (5to semestre PINE, salud universitaria y entrenamiento físico)
- ✅ `activity_14`: Estrategia de Enseñanza de Inglés mediante Museos (5to semestre, mayo 2026)

**Imágenes agregadas a `public/images/`:**
- `Mandiles-Vocabulario-Ingles-Julio2026.jpeg`
- `Feria-Proyectos-STEAM-Junio2026.jpeg`
- `Educacion-Inclusiva-Ingles-TDAH-TES.jpeg`
- `Feria-Estrategias-Lectura-Cuentos-4toSemestrePINE.jpeg`
- `Practica-Gestion-Emociones-Padres-Teachers.jpeg`
- `Estrategia-Juegos-Mesa-Ingles-Mayo2026.jpeg`
- `Investigacion-Educativa-5toSemestrePINE-Gimnasio.jpeg`
- `Estrategia-Museo-Ingles-5toSemestreMayo2026.jpeg`

---

## Cambios Recientes (Sesión 13 — 2026-07-21)

- ✅ `member_9`: Diana Noemi Cedeño Sánchez agregada como Estudiante Investigadora / Equipo de Podcast
- ✅ Foto: `public/images/DianaNoemCedenoSanchez.jpeg`

---

## Cambios Recientes (Sesión 12 — 2026-06-23)

- ✅ `video_9`: "EDUCAPINE | Vinculación y experiencias de los estudiantes de PINE" (embed: `Nj2TFVY7GFs`, cat_1)
- ✅ `video_10`: "EducaPine | Innovación Educativa y las nuevas metodologías" (embed: `DcH6yM8jaaU`, cat_1)
- ✅ `pub_71`: libro "El tamaño de lo que sentimos" — Castillo Menéndez, Rodríguez Zambrano & Cedeño Briones — Ediciones ULEAM, junio 2026 — PDF: `public/files/DIPSB-PUB2026-024-El-tamano-de-lo-que-sentimos.pdf`
- ✅ `news_5`: noticia destacada sobre publicación del libro (is_featured: true)

---

## Cambios Recientes (Sesión 11 — 2026-06-09)

- ✅ 6 nuevas publicaciones agregadas (`pub_65`–`pub_70`): solo `pub_66` (Profesorado, Comunicación asertiva y gamificación) categorizada `impacto`; resto `regional` (Education Quarterly Reviews, Sapienza, Technium)
- ✅ `pub_63` (Piloso-Cedeño & Villafuerte-Holguín) DOI actualizado: preprint OSF → DOI publicado `10.31014/aior.1993.08.02.588`
- ℹ️ Diagrama de Venn (`SubstantiveFunctionsSection.tsx`) cuenta `publications.length` automáticamente — no requiere actualización manual al agregar publicaciones

---

## Estructura de Archivos

```
carreraPINE/                       ← RAÍZ = Next.js app
├── CLAUDE.md                      # Este archivo (instrucciones para Claude)
├── ANTIGRAVITY.md                 # Instrucciones equivalentes para Antigravity
├── MANUAL_USUARIO.md              # Manual del Portal PINE, por rol
├── CHANGELOG.md / README.md / RESUMEN.md / DEPLOY_GUIDE.md   # ⚠️ obsoletos, de la era pre-PocketBase-removal — no confiar, no se actualizan
├── package.json
├── middleware.ts                  # Protege /admin/*, /portal/*, /vinculacion/espacios*, /investigacion/espacios*, /gestion-carrera, /pine-dashboard
├── .env.local.example
│
├── app/
│   ├── page.tsx, layout.tsx       # Landing pública
│   ├── admin/                     # Panel legacy CRUD sitio estático (gateado por modulos_acceso:contenido_sitio — solo Arturo+Jhonny)
│   ├── portal/{login,dashboard}/  # Entrada única del Portal PINE
│   ├── registro/                  # Autoregistro — solo profesor (whitelist), único rol público desde Sesión 22
│   ├── vinculacion/                # Gestión (profesor) vs Registro (estudiante+profesor) — ver ## Portal PINE
│   │   ├── espacios/               # Gestión: crear/listar espacios; [id] = asignar instructores (única función que queda ahí)
│   │   ├── pasantes/               # Gestión: vista agregada de estudiantes-instructores, solo profesor/admin
│   │   ├── asistencia/, beneficiarios/, test-mcer/, encuesta/  # Registro: 4 páginas planas, cada una con selector de espacio propio
│   │   ├── difusion/               # Registro: formulario simple, sin selector de espacio
│   │   └── dinamicas-linguisticas/ # Página PÚBLICA de contenido (no confundir con nada de arriba)
│   ├── investigacion/
│   │   ├── espacios/              # Crear/listar espacios de investigación
│   │   └── proyecto-innovacion/, desarrollo-habilidades/  # Páginas públicas de proyecto
│   ├── gestion-carrera/           # Registro de eventos, cualquier docente
│   ├── pine-dashboard/            # KPIs, solo modulos_acceso:admin
│   ├── docencia/, login/          # Redirects a las rutas nuevas (compat)
│   └── api/
│       ├── auth/{portal-login,register,logout,me}/
│       ├── espacios/{route,asignar,instructores,asistencia}/
│       ├── beneficiarios/, estudiantes/, tests/, encuestas/, difusion/, upload/
│       ├── admin/stats/           # KPIs para /pine-dashboard
│       └── protected/assets/[filename]/   # PDFs privados de public/admin-assets
│
├── components/                    # Componentes React del sitio público
│   └── admin/DataTable.tsx
│
├── lib/
│   ├── data.ts                    # Fuente de verdad del sitio ESTÁTICO (miembros, publicaciones, etc.) — incluye profesoresAutorizados/profesorModulos
│   ├── db.ts                      # In-memory CRUD sobre data.ts (solo panel admin legacy)
│   ├── session.ts                 # Auth unificada del Portal (Neon) — pine_app_session
│   ├── permisos-espacio.ts        # puedeOperarEspacio() — permisos por espacio
│   ├── neon.ts                    # Tipos del esquema viejo (estudiantes/espacios/beneficiarios) — huérfano
│   ├── questions.ts                # Banco de preguntas del Test MCER
│   └── certificateDocx.ts          # Generación de certificados .docx
│
├── scripts/                       # Migraciones Neon (una sola ejecución cada una, con node --env-file=.env.local)
│   ├── migrate.js                 # Schema original (desactualizado vs realidad, ver ## Portal PINE)
│   ├── migrate-espacios-v2.js     # area, espacio_instructores, asistencia_*, columnas de difusión
│   └── fix-mcer-schema.js         # Fix puntual de evaluaciones_mcer
│
├── types/index.ts                 # Interfaces TypeScript del sitio estático
│
├── public/
│   ├── images/, files/            # Públicos
│   └── admin-assets/              # Privados, requiere sesión admin
│
└── docs/                          # Documentos Word de referencia
```

---

## Equipo actual (`/lib/data.ts` → `members`)

| ID | Nombre | Rol | Orden |
|----|--------|-----|-------|
| member_1 | Dr. Arturo Rodríguez | Líder de Internacionalización y Miembro de Vinculación | 1 |
| member_2 | Dr. Jhonny Villafuerte | Colíder del Proyecto | 2 |
| member_3 | Mg. Cristina Basantes | Miembro de Investigación y Colaboradora de Internacionalización (Podcast) | 3 |
| member_4 | Psi. Johana Bello, Mg. | Colaboradora en Investigación y Directora de Psicología Educativa | 4 |
| member_5 | Andy Castillo | Estudiante Investigador | 5 |
| member_6 | Josselyn Mera Rivas | Estudiante Investigadora / Equipo de Podcast | 6 |
| member_8 | Ailys Jordana Bailón Borja | Estudiante Investigadora / Equipo de Podcast | 7 |
| member_7 | Doménica Valeska Vélez Bravo | Equipo de Podcast | 8 |
| member_9 | Diana Noemi Cedeño Sánchez | Estudiante Investigadora / Equipo de Podcast | 9 |
| member_10 | Dr. German Carrera Moreno, PhD. | Líder de Proyecto (Desarrollo de Habilidades Lingüísticas) — proyecto propio, ver `/investigacion/desarrollo-habilidades` | 10 |
| member_11 | Mg. Cynthia Zambrano Zambrano | Líder de Proyecto (Vinculación) | 11 |

⚠️ Hubo un `member_12` ("Mg. Veronika Vera", líder de un supuesto proyecto "Mentoría Lingüística") que resultó ser una identidad **fabricada por Antigravity** (email inventado, sin confirmar con el usuario) — se eliminó en Sesión 19 junto con su página pública (`/investigacion/mentoria-linguistica`) y su link en el Header. Ver "Cambios Recientes (Sesión 19)" abajo — regla de oro: **nunca inventar/adivinar un email o una persona**, confirmar siempre con el usuario antes de agregar a `members`, `profesoresAutorizados` o `profesorModulos`.

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
> `lib/data.ts:adminUsers` (los 4 emails con password `Pine2026`) y `lib/db.ts:authenticateAdmin`/`isAdminAuthorized` son **código muerto** — nada los llama desde la migración a Neon. Candidato a limpieza futura, no borrado por si algo externo los referencia todavía.
- **Middleware:** `middleware.ts` protege `/admin/*`, `/portal/dashboard`, `/vinculacion/espacios*`, `/investigacion/espacios*`, `/gestion-carrera`, `/pine-dashboard`.

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
9. **Actualizar este CLAUDE.md** cuando cambien el equipo, publicaciones, estructura, o el esquema/flujo del Portal PINE
10. **Trabajo en paralelo con Antigravity:** revisar `git log origin/main..HEAD` y `git fetch` antes de asumir que el repo está como lo dejaste — Antigravity pushea directo a `main` sin avisar

### Convenciones de código
- Componentes: PascalCase (`TeamSection.tsx`)
- Funciones/variables: camelCase
- Constantes: UPPER_SNAKE_CASE
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`)

---

**Última actualización:** 2026-09-01 (Sesión 22)
**Versión:** 0.10.3
**Estado:** Sitio público funcional ✅ — Portal PINE (Neon) construido y desplegado ✅ — Repo sincronizado con origin ✅
