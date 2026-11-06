# Plan de implementación (handoff a Antigravity): Banco de fotos con topes + administración de la web por los líderes de proyecto

> **Objetivo de fondo:** que la web sea **administrable por los propios líderes**: cada líder/colíder gestiona los datos de **su** proyecto (empezando por las fotos) sin tocar código y sin depender de Arturo. Este documento cubre la **primera entrega** (fotos) y deja la base reutilizable (`lib/permisosProyecto.ts`, namespace `/portal/proyecto/[proyectoId]/…`) para las siguientes (§12).
> Formato y reglas heredan de `docs/PLAN_IMPLEMENTACION_ANTIGRAVITY_INFORMES.md`. Lee ese archivo y `CLAUDE.md` (secciones *Auditoría 2026-09-24*, *Sesión 32*, *Sesión 36*, *Sesión 50*, *Sesión 51*) antes de empezar.
> **Nada de este plan está implementado.** Todo lo que aquí figura como "existe" fue verificado contra Neon (`dark-feather-21824720`) y el código el 2026-09-26.

---

## 0. Alcance y decisiones ya tomadas (confirmadas por el usuario)

1. **Banco de fotos único** = tabla `fotos`. Toda foto que suben los pasantes (eventos, podcasts, asistencia) **entra automáticamente** a ese banco en estado **"sin ubicar"** (`ubicaciones = '{}'`), sin publicarse.
2. **Menores de edad.** Las fotos donde aparecen menores **nunca se publican** en la web. Mecanismo de dos capas: (a) el estudiante **declara** con una casilla *"¿Aparecen menores de edad en la foto?"* (**No** marcado por defecto); (b) **Groq (visión)** revisa la foto como respaldo. Detalle en WP5–WP6.
3. **Las 22 fotos de asistencia ya existentes** van al banco como `visibilidad='interna'` + `menores='revisar'` (bandeja de revisión de un admin). No se publican hasta que un admin las revise.
4. **Podcasts:** la imagen que suben (`evidencia_url`, a veces portada, a veces captura de estadísticas) se acepta **tal cual** como foto del banco (`origen='podcast'`). El usuario dijo que para difusión es indiferente.
5. **Topes por espacio (tope SUAVE):** el admin puede publicar más fotos que el tope, pero el sitio público **solo muestra las N primeras**; el resto sigue en el banco. Topes iniciales (editables sin código): Portada **6**, Club de Inglés **10**, Docencia **8**, RED LEA **10**, galerías nuevas (Internacionalización, Desarrollo de Habilidades, Mentoring) **8**.
6. **Vinculación NO tiene galería propia distinta del Club de Inglés.** La página `/vinculacion/dinamicas-linguisticas` solo muestra `EnglishClubSection` (ubicación `club-ingles`). No crear otra.
7. **Regla automática:** la galería de Docencia Innovadora muestra por defecto las **2 fotos de podcast más recientes** (configurable en `fotos_ubicaciones`, sin código).
8. **Permisos:** la **portada** es solo de administración del sitio (ver D1). **Líder y colíder** de cada proyecto (`proyecto_miembros.rol_en_proyecto IN ('lider','colider')`, `activo`) administran las fotos **de su proyecto**, nada más.
9. **Fotos ya existentes:** las 68 referencias a imágenes locales (`/images/...`) se suben a Cloudinary y se registran en el banco; las que hoy salen en portada/Docencia/RED LEA/Club conservan su ubicación; las demás quedan "sin ubicar".

10. **Cada evento/podcast/QR se asigna a proyectos al subirlo (multi-proyecto).** Quien sube o genera el enlace elige de los proyectos que **le corresponden**; solo administración del sitio (D1) puede asignar cualquiera. Detalle en **WP5b**. Confirmado por el usuario 2026-09-26.

### Decisiones abiertas — el agente NO las resuelve por su cuenta

| # | Tema | Valor por defecto a implementar | Quién confirma |
|---|---|---|---|
| **D1** | **RESUELTA (usuario, 2026-09-26).** "Administración del sitio" = portada, fotos internas/con menores, topes y cualquier proyecto asignable. Verificado en Neon: **solo Arturo** tiene `admin`/`contenido_sitio`/`superadmin`. **Jhonny Villafuerte NO es admin y no debe administrar contenido general**: solo gestiona los proyectos donde es líder/colíder (Internacionalización como colíder, RED LEA como líder). | `puedeAdministrarSitio` = `contenido_sitio` **o** `admin` **o** `superadmin` (hoy equivale a Arturo). **Nunca** conceder acceso a `/admin/*` ni a la portada a alguien por ser líder/colíder de un proyecto. Un líder entra solo por `/portal/proyecto/...`. Si más adelante se quiere excluir a `contenido_sitio`, se cambia en esa única función. | — |
| **D2** | **HECHA (2026-09-26, por SQL en Neon, con respaldo y auditoría).** Jhonny Villafuerte (`usuarios.id = 13`) es **líder de RED LEA** (`proyecto_miembros`: `redlea`/`lider`/orden 1/activo) y sigue como **colíder de Internacionalización**. Se le agregó `investigacion` a `usuarios.modulos_excluidos` para que **no** herede "Gestionar Investigación" ni `/investigacion/*` (`redlea.area = 'investigacion'` deriva ese módulo a todo líder). Estado verificado: `modulos_acceso = {}`, `modulos_manuales = {}`, `modulos_excluidos = {investigacion}`. Respaldo: tabla `respaldo_lider_redlea_20260926` (1 fila con el estado previo). Auditoría: fila `crud_update` en `superadmin_audit_log`. | **No repetir ni deshacer.** El agente no toca `proyecto_miembros` de RED LEA ni `modulos_excluidos` de Jhonny. Solo verificar en WP0 con el SELECT de abajo. Para revertir (solo si el usuario lo pide): `DELETE FROM proyecto_miembros WHERE proyecto_id='redlea' AND usuario_id=13;` y restaurar `modulos_excluidos` desde el respaldo. ⚠️ Ver hallazgo **H1** (el cableado de derivación de módulos no está activo en `main`). | — |
| **D3** | Nombre exacto del modelo de visión de Groq (cambia con el tiempo). | Variable `GROQ_VISION_MODEL`; el agente verifica en la documentación vigente de Groq y documenta el valor usado. | agente + verificación |
| **D5** | **RESUELTA (usuario, 2026-09-26): los pasantes son de Vinculación; sus podcasts pertenecen a Vinculación **e** Internacionalización ("Innovaciones Pedagógicas e Internacionalización").** | Pasante: **eventos** → `['vinculacion']` fijo. **Podcasts** → `['vinculacion','internacionalizacion']` fijo. Es la regla que ya existe hoy (`video_proyecto_id: 'vinculacion'` en `/vinculacion/difusion` + `internacionalizacion` añadida por el servidor, Sesión 38); WP5b solo la **formaliza** y la copia a `actividades_difusion.proyectos` y `fotos.proyectos`. El pasante no ve selector: solo la etiqueta "Se asociará a: …". | — |
| **D4** | Fotos que llegan por **enlace temporal de externos** (`/api/enlaces-difusion/[token]`) no tienen declaración fiable. | Siempre `menores='revisar'`, `visibilidad='interna'` hasta que un admin las revise. | — (regla dura) |

### Datos reales de partida (verificados)

- `fotos`: 45 filas (`redlea-galeria` 13 activas + 2 inactivas, `club-ingles` 3, `portada` 3 activas + 1 inactiva, `docencia-galeria` 23 con `origen='evidencia_evento'`). Columnas actuales: `id text PK, url, cloudinary_public_id, titulo, descripcion, ubicaciones text[] NOT NULL DEFAULT '{}', "order" int, activo bool, subido_por text (email), origen text, created, updated, posicion int 0-100`. CHECK `fotos_origen_check IN ('admin','evidencia_evento')`, `fotos_posicion_check`.
- `proyectos.id` reales: `internacionalizacion`, `vinculacion`, `docencia_innovadora`, `redlea`, `desarrollo_habilidades`, `mentoring`. (`slug` de Vinculación es `dinamicas-linguisticas`; de Internacionalización `proyecto-innovacion`.)
- Líder/colíder activos hoy: `desarrollo_habilidades` → Germán Carrera (lider, id 19) + María Cristina Basantes (colider, id 14); `docencia_innovadora` → Verónica Chávez (lider, id 20); `mentoring` → Verónica Chávez (lider); `internacionalizacion` → Arturo Rodríguez (lider, id 1) + Jhonny Villafuerte (colider, id 13); `vinculacion` → Cintya Zambrano (lider, id 8); `redlea` → **Jhonny Villafuerte (lider, id 13) desde 2026-09-26 (D2)**.
- `actividades_difusion`: `project_id` y `proyecto` están **vacíos en todas las filas actuales** → los eventos históricos no traen proyecto; quedarán con `proyectos = '{}'` (sin proyecto) salvo los ya ubicados y las filas con `categoria = 'vinculacion'` (→ `['vinculacion']`, ver WP7). El campo `proyecto` (texto) lo consumen los informes: **no tocarlo**.
- `asistencia_espacio`: 22 filas con `foto_url`. `espacios_enseñanza.area` es siempre `vinculacion` (12 espacios).
- Referencias de imagen: 26 en Cloudinary, 68 locales (`/images/...`; `public/images` tiene solo 16 archivos, 20 MB → hay **muchas repeticiones**: subir cada archivo local **una sola vez**).
- Cada `route.ts` es una función serverless de Vercel (cuota ≈300 por deploy). Este plan agrega **3** rutas nuevas y extiende 3 existentes. No agregar más.

---

## 1. Reglas de oro (no negociables — repiten los errores ya documentados)

1. **Rama de trabajo:** `git checkout -b feat/admin-lideres-fotos` **antes de tocar nada**. Verificar `git branch --show-current` al iniciar cada sesión. Un hook de auto-commit sube a `main` lo que encuentre en el árbol: **no trabajar en `main`**. (Ya causó deploys en ERROR: marcas de conflicto y archivos de 0 bytes.)
2. `git commit` **falla desde la herramienta Bash** de este entorno Windows ("El sistema no puede encontrar el archivo especificado"); usar **PowerShell**.
3. Antes de cada push con `.ts/.tsx`: `npx tsc --noEmit` **y** `npm run build` pasan local. `grep -rn "<<<<<<<" app lib components` = 0. `find app lib components -size 0 -type f` = vacío (un archivo nuevo nunca se commitea vacío).
4. **`neon()` nunca a nivel de módulo.** Los helpers de `lib/` reciben `sql` desde el handler. En GET públicos sin sesión: `neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } })` + `export const dynamic = 'force-dynamic'`.
5. **Migraciones a mano** en `scripts/migrate-*.js` (plantilla: `scripts/migrate-topes-horas.js`). **Nunca** `prisma db push` / `prisma migrate`. **Auditar `information_schema` antes y verificar con SELECT después.** Usar **solo** los nombres de columna de este documento: no adivinar (errores previos: `ciclos_academicos.activo` no existe; `asistencia_espacio_id` no existe, la columna es `asistencia_id`).
6. **Todo valor nuevo de un CHECK/enum se migra en el mismo cambio** y se prueba el flujo real (lección "Ver como"). `tsc`/`build` no detectan constraints de Postgres.
7. **`middleware.ts` excluye `/api` del matcher**: cada `route.ts` debe validar sesión **dentro del handler** (`getAppSessionFromCookies()`), **rechazar `rol === 'secretaria'`**, y validar permisos con los helpers de este plan. Toda página nueva bajo `/portal/proyecto` se agrega a `protectedRoutes` (WP9).
8. **La cookie de sesión puede estar desfasada** (los módulos viajan firmados dentro de ella): los permisos por proyecto se consultan **en Neon en cada petición**, nunca solo con la cookie. Bajo "Ver como" la cookie ya trae la identidad suplantada: usar `session.id`/`session.email` tal cual, nunca `impersonatedBy`.
9. **Nada de datos inventados** (personas, correos, proyectos). Si falta un dato, se deja `NULL` o se pregunta.
10. Nombres descriptivos (nada de `s`, `i`, `val`, `tmp`, `cb`). Estado de formularios React: releer el objeto completo tras pegar bloques (claves duplicadas rompieron un build). Texto visible del **sitio público** con `t('clave')` en `lib/i18n.tsx` (ES+EN); el portal/admin va en español fijo como el resto.
11. Toda función que deje algo pendiente agrega su regla en `lib/notificaciones.ts` + fila en `NOTIFICACIONES.md` (WP10).
12. Tras push: `list_deployments` de Vercel (proyecto `pineuleam`, `prj_FzfL9E6xk7TUi5AkMQ5njDnNQAH7`, team `team_bfWYT0VBtmA1Dj9nL7242ZJL`) debe dar `READY`; si `ERROR`, leer `list_deployment_events` y corregir **antes** de seguir.
13. **No commitear ni pushear sin instrucción del usuario.** Un PR por fase.
14. Antes de editar un archivo compartido (`middleware.ts`, `app/portal/dashboard/page.tsx`, `lib/notificaciones.ts`, `app/api/difusion/route.ts`): **leerlo completo**; otra sesión (Claude) lo pudo cambiar. Cambios mínimos y quirúrgicos; no reformatear ni reordenar.

---

## 2. Orden de trabajo

| WP | Contenido | Depende de | Fase |
|---|---|---|---|
| WP0 | Preparación y auditoría | — | A |
| WP1 | Migración de BD (`fotos` + `fotos_ubicaciones`) | WP0 | A |
| WP2 | Capa de datos y permisos (`lib/`) | WP1 | A |
| WP3 | API pública con topes + regla automática | WP2 | A |
| WP4 | API de administración (banco, acciones, ubicaciones) | WP2 | A |
| WP5 | Declaración de menores + ingesta (asistencia, eventos, podcasts, externos) | WP1, WP2, WP5b | A |
| WP5b | **Asignación de proyectos al subir** (eventos, podcasts, enlaces QR) | WP1, WP2 | A |
| WP6 | Groq visión (respaldo de menores) | WP5 | A |
| WP7 | Backfill: Cloudinary + registro de lo existente | WP1, WP5, WP5b | A |
| WP8 | UI: `/admin/photos` reescrito (componente compartido) | WP3, WP4 | A |
| WP9 | Panel del líder `/portal/proyecto/...` + galerías nuevas en páginas de proyecto | WP4, WP8 | B |
| WP10 | Notificaciones | WP4 | B |
| WP11 | Pruebas de permisos, documentación, despliegue | todo | cada fase |

**Fase A = WP0–WP8 (incl. WP5b)** (resuelve la sobrepoblación y los menores; desplegable sola). **Fase B = WP9–WP10** (líderes). WP11 en cada fase.


### H1 — Hallazgo de la revisión (2026-09-26): el cableado de derivación de módulos NO está activo en `main`

- El commit `c53d899` (permisos por pertenencia) cableaba `lib/permisosPertenencia.ts` en `app/api/admin/roles/route.ts`, `app/api/members/route.ts`, `app/api/auth/register/route.ts`, `app/api/proyectos/*` y el dashboard. Un auto-commit posterior (`136f028`, "+43 more", −575 líneas) **revirtió esas integraciones**: hoy `recalcularModulos`/`calcularModulosDerivados` **no se llaman desde ningún archivo** y `/api/admin/roles` no gestiona `modulos_manuales`/`modulos_excluidos`. La BD sí tiene las columnas.
- Consecuencia práctica: **hoy no hay derivación automática**, por eso D2 es segura tal cual; pero si alguien restaura ese cableado (Claude/Antigravity), la exclusión de `investigacion` de Jhonny **ya está en la BD** y se respetará.
- **Instrucción al agente:** este plan **no depende** de ese cableado (los permisos de fotos se consultan en vivo con `proyecto_miembros`, WP2). **No** restaurar ni tocar `c53d899` como parte de este trabajo. Solo anotar en el PR que el cableado sigue revertido y avisar a Arturo para que decida si se restaura (es trabajo aparte).
- Regla de prevención (ya en §1, regla 1): un auto-commit desde un árbol de trabajo desactualizado puede **deshacer trabajo ajeno** sin avisar. Antes de editar cualquier archivo compartido: `git fetch` + `git diff origin/main -- <archivo>` + leerlo completo.

---

## WP0 — Preparación y auditoría (solo lectura)

1. `git fetch`; `git log origin/main..HEAD`; crear la rama (regla 1).
2. Auditoría BD (Neon MCP, `run_sql`, **una sentencia por llamada**): `information_schema.columns` de `fotos`, `proyectos`, `proyecto_miembros`, `asistencia_espacio`, `actividades_difusion`, `videos`; `pg_constraint` de `fotos`; confirmar que **no existen** aún `fotos_ubicaciones` ni las columnas nuevas de WP1. Si algo difiere de la sección "Datos reales", **detenerse y reportar**.
3. Listar líderes/colíderes reales: `SELECT pm.proyecto_id, pm.rol_en_proyecto, u.id, u.nombres, u.apellidos FROM proyecto_miembros pm JOIN usuarios u ON u.id = pm.usuario_id WHERE pm.activo AND pm.rol_en_proyecto IN ('lider','colider')`. Contrastar con la tabla de §0 (esperado: RED LEA → Jhonny como `lider`, D2 ya aplicada). Verificar además `SELECT modulos_acceso, modulos_excluidos FROM usuarios WHERE id = 13` → `{}` y `{investigacion}`; si no coincide, **detenerse y reportar** (no corregir a mano).
4. `SELECT DISTINCT ubicaciones FROM fotos` → todos los slugs usados deben existir en el seed de WP1 (esperado: `portada`, `docencia-galeria`, `redlea-galeria`, `club-ingles`).
5. Inventario de imágenes: `SELECT DISTINCT` de rutas locales en `fotos.url`, `actividades_difusion.photos` (unnest), `actividades_difusion.evidencia_url`; comprobar con `fs.existsSync` cuáles existen en `public/`. Guardar el conteo real de **archivos distintos** (insumo de WP7).
6. Leer completos antes de editar: `middleware.ts`, `lib/session.ts`, `lib/modulos.ts`, `lib/equipoProyecto.ts`, `lib/notificaciones.ts`, `NOTIFICACIONES.md`, `app/admin/photos/page.tsx`, `app/api/photos/route.ts`, `app/api/photos/[id]/route.ts`, `app/api/upload/route.ts`, `app/api/difusion/route.ts`, `app/api/espacios/asistencia/route.ts`, `app/api/enlaces-difusion/[token]/route.ts`, `app/api/proyectos/route.ts`, `app/portal/dashboard/page.tsx`, `lib/groqAudio.ts` (patrón de llamada a Groq), `.claude/skills/carrerapine-workflow/SKILL.md`.

---

## WP1 — Migración de BD

Archivo: `scripts/migrate-fotos-banco.js` (ejecutar con `node --env-file=.env.local scripts/migrate-fotos-banco.js`; aplicar también en Neon vía MCP, proyecto `dark-feather-21824720`). **Idempotente** (`IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`). Orden obligatorio:

```sql
-- 0. Respaldo (patrón usado antes en este repo)
CREATE TABLE IF NOT EXISTS respaldo_fotos_20260926 AS SELECT * FROM fotos;

-- 1. Columnas nuevas (aditivas: el código actual sigue funcionando)
ALTER TABLE fotos
  ADD COLUMN IF NOT EXISTS proyectos       text[]  NOT NULL DEFAULT '{}',   -- ids de proyectos a los que pertenece la foto (multi-proyecto; sin FK: se valida en la app)
  ADD COLUMN IF NOT EXISTS fuente_id       text,
  ADD COLUMN IF NOT EXISTS fecha_evento    date,
  ADD COLUMN IF NOT EXISTS categoria       text,
  ADD COLUMN IF NOT EXISTS subido_por_id   integer REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS menores         text    NOT NULL DEFAULT 'no',
  ADD COLUMN IF NOT EXISTS visibilidad     text    NOT NULL DEFAULT 'publicable',
  ADD COLUMN IF NOT EXISTS ia_resultado    jsonb;

-- 2. CHECKs (origen se AMPLÍA; no crear una columna paralela)
ALTER TABLE fotos DROP CONSTRAINT IF EXISTS fotos_origen_check;
ALTER TABLE fotos ADD CONSTRAINT fotos_origen_check
  CHECK (origen IN ('admin','evidencia_evento','evento','podcast','asistencia','lider'));
ALTER TABLE fotos ADD CONSTRAINT fotos_menores_check     CHECK (menores IN ('no','si','revisar'));
ALTER TABLE fotos ADD CONSTRAINT fotos_visibilidad_check CHECK (visibilidad IN ('publicable','interna'));
-- Guardia de última línea: una foto con menores / interna NO puede tener ubicaciones públicas.
ALTER TABLE fotos ADD CONSTRAINT fotos_publicable_sin_menores
  CHECK ((menores = 'no' AND visibilidad = 'publicable') OR cardinality(ubicaciones) = 0) NOT VALID;
ALTER TABLE fotos VALIDATE CONSTRAINT fotos_publicable_sin_menores;  -- falla si hay filas que la violan: no forzar, reportar

-- 3. Idempotencia de la ingesta (una foto de una fuente no se duplica)
CREATE UNIQUE INDEX IF NOT EXISTS fotos_fuente_unica ON fotos (origen, fuente_id, url) WHERE fuente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS fotos_ubicaciones_gin ON fotos USING gin (ubicaciones);
CREATE INDEX IF NOT EXISTS fotos_proyectos_gin   ON fotos USING gin (proyectos);
CREATE INDEX IF NOT EXISTS fotos_origen_idx      ON fotos (origen, created DESC);

-- 4. Catálogo de ubicaciones con tope
CREATE TABLE IF NOT EXISTS fotos_ubicaciones (
  slug           text PRIMARY KEY,
  nombre         text    NOT NULL,
  proyecto_id    text    REFERENCES proyectos(id) ON DELETE CASCADE,   -- NULL = global (portada)
  max_fotos      integer NOT NULL CHECK (max_fotos BETWEEN 1 AND 50),
  solo_admin     boolean NOT NULL DEFAULT false,
  auto_origen    text    CHECK (auto_origen IN ('podcast','evento')),  -- relleno automático (opcional)
  auto_cantidad  integer NOT NULL DEFAULT 0 CHECK (auto_cantidad >= 0),
  orden          integer NOT NULL DEFAULT 0,
  activo         boolean NOT NULL DEFAULT true,
  CHECK (auto_cantidad <= max_fotos),
  CHECK (proyecto_id IS NOT NULL OR solo_admin)                        -- una ubicación global exige admin
);
```

Seed (`INSERT ... ON CONFLICT (slug) DO NOTHING`):

| slug | nombre | proyecto_id | max_fotos | solo_admin | auto_origen | auto_cantidad |
|---|---|---|---|---|---|---|
| `portada` | Portada del sitio | NULL | 6 | true | — | 0 |
| `club-ingles` | Club de Inglés (Vinculación) | `vinculacion` | 10 | false | — | 0 |
| `docencia-galeria` | Galería de Docencia Innovadora | `docencia_innovadora` | 8 | false | `podcast` | 2 |
| `redlea-galeria` | Galería RED LEA | `redlea` | 10 | false | — | 0 |
| `internacionalizacion-galeria` | Galería de Internacionalización | `internacionalizacion` | 8 | false | — | 0 |
| `desarrollo-habilidades-galeria` | Galería de Desarrollo de Habilidades | `desarrollo_habilidades` | 8 | false | — | 0 |
| `mentoring-galeria` | Galería de Mentoring | `mentoring` | 8 | false | — | 0 |

Backfill de `proyectos` en las 45 filas existentes (después del seed):
`UPDATE fotos f SET proyectos = ARRAY[u.proyecto_id] FROM fotos_ubicaciones u WHERE cardinality(f.proyectos) = 0 AND u.slug = f.ubicaciones[1] AND u.proyecto_id IS NOT NULL;` (las de `portada` quedan `'{}'`).

Más columnas de WP5b (misma migración, `IF NOT EXISTS`): `ALTER TABLE actividades_difusion ADD COLUMN IF NOT EXISTS proyectos text[] NOT NULL DEFAULT '{}';` y `ALTER TABLE enlaces_difusion ADD COLUMN IF NOT EXISTS proyectos text[] NOT NULL DEFAULT '{}';`. **No** modificar `actividades_difusion.project_id` ni `proyecto`.

**Verificación obligatoria (SELECT, pegar el resultado en el PR):** columnas nuevas presentes; 7 filas en `fotos_ubicaciones`; `SELECT count(*) FROM fotos` = 45 (sin pérdida); `SELECT count(*) FROM fotos WHERE cardinality(ubicaciones)>0 AND (menores<>'no' OR visibilidad<>'publicable')` = 0.

**Rollback** (documentar en el script, comentado): `DROP TABLE fotos_ubicaciones; ALTER TABLE fotos DROP COLUMN ...` (las 8) y restaurar el CHECK original; el respaldo `respaldo_fotos_20260926` permite recuperar.

**Efecto visible al desplegar los topes (avisar al usuario):** Docencia hoy muestra 23 fotos y pasará a 8 (6 manuales + 2 podcast automáticas); RED LEA 13 → 10. Las demás siguen en el banco. Tras el deploy el admin debe **curar** cuáles son las 6/10 (campo `order`, WP8).

---

## WP2 — Capa de datos y permisos (`lib/`)

### `lib/permisosProyecto.ts` (nuevo — base de toda la administración por líderes)

Sin imports de Node/Neon a nivel de módulo; recibe `sql` del handler. Exporta:

```ts
import type { AppSession } from './session';

export const ROLES_GESTORES_PROYECTO = ['lider', 'colider'] as const;

// D1: única definición de "administración del sitio" (hoy equivale a Arturo). Un líder/colíder de proyecto NO entra aquí jamás.
export function puedeAdministrarSitio(usuario: Pick<AppSession, 'modulos_acceso'> | null | undefined): boolean {
  const modulos = usuario?.modulos_acceso ?? [];
  return modulos.includes('contenido_sitio') || modulos.includes('admin') || modulos.includes('superadmin');
}

export interface ProyectoGestionable { id: string; nombre_oficial: string; slug: string | null; rolEnProyecto: 'admin_sitio' | 'lider' | 'colider'; }

// Proyectos que la persona puede gestionar. Admin de sitio → todos los activos; docente → solo donde es lider/colider ACTIVO.
export async function proyectosGestionables(sql: any, usuario: AppSession): Promise<ProyectoGestionable[]>;

export async function puedeGestionarProyecto(sql: any, usuario: AppSession, proyectoId: string): Promise<boolean>;
```

Reglas de implementación:
- Solo docentes: `usuario.rol` ∈ `profesor|admin` (usar `esDocente` de `lib/modulos.ts`). **Estudiante, beneficiario y secretaria → siempre `false`** (aunque figuren en `proyecto_miembros`).
- `usuarioId = Number(usuario.id)` (`AppSession.id` es `string`). Si `Number.isNaN` → `false`.
- Consulta: `SELECT 1 FROM proyecto_miembros WHERE proyecto_id = ${proyectoId} AND usuario_id = ${usuarioId} AND activo AND rol_en_proyecto IN ('lider','colider')`.
- **No** crear un módulo nuevo en `usuarios.modulos_acceso` ni tocar `lib/permisosPertenencia.ts`: la pertenencia se consulta en vivo (evita el desfase de cookie).

### `lib/fotosPublicas.ts` (nuevo)

`obtenerFotosDeUbicacion(sql, slug)`: devuelve el arreglo final que ve el público, **ya con tope y relleno automático**. Reglas exactas:

1. Leer `fotos_ubicaciones` por `slug` con `activo`. Si no existe → **`[]`** (una ubicación desconocida no publica nada).
2. `cupoManual = max_fotos - auto_cantidad`.
3. **Manuales:** `SELECT * FROM fotos WHERE activo AND visibilidad='publicable' AND menores='no' AND ${slug} = ANY(ubicaciones) AND <gate> ORDER BY "order" ASC, created DESC LIMIT cupoManual`.
4. **Automáticas** (si `auto_origen` y `auto_cantidad > 0`): `SELECT * FROM fotos WHERE origen = auto_origen AND activo AND visibilidad='publicable' AND menores='no' AND id NOT IN (manuales) AND <gate> ORDER BY fecha_evento DESC NULLS LAST, created DESC LIMIT auto_cantidad`.
5. Resultado = manuales ++ automáticas (nunca más de `max_fotos`).
6. **`<gate>` (fuente aprobada)** — un helper SQL reutilizable, fragmento único:
   `(origen IN ('admin','evidencia_evento','lider') OR (origen IN ('evento','podcast') AND EXISTS (SELECT 1 FROM actividades_difusion a WHERE a.id::text = fotos.fuente_id AND a.aprobado_sitio = true)) OR (origen = 'asistencia' AND EXISTS (SELECT 1 FROM asistencia_espacio s WHERE s.id::text = fotos.fuente_id AND s.estado_aprobacion = 'aprobado')))`
   Una foto de un evento no aprobado o de una asistencia no aprobada **jamás** sale en la web.

También exportar `fragmentoFuenteAprobada` para reutilizarlo en el listado del admin (WP4).

### `lib/cloudinaryUrl.ts` (nuevo, puro)

`miniaturaCloudinary(url, ancho = 400)`: si `url` contiene `/upload/` inserta `w_${ancho},c_fill,q_auto,f_auto/` justo después; si no, devuelve `url` sin cambios (rutas locales o externas). Nunca lanza.

### `lib/groqVision.ts` (nuevo) — ver WP6.

---

## WP3 — API pública con topes

Archivo existente: `app/api/photos/route.ts`. **Solo cambia el `GET`** (el `POST` se toca en WP4).

- Mantener: `neon(..., { fetchOptions: { cache: 'no-store' } })`, `export const dynamic = 'force-dynamic'`.
- `GET ?ubicacion=X` (sin `all`) → `return NextResponse.json(await obtenerFotosDeUbicacion(sql, X))`. **Misma forma de respuesta** (arreglo de filas de `fotos`) → `PhotoCarousel`, `ActivityGallery`, `EnglishClubSection`, `RedLEAGaleria` **no se modifican** y ganan los topes solos.
- `GET ?all=true`: **deja de ser público**. Hoy lo usa `/admin/photos`; pasa a exigir sesión + `puedeAdministrarSitio` y se reemplaza por `/api/photos/banco` (WP4). Buscar con `grep -rn "photos?all" app components` y migrar cada llamador **en el mismo cambio**; si queda alguno, el admin se rompe.
- `GET` sin `ubicacion` y sin `all` → `[]` (ya no volcar toda la tabla al público).
- Los 4 componentes públicos deben **ocultar su sección si la lista viene vacía** (verificar; si alguno muestra un título vacío, arreglarlo con el cambio mínimo).

---

## WP4 — API de administración (3 rutas nuevas + 2 extendidas)

Todas: `getAppSessionFromCookies()` → 401 si no hay; 403 si `!esDocente(sesion)` (esto rechaza secretaria/estudiante); `export const dynamic = 'force-dynamic'`; `neon()` dentro del handler; errores de constraint (`error.code === '23514'`) → **409** con mensaje claro, no 500.

### 4.1 `GET /api/photos/banco` — `app/api/photos/banco/route.ts` (nueva)

Listado con filtros y paginación. Parámetros (todos opcionales; **validar y acotar**, nunca interpolar): `q` (título/descripcion, `ILIKE` parametrizado), `origen` (uno de los 6 valores), `ubicacion` (slug o `sin_ubicar`), `proyecto` (id o `sin_proyecto` = `cardinality(proyectos)=0`), `desde`/`hasta` (fecha sobre `COALESCE(fecha_evento, created::date)`), `menores` (`no|si|revisar`), `estado` (`publicada|sin_ubicar|oculta`), `page` (≥1), `pageSize` (1–60, por defecto 24). Respuesta: `{ items, total, page, pageSize }`. Cada item incluye `miniatura` (`miniaturaCloudinary`).

**Alcance por rol (crítico para privacidad):**
- `puedeAdministrarSitio` → ve todo, incluido `visibilidad='interna'` y `menores≠'no'` (bandeja de revisión).
- Líder/colíder → agregar `AND proyectos && ${idsDeMisProyectos}::text[] AND visibilidad='publicable' AND menores='no' AND <fragmentoFuenteAprobada>` (`&&` = solapamiento de arreglos). **Nunca** ve fotos internas ni con menores ni de proyectos ajenos ni con `proyectos` vacío.
- Docente sin proyectos → `{ items: [], total: 0 }` (no 403).
- Si `proyecto` pedido no está en sus proyectos → `[]` (no revelar existencia).

Las fotos de `origen IN ('evento','podcast','asistencia')` aparecen **solo si su fuente está aprobada** (mismo `<gate>`), excepto para administración del sitio, que las ve todas con una insignia "fuente sin aprobar".

### 4.2 `POST /api/photos/accion` — `app/api/photos/accion/route.ts` (nueva)

Acciones en lote. Cuerpo: `{ ids: string[] (1–100, únicos), accion, ubicaciones?: string[] }`.

| `accion` | Efecto | Requiere |
|---|---|---|
| `publicar` | Agrega `ubicaciones` (union, sin duplicar) y pone `activo = true` | ver matriz |
| `quitar` | Quita `ubicaciones` de la foto | ver matriz |
| `ocultar` / `mostrar` | `activo = false/true` (sin tocar ubicaciones) | ver matriz |
| `descartar` | `activo = false` y `ubicaciones = '{}'` (sale del sitio; queda en el banco, **no** borra Cloudinary) | ver matriz |
| `marcar_revisada` | Admin: `menores='no'`, `visibilidad='publicable'` | solo `puedeAdministrarSitio` |
| `marcar_interna` | Admin: `menores='si'`, `visibilidad='interna'`, `ubicaciones='{}'`, `activo=false` | solo `puedeAdministrarSitio` |

**Matriz de autorización por foto × ubicación** (implementar como función pura `evaluarAcceso(...)` testeable, en `lib/permisosProyecto.ts` o `lib/fotosPublicas.ts`):

1. Cargar `fotos_ubicaciones` de las `ubicaciones` pedidas; si alguna no existe o `!activo` → 400.
2. `publicar`: **rechazar (409)** si la foto tiene `menores≠'no'` o `visibilidad≠'publicable'` (mensaje: "Foto con menores o interna: no se puede publicar"). Rechazar si su fuente no está aprobada (`<gate>` falso).
3. Ubicación `solo_admin` (portada) → solo `puedeAdministrarSitio`; si no → 403 **para todo el lote** (falla atómica, ver 5).
4. Ubicación con `proyecto_id = P` (columna de `fotos_ubicaciones`) → `puedeAdministrarSitio` **o** (`puedeGestionarProyecto(P)` **y** `P ∈ foto.proyectos`).
5. El líder solo puede operar fotos cuyo arreglo `proyectos` solape con los suyos. Una foto etiquetada `[A,B]` la puede publicar el líder de A en ubicaciones de A (no en las de B salvo que también gestione B). Publicar en una ubicación de un proyecto que no gestiona → 403. Un líder no puede tocar fotos con `proyectos` vacío.
6. `quitar` por líder: solo quita ubicaciones que él gestiona; las ajenas de la misma foto se conservan.

**Atomicidad:** validar **todas** las fotos y ubicaciones primero; si una falla, no se modifica ninguna (responder `{ error, detalle: [{id, motivo}] }`). Ejecutar los `UPDATE` dentro de una transacción (`Pool` + `BEGIN/COMMIT`, patrón de `app/api/espacios/asistencia/route.ts`) o en una sola sentencia `UPDATE ... WHERE id = ANY(...)`. Nunca un bucle de updates sin transacción.

**Respuesta** incluye `avisos` (tope suave): para cada ubicación publicada → `{ slug, publicadas, max_fotos }` con `publicadas` = fotos activas y publicables en esa ubicación tras la operación; la UI muestra "Hay N fotos, el sitio mostrará solo las M primeras" si `publicadas > max_fotos`. **No se rechaza** por tope (decisión: suave).

### 4.3 `GET | PATCH /api/photos/ubicaciones` — `app/api/photos/ubicaciones/route.ts` (nueva)

- `GET`: `{ proyectos: ProyectoGestionable[], ubicaciones: [{ slug, nombre, proyecto_id, max_fotos, solo_admin, auto_origen, auto_cantidad, publicadas }] }` filtrado por alcance (admin → todas; líder → solo ubicaciones de sus proyectos, sin las `solo_admin`). Reemplaza la necesidad de un endpoint "mis proyectos".
- `PATCH { slug, max_fotos?, auto_origen?, auto_cantidad?, activo? }`: **solo `puedeAdministrarSitio`**. Validar `max_fotos` 1–50 y `auto_cantidad ≤ max_fotos`. Los líderes **no** editan topes.

### 4.4 Extender `POST /api/photos` (crear) y `PATCH /api/photos/[id]`

- `POST` hoy exige `contenido_sitio`. Nuevo: `puedeAdministrarSitio` **o** líder con `proyectos` (cuerpo, arreglo) ⊆ sus proyectos. El líder **debe** enviar `proyectos` (≥1) y solo `ubicaciones` de esos proyectos; el servidor **ignora** cualquier `origen`/`menores`/`visibilidad` que envíe el cliente: fuerza `origen='lider'` (o `'admin'` si es admin), `menores='no'`, `visibilidad='publicable'`, `subido_por` = email de sesión, `subido_por_id = Number(sesion.id)`. Si el cliente declara `hay_menores = true` → guardar `menores='si'`, `visibilidad='interna'`, `ubicaciones=[]`, `activo=false`. Pasar la foto por Groq (WP6) antes de aceptarla como `no`.
- `PATCH /api/photos/[id]`: conserva el atajo de un solo campo `activo`; agrega edición de `titulo`, `descripcion`, `posicion` (0–100), `order`, y —solo admin— `proyectos` (reasignar). Autorización por foto igual que 4.2.
- `DELETE /api/photos/[id]`: **sigue solo `puedeAdministrarSitio`** (borra en Cloudinary). Los líderes usan `descartar`.

---

## WP5 — Declaración de menores e ingesta al banco

**Regla común de ingesta** (helper `lib/ingestaFotos.ts`, función `registrarFotoEnBanco(sql, datos)`): inserta con `ON CONFLICT (origen, fuente_id, url) WHERE fuente_id IS NOT NULL DO NOTHING`; valores por defecto: `activo = true`, `ubicaciones = '{}'` (sin ubicar), `posicion = 50`, `"order" = 0`. Si `hayMenores` → `menores='si'`, `visibilidad='interna'`, `activo=false`. Si es externo (D4) → `menores='revisar'`, `visibilidad='interna'`. **Una falla de ingesta jamás debe hacer fallar el registro principal** (asistencia/evento): envolver en `try/catch`, registrar `console.error` y continuar.

### 5.1 Asistencia — `app/api/espacios/asistencia/route.ts`

- Cuerpo nuevo: `hay_menores: boolean` (si falta → `false`). El formulario (`app/vinculacion/asistencia/page.tsx`) agrega la casilla **"¿Aparecen menores de edad en la foto?"** (No por defecto, con texto de ayuda: "Si marcas Sí, la foto solo la verá el supervisor y no se publicará").
- El handler ya usa transacción (`INSERT INTO asistencia_espacio ... foto_url, foto_public_id`). Obtener el `id` con `RETURNING id` y llamar a `registrarFotoEnBanco` **después del `COMMIT`** con: `origen='asistencia'`, `fuente_id = String(idAsistencia)`, `url = foto_url`, `cloudinary_public_id = foto_public_id`, `subido_por_id = Number(usuario.id)`, `fecha_evento = fecha`, `proyectos = ARRAY['vinculacion']` (todos los espacios son `area='vinculacion'`; en asistencia el proyecto es fijo, no se elige).
- No se altera el flujo de aprobación de asistencia. El `<gate>` (WP2) impide publicar hasta que el supervisor apruebe.
- **No** agregar columna `hay_menores` a `asistencia_espacio` (la verdad vive en `fotos.menores`).

### 5.2 Eventos y podcasts — `app/api/difusion/route.ts`

- Hoy hace `INSERT INTO actividades_difusion ...` **sin** `RETURNING id`. Agregar `RETURNING id`.
- Cuerpo nuevo: `hay_menores: boolean` (default `false`). Casilla en `/vinculacion/difusion`, `/gestion-carrera` y `/vinculacion/publico-difusion/[token]` (mismo texto que 5.1).
- Después del insert: si hay `evidencia_url`:
  - `tipo = 'podcast'` → `origen='podcast'`; **conservar** la línea `const photos = evidencia_url && tipo !== 'podcast' ? [...] : []` (NewsSection depende de ella; no tocar).
  - otros tipos → `origen='evento'`.
  - `fuente_id = String(id)`, `fecha_evento = fecha`, `categoria = categoria`, `subido_por_id = registrador_id`.
  - `proyectos`: **copiar los `proyectos` ya validados de la actividad** (WP5b). No recalcular ni adivinar.

### 5.3 Enlaces temporales de externos — `app/api/enlaces-difusion/[token]/route.ts` (POST)

Misma ingesta que 5.2 pero **siempre** `menores='revisar'`, `visibilidad='interna'` (D4), `subido_por_id = NULL`.

### 5.4 Subida directa del líder/admin
Cubierta en 4.4 (`POST /api/photos`).

---

## WP5b — Asignación de proyectos al subir (eventos, podcasts, enlaces QR)

**Regla del usuario:** al subir un evento o podcast **se debe escoger a qué proyecto(s) pertenece**; los proyectos elegibles dependen de **quién lo sube o quién genera el QR**; solo administración del sitio (D1) puede asignar cualquier proyecto.

### 5b.1 Quién puede asignar qué — `proyectosAsignables(sql, usuario)` en `lib/permisosProyecto.ts`

| Quién | Proyectos que puede asignar |
|---|---|
| Administración del sitio (`puedeAdministrarSitio`) | **Todos** los `proyectos.activo = true` |
| Docente (`rol` `profesor`/`admin`) | Solo los de `proyecto_miembros` donde **está activo, con cualquier rol** (líder, colíder, supervisor, vinculación, participante). Quien no es miembro de ninguno → lista vacía |
| Estudiante-instructor (pasante) | **Eventos:** `['vinculacion']`. **Podcasts:** `['vinculacion','internacionalizacion']` (D5). Fijos, sin selector; solo si es instructor de algún espacio (`espacio_instructores`) |
| Secretaria / beneficiario | Ninguno (403 en las APIs) |
| **Externo con enlace temporal** | **No elige**: usa los `proyectos` fijados por quien generó el enlace |

Devuelve `{ id, nombre_oficial }[]`. Misma disciplina que WP2: consulta en Neon en cada petición, `Number(usuario.id)`, `sql` inyectado.

### 5b.2 Migración (ya incluida en WP1)
`actividades_difusion.proyectos text[]` y `enlaces_difusion.proyectos text[]` (NOT NULL DEFAULT `'{}'`). **No** tocar `project_id` ni `proyecto` (los informes leen `proyecto`).

### 5b.3 API
- **`GET /api/proyectos?asignables=1`** — se agrega al `route.ts` existente (**no crear ruta nueva**). Exige sesión; devuelve `proyectosAsignables`. Leer el `GET` actual completo: hoy sirve el nav público y `?all=true`; el nuevo parámetro es una rama **antes** de los demás y **no altera** su comportamiento público.
- **Validación en el servidor (obligatoria; el cliente no es confiable)** — una sola función `validarProyectosAsignables(sql, usuario, proyectosPedidos)`: ≥1 proyecto, sin repetidos, todos existen y están activos, y `⊆ proyectosAsignables(usuario)`. Fallo → **400** (vacío/inexistente) o **403** ("No puedes asignar el proyecto X"). Se aplica en:
  - `POST /api/difusion` → guarda en `actividades_difusion.proyectos` (columna nueva) **y** sigue escribiendo `proyecto`/`categoria` como hoy.
  - `POST /api/videos` y `lib/registrarVideoPropuesto.ts` → los proyectos que **elige el usuario** se validan; la regla vigente (Sesión 38) que **añade `internacionalizacion` automáticamente** a `videos.proyecto_id[]` la agrega el servidor y **no** se valida contra los asignables.
  - `POST /api/enlaces-difusion` (generar QR) → requiere `proyectos` (≥1, validados contra los asignables **del generador**); se guardan en `enlaces_difusion.proyectos`.
  - `POST /api/enlaces-difusion/[token]` (público, externo) → **ignora cualquier `proyectos` del cuerpo** y usa los del enlace; los copia a `actividades_difusion.proyectos`.
  - `POST /api/espacios/asistencia` → no elige (fijo `['vinculacion']`).
- Administración del sitio pasa la validación con cualquier proyecto activo (no hay atajo distinto: `proyectosAsignables` ya devuelve todos).

### 5b.4 UI
- Componente nuevo **`components/SelectorProyectosEvento.tsx`**: checklist multi-selección alimentada por `GET /api/proyectos?asignables=1`; obligatorio ≥1; si solo hay uno, aparece marcado y bloqueado con la etiqueta; si hay cero, mensaje "No perteneces a ningún proyecto: pide a un administrador que te asigne" y **botón de envío deshabilitado**. Español fijo (portal).
- Usarlo en: `/vinculacion/difusion`, `/gestion-carrera`, `components/EnlaceDifusionModal.tsx` (al generar el QR) y `/portal/subir-video`. En los formularios de **podcast** que ya usan `SelectorAreaProyectoPodcast`, convivir: el selector de área/proyecto existente define el proyecto principal del podcast; este componente **no lo reemplaza**, lo complementa solo donde el formulario no tenía selección (eventos). Leer ambos formularios completos antes de tocarlos y **no duplicar claves en el `useState`**.
- `/vinculacion/publico-difusion/[token]`: **sin selector** (los proyectos ya vienen del enlace); mostrar en modo lectura "Este registro se asociará a: …".

### 5b.5 Efecto en fotos
La ingesta (WP5.2/5.3) copia `actividades_difusion.proyectos` a `fotos.proyectos`. Es lo que permite que el líder vea en su banco las fotos de eventos de su proyecto.

### 5b.6 Datos históricos
`actividades_difusion.proyectos = '{}'` salvo las filas con `categoria = 'vinculacion'` (→ `['vinculacion']`). Las demás quedan "sin proyecto": solo administración las ve y las asigna desde el modal de edición (WP8).

---

## WP6 — Groq visión (respaldo, nunca decisión única)

Archivo `lib/groqVision.ts` (mismo estilo que `lib/groqAudio.ts`: `GROQ_API_KEY`, `fetch`, errores tipados):

```ts
export type VeredictoMenores = 'no' | 'si' | 'dudoso';
export async function analizarMenoresEnFoto(urlImagen: string): Promise<{ veredicto: VeredictoMenores; personas: number } | null>;
```

- Endpoint: `https://api.groq.com/openai/v1/chat/completions`, modelo `process.env.GROQ_VISION_MODEL` (D3: verificar el nombre vigente en la doc de Groq; no inventarlo), `response_format: { type: 'json_object' }`, `temperature: 0`, `AbortController` con **timeout 10 s**.
- Enviar la imagen **reducida**: `urlImagen` con transformación `w_800,q_auto` (Cloudinary). No enviar nombres ni metadatos de personas.
- Prompt fijo (en español, en una constante): pedir **solo** JSON `{"veredicto":"no|si|dudoso","personas":<entero>}` sobre si en la imagen aparecen personas que parezcan menores de 18 años; ante duda, `dudoso`.
- **Nunca lanza hacia el llamador:** timeout, error HTTP, JSON inválido o `GROQ_API_KEY` ausente → devuelve `null`.
- Uso (dentro de `registrarFotoEnBanco`, después de insertar, en segundo plano dentro del mismo request con `await` acotado por el timeout): guardar el resultado en `ia_resultado` (jsonb). Si `veredicto` ∈ (`si`,`dudoso`) → `menores='revisar'`, `visibilidad='interna'`, `ubicaciones='{}'`, `activo=false`. Si `null` (Groq caído) → **no bloquear**: queda como declaró el estudiante y `ia_resultado = {"error": true}`.
- **Jamás degradar** una declaración `si` del estudiante por un veredicto `no` de la IA.
- Advertir en el PR: las imágenes se envían a un tercero (Groq). Es una decisión que propuso el usuario; documentarla en `CLAUDE.md` (sección de la sesión).

---

## WP7 — Backfill (Cloudinary + registro de lo existente)

Archivo: `scripts/backfill-fotos-banco.js` (Node, `--env-file=.env.local`). **Modo por defecto = simulación** (imprime qué haría, no escribe); se aplica solo con `--aplicar`. Reintentable sin duplicar.

1. **Respaldo** ya creado en WP1. Comprobar que existe.
2. **Reunir fuentes** (una consulta por fuente; conservar la URL original como clave de deduplicación):
   a. `fotos` con `url` que empiece por `/` (locales) o no sea Cloudinary.
   b. `actividades_difusion.photos` (`unnest`) — origen `noticia`/`actividad`/`difusion` (12+~11 fotos): ver §0, muchas ya están en `fotos` (las 23 de Docencia, migradas en la Sesión 36) → **saltar si `fotos.url` = URL original**.
   c. `actividades_difusion.evidencia_url` de filas `origen IN ('difusion','externo_temporal')` (fotos de eventos/podcasts de pasantes).
   d. `asistencia_espacio.foto_url` (22 filas).
3. **Subir a Cloudinary cada archivo local UNA sola vez** (mapa `rutaLocal → {secure_url, public_id}` en memoria; carpeta `pine_project_uploads/legado`; leer de `public/` con `path.join(process.cwd(), 'public', ruta)`). Si el archivo **no existe** o pesa > 10 MB → registrar en el reporte y **continuar** (jamás abortar). Pausa breve entre subidas. **No borrar** los archivos de `public/images`.
4. **Actualizar** `fotos.url` y `cloudinary_public_id` de las filas locales existentes (conservan `ubicaciones`, `order`, `activo`, `posicion`).
5. **Insertar en `fotos`** (con `registrarFotoEnBanco`/SQL equivalente e `ON CONFLICT DO NOTHING`):
   - (b)/(c) → `origen='evento'` (o `'podcast'` si `tipo='podcast'`), `ubicaciones='{}'`, `activo=true`, `menores='no'`, `proyectos = '{}'` salvo `categoria = 'vinculacion'` → `ARRAY['vinculacion']` (y en `actividades_difusion.proyectos` lo mismo), `fuente_id = actividades_difusion.id::text`, `fecha_evento = fecha`.
   - (d) asistencia → `origen='asistencia'`, `fuente_id = asistencia_espacio.id::text`, `menores='revisar'`, `visibilidad='interna'`, `activo=false`, `ubicaciones='{}'`, `proyectos=ARRAY['vinculacion']`, `subido_por_id = registrado_por`. **Decisión del usuario:** quedan en la bandeja de revisión.
6. **Las ubicaciones ya publicadas se conservan** (no reasignar). Lo que hoy no aparece en ninguna página queda "sin ubicar".
7. **Reporte final** (imprimir y pegar en el PR): filas insertadas por origen; archivos locales subidos; archivos faltantes; duplicados omitidos; `SELECT count(*)` por `origen` y por `menores`. Verificar que `count(*) FROM fotos WHERE cardinality(ubicaciones)>0` **no cambió** respecto a antes del backfill.
8. Los `actividades_difusion.photos[]` **no se tocan** (`NewsSection`/`lib/db.ts:getNewsletters()` siguen leyéndolos).

---

## WP8 — UI: `/admin/photos` reescrito con componente compartido

Componente único: **`components/fotos/BancoFotos.tsx`** (`'use client'`), props `{ modo: 'admin' | 'lider'; proyectoId?: string }`. Lo usan `/admin/photos` (WP8) y el panel del líder (WP9): **no duplicar código**. Antes de escribir, leer `app/admin/photos/page.tsx` (416 líneas) y **reutilizar** su formulario de subida, el slider de `posicion` con vista previa en vivo y la subida vía `/api/upload` → `POST /api/photos`.

Contenido:
1. **Barra de cupos** (de `GET /api/photos/ubicaciones`): una ficha por ubicación con `publicadas / max_fotos` (rojo si excede; texto "El sitio muestra solo las {max} primeras").
2. **Filtros** (mapean 1:1 a `GET /api/photos/banco`): búsqueda, origen, ubicación (incluye "Sin ubicar"), proyecto (multi-proyecto), rango de fechas, menores, estado. Estado en la URL (`useSearchParams`) para poder compartir/recargar. Paginación (24 por página).
3. **Cuadrícula** de miniaturas (`<img loading="lazy">` con `miniaturaCloudinary`, **no** `next/image` con dominios nuevos sin configurar `next.config.js`). Cada tarjeta: insignias de origen, proyecto, ubicaciones, `menores` (rojo si `si`/`revisar`), "fuente sin aprobar" (solo admin), casilla de selección.
4. **Barra de acciones en lote** (visible con ≥1 seleccionada): **Publicar en…** (checklist de ubicaciones **filtrada a las que el usuario puede usar**; las `solo_admin` no aparecen para líderes), **Quitar de…**, **Ocultar/Mostrar**, **Descartar**. Tras publicar, mostrar los `avisos` de tope. Confirmación explícita antes de `descartar`.
5. **Fotos con menores** (`menores≠'no'`): la casilla "Publicar en…" **deshabilitada** con texto "Con menores: no publicable". Solo admin ve **Marcar como revisada** (sin menores) y **Marcar como interna**.
6. **Edición de una foto** (modal): título, descripción, `posicion` (slider), `order` (número: orden dentro de la ubicación), proyectos (selector múltiple, solo admin). Explicar en la UI que el sitio muestra primero las de menor `order`.
7. **Subida directa:** admin elige uno o más proyectos (o ninguno: queda sin proyecto); líder con sus proyectos (checklist limitado a los suyos, mínimo 1). Casilla "¿Aparecen menores de edad?" obligatoria en el formulario de subida.
8. Estados: cargando, vacío ("No hay fotos con estos filtros"), error con botón reintentar. Sin `alert()` bloqueantes para éxitos.
9. `app/admin/photos/page.tsx` queda como delgado wrapper: `<BancoFotos modo="admin" />`. Mantener el gate existente (`contenido_sitio` por `/admin/*` en middleware).

Accesibilidad mínima: botones con `aria-label`, contraste, selección por teclado.

---

## WP9 — Panel del líder + galerías de proyecto (Fase B)

### 9.1 Rutas y navegación
- Páginas nuevas (no agregan funciones serverless):
  - `app/portal/proyecto/page.tsx` — lista los proyectos gestionables (de `GET /api/photos/ubicaciones`); si hay exactamente uno, redirige a su panel.
  - `app/portal/proyecto/[proyectoId]/page.tsx` — panel del proyecto (por ahora una sola sección: **Fotos**; **no** mostrar pestañas vacías "próximamente").
  - `app/portal/proyecto/[proyectoId]/fotos/page.tsx` — `<BancoFotos modo="lider" proyectoId={...} />`.
- **`middleware.ts`:** agregar `'/portal/proyecto'` a `protectedRoutes` (leer el archivo completo primero; no reordenar). La secretaria ya queda denegada por defecto (`RUTAS_SECRETARIA`). Además, cada página valida en cliente contra `GET /api/photos/ubicaciones` y muestra "No tienes permiso para este proyecto" si `proyectoId` no está en `proyectos[]` (la barrera real es la API).
- **`app/portal/dashboard/page.tsx`:** la tarjeta "Gestionar {proyecto}" (hoy arma el nombre desde el equipo, commit `c53d899`; **leer el estado actual antes de editar**) debe enlazar a `/portal/proyecto/[id]/fotos`. Un líder de varios proyectos (Verónica: `docencia_innovadora` y `mentoring`; Arturo) debe ver una tarjeta por proyecto o un enlace a `/portal/proyecto`. Administración del sitio puede seguir usando `/admin/photos`.
- **No** crear un módulo `modulos_acceso` nuevo ni tocar `/admin/roles`.

### 9.2 Galerías nuevas en páginas públicas
Crear `components/GaleriaProyecto.tsx` (cliente): props `{ ubicacion: string; titleKey: string }`; hace `fetch('/api/photos?ubicacion=…')`, **no renderiza nada si la lista está vacía**, reutiliza el diseño de `ActivityGallery`/`EnglishClubSection` (leerlos antes). Textos con `t('…')`: agregar en `lib/i18n.tsx` (ES **y** EN) una clave de título por galería (`t.gallery.internacionalizacion`, `t.gallery.desarrolloHabilidades`, `t.gallery.mentoring`, …). Insertarla en:
- `app/investigacion/proyecto-innovacion/page.tsx` → `internacionalizacion-galeria`
- `app/investigacion/desarrollo-habilidades/page.tsx` → `desarrollo-habilidades-galeria`
- `app/investigacion/mentoring/page.tsx` → `mentoring-galeria`
- `app/proyectos/[slug]/page.tsx` (plantilla simple) → `${proyecto.id}-galeria` **solo si esa ubicación existe** (ver 9.3).
Docencia (`ActivityGallery`), RED LEA y Club **no se tocan**: ya leen su ubicación.

### 9.3 Proyectos nuevos creados desde `/admin/proyectos`
En `POST /api/proyectos` (crear proyecto `plantilla_simple`), insertar en la misma transacción una fila `fotos_ubicaciones` (`slug = <id>-galeria`, `proyecto_id = <id>`, `max_fotos = 8`, `solo_admin = false`). Leer `app/api/proyectos/route.ts` completo antes; cambio mínimo.

---

## WP10 — Notificaciones

Leer `lib/notificaciones.ts` y `NOTIFICACIONES.md` completos y seguir su checklist. Reglas **derivadas** (conteos en vivo, sin tabla nueva), agregadas al final de `REGLAS_NOTIFICACION`:
1. `fotos-menores-por-revisar` — audiencia: `puedeAdministrarSitio`. Cuenta `fotos WHERE menores='revisar'`. `href: '/admin/photos?menores=revisar'`. Severidad `pendiente`.
2. `fotos-sin-ubicar-proyecto` — audiencia: líder/colíder por proyecto. Cuenta fotos con `proyectos && <ids del proyecto>`, `publicable`, `menores='no'`, `cardinality(ubicaciones)=0`, fuente aprobada, creadas en los últimos 14 días. `href: '/portal/proyecto/<id>/fotos?estado=sin_ubicar'`. Severidad `info`.
Cada `aplica()` debe ser **la misma condición** que protege la pantalla destino. Agregar las filas correspondientes a `NOTIFICACIONES.md`.

---

## WP11 — Pruebas, documentación, despliegue

### 11.1 Pruebas de permisos (obligatorias, contra `npm run dev` con la Neon real)
Usar `scripts/_lib-sign-session.mjs` (firma cookies sin contraseña; ver `scratch/test-roles.mjs` como referencia local, está en `.gitignore`). Escribir `scripts/test-fotos-permisos.mjs`. **Crear filas de prueba con id `foto_test_*`, `proyecto_id` real, y borrarlas al final (`DELETE ... WHERE id LIKE 'foto_test_%'`); nunca tocar filas reales.** Matriz mínima (códigos esperados):

| Actor | Acción | Esperado |
|---|---|---|
| Anónimo | `GET /api/photos/banco`, `POST /api/photos/accion` | 401 |
| Secretaria | ambas | 403 |
| Estudiante/pasante | ambas | 403 |
| Líder Verónica (id 20) | publicar foto de `docencia_innovadora` en `docencia-galeria` | 200 |
| Líder Verónica | publicar en `redlea-galeria` (proyecto ajeno) | 403 |
| Líder Verónica | publicar en `portada` | 403 |
| Colíder Cristina (id 14) | publicar foto de `desarrollo_habilidades` en `desarrollo-habilidades-galeria` | 200 |
| Participante de un proyecto (no líder) | publicar | 403 |
| Líder | publicar foto con `menores='revisar'` | 409 |
| Líder | `GET /api/photos/banco` | nunca devuelve filas `interna`, `menores≠no`, `proyectos` vacío ni de otro proyecto |
| Admin de sitio | publicar en `portada`; `marcar_revisada` | 200 |
| Admin de sitio | lote de 3 ids con 1 inválido | 4xx y **ninguna** foto modificada (atomicidad) |
| Docente Cristina (miembro de `desarrollo_habilidades` e `internacionalizacion`) | `POST /api/difusion` con `proyectos: ['redlea']` | 403 |
| Docente Cristina | `POST /api/difusion` con `proyectos: ['desarrollo_habilidades']` | 200 |
| Docente sin proyectos | `POST /api/difusion` | 400/403 y `GET /api/proyectos?asignables=1` = `[]` |
| Admin de sitio | `POST /api/difusion` con `proyectos: ['redlea','mentoring']` | 200 |
| Docente | generar QR con proyecto ajeno | 403; con proyecto propio → 200 |
| Externo (sin sesión) | `POST /api/enlaces-difusion/[token]` enviando `proyectos: ['redlea']` distinto al del enlace | 200 pero se guarda el proyecto **del enlace**, no el del cuerpo |
| Pasante | evento con `proyectos: ['mentoring']` | 403 (solo `['vinculacion']`, y el servidor lo fija aunque el cuerpo diga otra cosa) |
| Pasante | podcast | queda con `['vinculacion','internacionalizacion']` en `actividades_difusion.proyectos`, `videos.proyecto_id` y en la foto |
| **Jhonny (id 13: colíder Internacionalización + líder RED LEA)** | publicar foto de `internacionalizacion` en `internacionalizacion-galeria` y de `redlea` en `redlea-galeria` | 200 |
| Jhonny | publicar en `portada`, `docencia-galeria` o `club-ingles` | 403 |
| Jhonny | abrir `/admin/photos` y `/admin/*` | redirige a `/portal/login` (sin `contenido_sitio`) |
| Jhonny | `GET /api/photos/banco` | solo fotos con `proyectos` que incluyan `internacionalizacion` o `redlea` |
| Jhonny | abrir `/investigacion/informes` y `/investigacion/espacios` | redirige (`investigacion` excluido, D2) |
| Pasante podcast: foto | visible en el banco de | Arturo, Jhonny (colíder Internacionalización), Cintya (Vinculación) |
| Público (sin sesión) | `GET /api/photos?ubicacion=docencia-galeria` con 12 fotos publicadas | ≤ 8 filas (6 manuales + 2 podcast) |
| Público | `GET /api/photos?ubicacion=inexistente` | `[]` |
| SQL directo | `UPDATE fotos SET ubicaciones='{portada}' WHERE menores='revisar'` | error `23514` (CHECK) |

Probar también **con "Ver como"** (suplantar a Verónica desde Arturo): debe comportarse como Verónica, no como Arturo.

### 11.2 Verificación por fase
`npx tsc --noEmit` limpio; `npm run build` completo (sin `DATABASE_URL` de relleno, ver regla 4); `grep` de conflictos y archivos vacíos (regla 3); SELECT post-migración (WP1) y reporte de backfill (WP7) pegados en el PR; revisión visual real en el navegador (Docencia con ≤8 fotos, portada con ≤6, panel del líder con su proyecto); `list_deployments` → `READY`.

### 11.3 Documentación (misma entrega)
- `CLAUDE.md` y `ANTIGRAVITY.md`: nueva sección de sesión con: tablas/columnas nuevas, `fotos_ubicaciones`, reglas de menores (incl. envío a Groq), `lib/permisosProyecto.ts`, ruta `/portal/proyecto/...`, topes, y la instrucción de que **toda función nueva por proyecto usa `puedeGestionarProyecto`**. Actualizar la fila `fotos` de la tabla "Tablas Neon" y agregar `fotos_ubicaciones`.
- `NOTIFICACIONES.md` (WP10). `MANUAL_USUARIO.md`: sección "Administrar las fotos de tu proyecto (líderes)" y "Declarar menores al subir fotos (pasantes)".
- `.env.local.example`: `GROQ_VISION_MODEL`.

---

## 12. Hoja de ruta (NO implementar ahora — pero no bloquearla)

La meta es que cada líder administre **todos** los datos de su proyecto. Esta entrega deja la infraestructura; las siguientes entregas reutilizan `puedeGestionarProyecto` y el espacio `/portal/proyecto/[proyectoId]/…`:

| Entrega futura | Base ya lista / trabajo pendiente |
|---|---|
| Texto del proyecto (hero, integración, info, contacto) | Columnas `proyectos.hero_*`, `integration_text_*`, `info_text_*` existen; hoy `PATCH /api/proyectos/[slug]` es solo `contenido_sitio`. Abrirlo al líder **solo de su proyecto** y solo a esos campos. Proyectos `personalizada` tienen secciones con código propio: el líder solo edita lo que la BD controla. |
| Equipo del proyecto | `proyecto_miembros` + `/admin/members`. Un líder gestiona miembros **de su proyecto** (no roles de otros proyectos ni `modulos_acceso`). Cuidado: `lib/permisosPertenencia.ts` deriva módulos del rol en el proyecto → un líder no debe poder ascender a otro a líder de Vinculación. |
| Noticias, actividades y podcasts de su proyecto | Tras WP5b ya existe `actividades_difusion.proyectos[]` (obligatorio al registrar) y `videos.proyecto_id[]`: el líder aprueba/oculta lo de su proyecto; `contenido_sitio` sigue siendo la moderación global. |
| Publicaciones por proyecto | `publications` no tiene columna de proyecto: requiere migración. |
| Tope y galerías editables por líder | Hoy solo admin edita `fotos_ubicaciones`. |

Regla para esas entregas: **el permiso siempre se calcula en el servidor, por proyecto, consultando `proyecto_miembros`**; nunca por email hardcodeado ni solo por la cookie.

---

## 13. Riesgos conocidos y mitigaciones

| Riesgo | Mitigación en este plan |
|---|---|
| Foto con menores publicada por error | Tres barreras: (1) declaración del estudiante, (2) Groq como respaldo, (3) `CHECK fotos_publicable_sin_menores` en BD + filtro en `GET` público + validación en la API. |
| Groq falla o es lento | `analizarMenoresEnFoto` devuelve `null`, nunca bloquea el registro; queda con la declaración del estudiante. |
| Líder ve/publica fotos ajenas | Alcance por `proyectos` (solape de arreglos) en cada consulta y en cada acción; pruebas 11.1; permisos consultados en Neon, no en la cookie. |
| Docencia baja de 23 a 8 fotos al desplegar | Avisado (WP1); el admin cura el `order` inmediatamente. Tope suave: nada se borra. |
| Backfill duplica o pierde fotos | Simulación por defecto, `ON CONFLICT DO NOTHING`, respaldo `respaldo_fotos_20260926`, reporte con conteos. |
| Exceso de funciones Vercel | Solo 3 rutas nuevas (`banco`, `accion`, `ubicaciones`); el resto son páginas y extensiones. |
| Antigravity introduce conflictos / archivos vacíos / claves duplicadas | Reglas 1–3 y 10; rama propia; `grep` y `find` antes de cada commit. |
| RED LEA sin líder | Resuelto (D2): Jhonny es líder desde 2026-09-26. |
| Jhonny hereda `investigacion` si se restaura el cableado de permisos | Ya excluido en `usuarios.modulos_excluidos` (D2); el panel de fotos no depende de `modulos_acceso`. |
| `GET /api/photos?all=true` deja de ser público | WP3 exige migrar todos los llamadores en el mismo cambio (`grep`). |

---

## 14. Checklist de cierre (marcar antes de pedir el merge)

- [ ] Rama `feat/admin-lideres-fotos`; nada commiteado en `main`.
- [ ] WP1 aplicado en Neon con SELECT de verificación; respaldo existente.
- [ ] `tsc` y `build` limpios; sin conflictos ni archivos de 0 bytes.
- [ ] Los 4 componentes públicos ocultan su sección con lista vacía.
- [ ] Matriz 11.1 completa en verde (incluye "Ver como").
- [ ] Backfill: reporte pegado; conteo de fotos ubicadas sin cambios.
- [ ] Fotos de asistencia previas en `menores='revisar'`/`interna` (22).
- [ ] WP5b: validación de proyectos asignables en `difusion`, `videos`, `enlaces-difusion` (+ público) y selector en los 4 formularios.
- [x] D2 **hecho** el 2026-09-26 por SQL (Jhonny líder de RED LEA + `investigacion` excluido). En WP0 solo se verifica con el SELECT de D2; Jhonny sin acceso a `/admin/*`.
- [ ] H1 anotado en el PR (cableado de permisos por pertenencia sigue revertido; no restaurarlo aquí).
- [ ] Notificaciones (WP10) + `NOTIFICACIONES.md`.
- [ ] Documentación (§11.3).
- [ ] Deploy en `READY` y revisión visual en producción.

---

## 15. Registro de ejecución (Antigravity y Claude)

> Cada sesión de Antigravity documenta aquí lo que ejecutó, los resultados reales de la BD y los archivos tocados. **No editar a mano.**

---

### Sesión 2026-09-25 — WP0 a WP4 + correcciones al plan

**Rama:** `feat/admin-lideres-fotos` (creada desde `main` @ `0767d11`)
**Commit:** `b9bacdb`
**TSC:** limpio (0 errores) antes del commit.

#### Correcciones aplicadas al plan antes de ejecutar

| # | Corrección | Sección |
|---|---|---|
| 1 | **WP6 eliminado** — detección de menores exclusivamente humana. Sin Groq, sin `lib/groqVision.ts`, sin columna `ia_resultado`, sin `GROQ_VISION_MODEL`. Tres capas sustitutas: declaración del estudiante + bandeja de revisión admin + `CHECK fotos_publicable_sin_menores`. | §2, WP6, WP5, WP4.4, §13, §14 |
| 2 | **SELECT pre-VALIDATE obligatorio** — antes de `VALIDATE CONSTRAINT fotos_publicable_sin_menores`, el script ejecuta `SELECT id FROM fotos WHERE menores <> 'no' AND cardinality(ubicaciones) > 0` y aborta si hay filas. Resultado real: **0 filas** → safe. | WP1 |
| 3 | **Atomicidad con `Pool`** — documentada con ejemplo de código completo (`BEGIN/COMMIT/ROLLBACK/release`). Explicación de por qué `neon()` solo no admite transacciones multi-statement. | WP4.2 |

#### WP0 — Preparación y auditoría

- `git fetch` + `git log` ejecutados. Último commit en `main`: `0767d11`.
- Rama `feat/admin-lideres-fotos` creada correctamente. Verificado con `git branch --show-current`.
- Archivos clave leídos completos antes de editar: `middleware.ts`, `lib/session.ts`, `lib/modulos.ts`, `app/api/photos/route.ts`, `app/admin/photos/page.tsx` (línea 58: único llamador de `?all=true`).
- Scripts existentes revisados para usar el patrón correcto (`migrate-topes-horas.js` como plantilla).

#### WP1 — Migración de BD (aplicada en Neon `dark-feather-21824720`)

Script: [`scripts/migrate-fotos-banco.js`](../scripts/migrate-fotos-banco.js)

**Resultado real del script:**
```
[0] respaldo_fotos_20260926 → 45 filas
[1] Columnas añadidas (idempotente)
[2.pre] 0 filas violadoras → VALIDATE safe
[2] Constraints OK (fotos_origen_check ampliado, fotos_menores_check, fotos_visibilidad_check, fotos_publicable_sin_menores)
[3] Índices: fotos_fuente_unica, fotos_ubicaciones_gin, fotos_proyectos_gin, fotos_origen_idx
[4] fotos_ubicaciones: 7 filas (portada, club-ingles, docencia-galeria, redlea-galeria, internacionalizacion-galeria, desarrollo-habilidades-galeria, mentoring-galeria)
[5] Backfill fotos.proyectos OK
[6] actividades_difusion.proyectos añadida; enlaces_difusion.proyectos añadida
[7] fotos.count = 45 ✅ | fotos violadoras = 0 ✅ | fotos_ubicaciones = 7 ✅
    columnas nuevas: categoria, fecha_evento, fuente_id, menores, proyectos, subido_por_id, visibilidad
```

**Columnas NO creadas (WP6 eliminado):** `ia_resultado` ← no existe, no crear.

**Aviso de contenido para Arturo:** Docencia Innovadora pasará de mostrar hasta 23 fotos → máximo 8 (6 manuales + 2 podcast automáticas). RED LEA: 13 → máximo 10. Curar el campo `order` inmediatamente después del deploy.

#### WP2 — Capa de datos y permisos (`lib/`)

| Archivo | Descripción |
|---|---|
| [`lib/permisosProyecto.ts`](../lib/permisosProyecto.ts) | `puedeAdministrarSitio` (D1), `proyectosGestionables`, `puedeGestionarProyecto`, `proyectosAsignables`, `validarProyectosAsignables`. Siempre consulta Neon en cada petición. |
| [`lib/fotosPublicas.ts`](../lib/fotosPublicas.ts) | `obtenerFotosDeUbicacion` (con topes + gate de fuente aprobada + auto-fill), `fragmentoFuenteAprobada`. |
| [`lib/cloudinaryUrl.ts`](../lib/cloudinaryUrl.ts) | `miniaturaCloudinary(url, ancho)` — puro, sin deps. |
| [`lib/ingestaFotos.ts`](../lib/ingestaFotos.ts) | `registrarFotoEnBanco` — idempotente con `ON CONFLICT DO NOTHING`, manejo de menores humano-only, nunca lanza hacia el llamador. |

#### WP3 — API pública con topes

| Archivo | Cambios |
|---|---|
| [`app/api/photos/route.ts`](../app/api/photos/route.ts) | `GET ?ubicacion=X` → `obtenerFotosDeUbicacion` (topes + gate). `GET ?all=true` → ahora exige sesión + `puedeAdministrarSitio`. `GET` sin params → `[]`. Agrega `export const dynamic = 'force-dynamic'`. |

**Búsqueda de llamadores de `?all=true`:** solo `app/admin/photos/page.tsx` (línea 58). Se reemplazará completamente en WP8 → no hay que tocar nada ahora.

#### WP4 — API de administración

| Archivo | Descripción |
|---|---|
| [`app/api/photos/banco/route.ts`](../app/api/photos/banco/route.ts) | `GET` paginado con filtros (q, origen, ubicacion, proyecto, desde, hasta, menores, estado, page, pageSize). Alcance por rol: admin ve todo; líder solo fotos de sus proyectos publicables con fuente aprobada. |
| [`app/api/photos/accion/route.ts`](../app/api/photos/accion/route.ts) | `POST` acciones en lote (publicar, quitar, ocultar, mostrar, descartar, marcar_revisada, marcar_interna). **`Pool + BEGIN/COMMIT`** — atomicidad real. Matriz de autorización por foto × ubicación. Respuesta incluye avisos de tope suave. |
| [`app/api/photos/ubicaciones/route.ts`](../app/api/photos/ubicaciones/route.ts) | `GET` catálogo con conteo de publicadas, filtrado por alcance. `PATCH` edición de topes (solo admin). |

#### Pendiente (próxima sesión)

| WP | Contenido |
|---|---|
| WP4.4 | Extender `POST /api/photos` (crear) y `PATCH /api/photos/[id]` para líderes + declaración de menores |
| WP5 | Declaración `hay_menores` en handlers de asistencia y difusión (leer completos antes de tocar) |
| WP5b | `proyectosAsignables` en `GET /api/proyectos`, validación en difusión/videos/enlaces, componente `SelectorProyectosEvento.tsx` |
| WP7 | Script `backfill-fotos-banco.js` (simulación por defecto) |
| WP8 | Componente `BancoFotos.tsx` + reescritura de `/admin/photos/page.tsx` |
| WP9 | Panel del líder `/portal/proyecto/[proyectoId]/fotos` (Fase B) |
| WP10 | Notificaciones `fotos-menores-por-revisar` y `fotos-sin-ubicar-proyecto` |
| WP11 | Script de pruebas de permisos `scripts/test-fotos-permisos.mjs` |

---

### Sesión 2026-09-26 (Claude) — revisión de lo de Antigravity + WP4.4, WP5, WP5b, WP7, WP8, WP9, WP10, WP11

**Rama:** `feat/admin-lideres-fotos` (se le hizo `merge origin/main` limpio al final; `main` había avanzado con los informes de Vinculación).
**Verificación:** `tsc --noEmit` limpio, `next build` completo OK, `scripts/test-fotos-permisos.mjs` → **TODO OK (46 casos)** contra servidor local + Neon real, y prueba de ingesta real (pasante/docente/podcast) OK.
**Nota de entorno:** `npx tsc` no encuentra el binario en este checkout (`node_modules/.bin/tsc` no existe); usar `node node_modules/typescript/bin/tsc --noEmit` y `node node_modules/next/dist/bin/next build`. `git commit` falla desde la herramienta Bash: usar PowerShell.

#### Lo que se encontró al revisar (importante para futuras sesiones)

| # | Hallazgo | Acción |
|---|---|---|
| 1 | El auto-commit `c1f8f17` **revirtió** dos cosas del trabajo previo: (a) `app/api/photos/route.ts` volvió a la versión vieja (el GET público sin topes, WP3) y (b) el propio plan perdió su §15 y las correcciones. Además el árbol de trabajo tenía 4 archivos (`difusion`, `enlaces-difusion/[token]`, `asistencia`, `photos/[id]`) **idénticos a `main`**, es decir, sin el trabajo de WP4.4/WP5 que sí estaba en `HEAD`. | Se restauraron esos 4 archivos desde `HEAD`, el plan desde `d4f6289` y `photos/route.ts` se reescribió completo (WP3 + WP4.4). |
| 2 | **Bug real en `POST /api/photos/accion`:** la acción `quitar` (admin) llamaba a `array_remove_values(...)`, una función que **no existe en Postgres** → 500 siempre. | Reemplazada por el patrón `unnest`/`COALESCE(array_agg(...))`. Cubierto por la prueba "quitar (admin) → 200". |
| 3 | `accion` aceptaba `publicar`/`quitar` **sin ubicaciones** (solo activaba la foto) y no actualizaba `updated`. | Ahora exige ≥1 ubicación (400) y todos los `UPDATE` ponen `updated = now()`. |
| 4 | WP5 (Antigravity) tomaba los proyectos de un enlace QR de **todas las membresías del creador** en vez de los que él eligió al generarlo (contradice WP5b). | El enlace guarda `enlaces_difusion.proyectos` al generarse; el público los usa, ignora el cuerpo. |
| 5 | **Bug previo:** `POST /api/upload` exige sesión, así que un externo con enlace QR **no podía subir su foto** (401). | `upload` acepta `enlace_token` de un enlace vigente de tipo `evento` como autorización alternativa. |
| 6 | El auto-commit `136f028` (ya anotado como H1) sigue vigente: el cableado de permisos por pertenencia (`c53d899`) está revertido en `main`. No se tocó. | Solo se anota; ver H1. |

Se verificó además que `@neondatabase/serverless` 1.x **sí** admite fragmentos `sql` anidados (lo usa `banco/route.ts`).

#### WP4.4 — `POST /api/photos` y `PATCH /api/photos/[id]` (líderes)
`app/api/photos/route.ts` reescrito: `GET` público con topes (`obtenerFotosDeUbicacion`), `?all=true` solo administración del sitio, sin `ubicacion` → `[]`. `POST` acepta admin y líder/colíder; **exige `hay_menores` boolean**; el servidor fuerza `origen` (`admin`/`lider`), `menores`, `visibilidad`; con menores nunca guarda ubicaciones; el líder solo puede usar proyectos que gestiona y ubicaciones de esos proyectos (nunca `solo_admin`). `PATCH [id]` (Antigravity) se conserva: líder edita título/descripción/orden/posición de fotos de sus proyectos; solo admin reasigna `proyectos`. `DELETE` solo admin.

#### WP5 — Declaración de menores + ingesta
- `hay_menores` (casilla "¿Aparecen menores de edad en la foto?", **No** por defecto) en: `/vinculacion/asistencia`, `/vinculacion/difusion`, `/gestion-carrera` y el subir-foto del banco. Sin Groq (WP6 eliminado por decisión del usuario).
- Ingesta al banco (`lib/ingestaFotos.ts`) después del `COMMIT`, sin poder tumbar el registro principal: asistencia (`origen='asistencia'`, `proyectos=['vinculacion']`), `POST /api/difusion` (`evento`/`podcast`), y externos vía QR (`esExterno` → siempre `menores='revisar'`, interna).

#### WP5b — Proyectos al subir
- `lib/permisosProyecto.ts`: `proyectosAsignables` / `validarProyectosAsignables` (Antigravity) — admin de sitio: todos; docente: los suyos (cualquier rol); pasante: fijo (D5).
- `GET /api/proyectos?asignables=1` (rama nueva en la ruta existente; `{ fijo, proyectos }`).
- `components/SelectorProyectosEvento.tsx` (nuevo) usado en `/vinculacion/difusion`, `/gestion-carrera` y `EnlaceDifusionModal`; botón de envío deshabilitado si la persona no pertenece a ningún proyecto.
- Validación en servidor: `POST /api/difusion` (pasante → fijo; docente → asignables; otro rol → 403; el `video_proyecto_id` de un docente también se valida), `POST /api/videos` (proyecto principal: pasante solo `vinculacion`; docente sus asignables; `internacionalizacion` lo agrega el servidor), `POST /api/enlaces-difusion` (proyectos del generador), `POST /api/enlaces-difusion/[token]` (usa los del enlace). Página pública del QR muestra "Este registro se asociará a: …".
- `/portal/subir-video` **no necesitó cambios**: solo registra un video (sin actividad) y ya elige su proyecto con `SelectorAreaProyectoPodcast`; la validación vive en `POST /api/videos`.

#### WP7 — Backfill (APLICADO en Neon y Cloudinary el 2026-09-26)
`scripts/backfill-fotos-banco.js` (simulación por defecto; `--aplicar`). **Resultado real:** 44 archivos locales distintos subidos a `pine_project_uploads/legado/…` (0 faltantes, 0 demasiado grandes); las 45 filas existentes de `fotos` actualizadas a URL de Cloudinary (**conservaron** ubicaciones/orden/activo/posición); insertadas **2** fotos de evento y **23** de asistencia (`menores='revisar'`, `interna`, `activo=false` → bandeja de revisión); 23 duplicados omitidos. Estado final: `fotos` = **70** filas (45 → 70), **45 con ubicación (sin cambios)**, 0 rutas locales, 70 en Cloudinary. Verificado que una URL migrada responde `200 image/jpeg`. Los archivos de `public/images` **no se borraron**. (El plan decía 22 fotos de asistencia; hoy hay 23 porque se registró una más desde entonces.)

#### WP8 — UI
`components/fotos/BancoFotos.tsx` (compartido) + `app/admin/photos/page.tsx` reducido a un wrapper. Cupos por ubicación (`publicadas/max`), filtros (búsqueda, origen, ubicación incl. "Sin ubicar", proyecto, fechas, menores, estado; inicializados desde la URL para los enlaces de las notificaciones), cuadrícula paginada (24), selección múltiple con **Publicar en… / Quitar de… / Ocultar / Mostrar / Descartar**, y solo para admin **Marcar sin menores / con menores**; modales de edición (recorte, orden, proyectos) y de subida (con la casilla de menores). Las fotos con menores no ofrecen publicar (la API responde 409).

#### WP9 — Panel del líder + galerías
- Páginas: `/portal/proyecto` (lista; entra directo si solo hay uno), `/portal/proyecto/[proyectoId]` y `/portal/proyecto/[proyectoId]/fotos` (`<BancoFotos modo="lider">`). `middleware.ts`: `/portal/proyecto` en `protectedRoutes` (solo `profesor`/`admin`; la secretaria ya queda denegada por defecto).
- Dashboard: la tarjeta estática "Gestionar {proyecto}" (`liderProyectoPropio`, "Próximamente") se reemplazó por **"Administrar mi proyecto"**, armada desde `proyecto_miembros` en cada carga (`proyectosGestionables`); administración del sitio ve un solo enlace "Todos los proyectos".
- `components/GaleriaProyecto.tsx` (oculta la sección si no hay fotos) en `proyecto-innovacion`, `desarrollo-habilidades`, `mentoring` y `/proyectos/[slug]`; textos en `lib/i18n.tsx` → `t.projectGalleries` (ES+EN). `POST /api/proyectos` crea también la ubicación `<id>-galeria` (tope 8).

#### WP10 — Notificaciones
`fotos-menores-por-revisar` (`contenido_sitio` → `/admin/photos?menores=revisar`) y `fotos-sin-ubicar-proyecto` (líder/colíder sin ser admin de sitio → su panel). Filas agregadas a `NOTIFICACIONES.md`. La primera usa `contenido_sitio` (no `puedeAdministrarSitio`) porque el destino `/admin/photos` lo exige el middleware.

#### WP11 — Pruebas
`scripts/test-fotos-permisos.mjs` (matriz completa del plan, con Jhonny y Verónica reales, datos `foto_test_*` que se borran solos): anónimo/secretaria/pasante, líder (proyecto propio/ajeno, portada, menores, atomicidad del lote), Jhonny (internacionalización + RED LEA, sin acceso a `/admin`), admin, CHECK de BD (23514), GET público con tope (5 fotos, tope 3 → 3), asignables y validación de proyectos.

#### Pendiente / decisiones para el usuario
1. **Desplegar y revisar visualmente**: la rama no se ha mergeado a `main`. Tras el deploy, Docencia pasa de 23 a 8 fotos y RED LEA de 13 a 10: **curar el `order`** desde `/admin/photos` (nada se borró).
2. **Generar QR sin módulos:** `puedeGenerarEnlaceDifusion` exige módulo `vinculacion`/`investigacion`/`contenido_sitio`; un líder sin módulos (p. ej. Jhonny, `modulos_acceso = {}`) no ve el botón aunque la API ya valida sus proyectos. Decisión: ¿permitir generar QR a todo líder/colíder?
3. **Fotos de asistencia (23):** quedan en la bandeja de revisión; un admin las marca con "Marcar sin menores" para poder ubicarlas.
4. **H1** (cableado de permisos por pertenencia revertido en `main`) sigue abierto y fuera de alcance.
5. `avisos` de tope en `POST /api/photos/accion` cuenta fotos activas publicables de la ubicación sin descontar las de fuente sin aprobar (solo afecta el texto del aviso, no lo que se muestra).
6. Estado de pasantes en el selector: las reglas D5 viven en `POST /api/difusion` y `GET /api/proyectos?asignables=1`; si cambian, tocar ambos.

---

### Sesión 2026-09-26 (Claude, segunda tanda) — Descartar reversible + títulos automáticos

**Rama:** `feat/fotos-descarte`. **Pruebas:** `scripts/test-fotos-permisos.mjs` → 58 casos OK (15 nuevos de descarte). `tsc` y build limpios.

**Descartar ya no es solo "sacar de las galerías": es un estado real y reversible.** Migración `scripts/migrate-fotos-descartada.js` (aplicada en Neon, respaldo `respaldo_fotos_descartada_20260926`):
- `fotos` gana `descartada`, `descartada_por`, `descartada_en`, `motivo_descarte` (`menores|mala_calidad|duplicada|otro`, opcional). CHECK `fotos_descartada_inactiva_check`: una descartada no puede estar activa ni tener ubicaciones.
- Función SQL **`foto_descartada(url)`**: fuente única para saber si una imagen está descartada.
- **El descarte es por imagen**: `POST /api/photos/accion` con `descartar` marca todas las filas con la misma URL; `restaurar` las devuelve a "sin ubicar" (conserva sus marcas de menores). No se borra ni la fila ni el archivo.
- **Todos los usos la respetan:** galerías (`lib/fotosPublicas.ts`), noticias/boletines (`GET /api/actividades-difusion` público filtra `photos[]`), informes del supervisor y del líder (`AND NOT foto_descartada(a.foto_url)`), y en `/vinculacion/supervisar` la foto sigue visible como evidencia pero con la etiqueta "Descartada: no se usa en la web ni en los informes".
- **Banco:** las descartadas solo salen con el filtro `estado=descartada` (con "Restaurar"); la barra de acciones tiene motivo opcional.
- **Eliminar definitivamente** (`DELETE /api/photos/[id]`) quedó protegido: solo administración del sitio, solo fotos subidas al banco (`origen` `admin`/`lider`), ya descartadas y cuya imagen no se use en ninguna asistencia, actividad u otra fila. Si no, 409 con "usa Descartar". Antes podía destruir en Cloudinary un archivo que usa una asistencia.

**Títulos automáticos (`lib/ingestaFotos.ts`, `tituloParaFoto`):** evento/podcast → título de la actividad; asistencia → "Espacio — dd/mm/aaaa" (`app/api/espacios/asistencia/route.ts`); repetidos → "(2)", "(3)"…; **sin nombre conocido → "n - dd/mm/aa"** (número correlativo y fecha de creación, p. ej. `1 - 19/09/26`, formato pedido por el usuario). Las 26 fotos que estaban sin título se rellenaron con el script (asistencia y eventos; ninguna quedó sin origen conocido).

**Nota:** `POST /api/actividades-difusion` público ahora usa `no-store` (lectura pública sin cookies, ver Sesión 31).

---

### Sesión 2026-09-26 (Claude, tercera tanda) — revisión de asistencias duplicadas y aviso de posible duplicado

**Diagnóstico (solo datos, sin borrar nada):** las fotos "repetidas" eran registros de asistencia duplicados (mismo espacio, día, horario y beneficiarios, enviados con minutos de diferencia); los supervisores ya habían rechazado las copias con motivo "Duplicado" y **no hay horas dobles** en lo aprobado. Regla a recordar: **los instructores de un registro son los asignados al espacio (preseleccionados por defecto) más los invitados que se agreguen a mano**, así que una lista de instructores igual o distinta **no** prueba por sí sola un duplicado; se usan beneficiarios + horario + fecha. Ningún pasante aparece en dos espacios a la vez (revisado con invitados incluidos).

**Decisiones del usuario aplicadas:** (1) restaurada la foto de UE Manuela 21/09 (2), de la sesión aprobada #13; (2) **aviso de posible duplicado** al registrar asistencia y en `/vinculacion/supervisar` (badge ámbar "Posible duplicado de #N"): otro registro no rechazado del mismo espacio y día, horario cruzado y al menos un beneficiario en común. **Solo avisa, no bloquea** (un mismo día puede haber dos grupos legítimos). El formulario, si hay aviso, no redirige solo. Ver `app/api/espacios/asistencia/route.ts` y `app/api/vinculacion/supervisar-asistencia/route.ts`. Data fix previo (respaldado): Juan Montalvo #3, quitados Evelyn (36) y Britany (37) por estar en la #4 a la misma hora; fila duplicada de `InterClass.jpg` quitada del banco.

**Pendiente de confirmar con pasantes/supervisora (no se tocó):** Juan Montalvo — los beneficiarios 57, 59 y 62 constan en la #3 y en la #4, y Britany (37) está asignada al espacio 17 "Grupo Cintya" pero su registro #4 está en el espacio 7; B1 22/09 — el beneficiario 82 solo consta en registros rechazados (#6/#7), las horas sí están en la #5; A2 23 y 24/09 figuran de 22:00 a 23:30; UE Manuela 24 y 25/09 repiten los 13 beneficiarios del 21/09 (¿lista por defecto?).

---

### Sesión 2026-09-27 (Claude) — aprobación de contenido sin depender solo del administrador

Continúa el objetivo de fondo del plan (menos dependencia del administrador), esta vez sobre **quién aprueba**, no solo quién sube/publica fotos. Rama `feat/aprobacion-responsables`. Detalle exhaustivo en `CLAUDE.md` → "Cambios Recientes (Sesión 53)". Resumen:

- Migración `scripts/migrate-aprobacion-responsables.js`: `fotos.calidad`/`propuestas`, `videos.profesores_responsables`/`actividad_difusion_id`, `fotos_ubicaciones.rotar`.
- `lib/permisosAprobacionContenido.ts`: `puedeAprobarVideo` (admin, o responsable, o supervisor del pasante que subió), `puedeAprobarActividad` (admin, o responsable — autoaprobación permitida por decisión explícita del usuario).
- `PATCH /api/videos/[id]/aprobar` (nuevo) y vía de aprobación en `PATCH /api/actividades-difusion/[id]` (solo aprobar, nunca editar, para quien no es `contenido_sitio`).
- `/portal/aprobaciones` (nueva) + `GET /api/mis-aprobaciones` + notificación `contenido-por-aprobar-responsable`.
- `/vinculacion/supervisar` → Podcast: botón "Publicar en el sitio"; → Asistencia: casillas de menores/calidad al aprobar (no bloquean las horas).
- `POST /api/photos/accion`: acciones nuevas `proponer`/`rechazar_propuesta` (cola de portada) y `marcar_calidad_aceptable`/`marcar_calidad_mala`; `lib/fotosPublicas.ts`: rotación para `rotar=true`.
- `scripts/test-fotos-permisos.mjs`: 80 casos, todos en verde. `tsc`/`build` limpios.
- **Pendiente:** las decisiones abiertas de la Sesión 52 (permitir QR a líderes sin módulos; restaurar o descartar H1) siguen sin resolver — no era el foco de esta sesión.
