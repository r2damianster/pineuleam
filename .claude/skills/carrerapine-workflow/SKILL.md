---
name: carrerapine-workflow
description: Flujo de trabajo obligatorio para cambios de contenido, páginas y despliegue en el sitio de la Carrera de Pedagogía de los Idiomas Nacionales y Extranjeros (carrerapineuleam). Úsalo siempre que edites páginas del sitio público, footer/equipo/hub, textos visibles, o hagas push a este repo — codifica los errores reales cometidos y corregidos en la Sesión 26 (footer que no era contextual, i18n roto, deploys fallidos sin detectar, cambios de Neon sin confirmar).
---

# Flujo de trabajo — carrerapineuleam

Este skill existe porque en una sola sesión (Sesión 26) se repitieron los mismos
errores varias veces antes de corregirlos: contenido genérico repetido en todas
las páginas cuando debía ser contextual, texto en español hardcodeado que
rompía el toggle EN/ES, y deploys que fallaban en Vercel sin que nadie lo
notara hasta revisar explícitamente. Seguí este orden en cualquier tarea que
toque el sitio público.

## 1. Antes de escribir código: ¿el contenido es contextual o genérico?

Este proyecto tiene **múltiples proyectos/secciones con identidad propia**
(Internacionalización, Vinculación, Desarrollo de Habilidades, Mentoring,
Docencia, RED LEA, landing) que comparten componentes (`Footer`, `TeamSection`,
`Contact`, `HubProjectsSection`). El error de raíz más repetido en esta sesión
fue tratar esos componentes compartidos como si tuvieran un solo contenido
correcto para todas las páginas.

Antes de tocar un componente compartido, preguntate: **¿este texto/dato es
igual de cierto en las 10 páginas que lo usan, o es específico de una?** Si es
específico:
- Seguí el patrón `lib/data.ts:footerContexts` — un `Record<string, TuTipo>`
  con una entrada por contexto/proyecto, y el componente recibe una prop
  `context`/`project` y hace `contexts[key] ?? contexts.default`.
- Para quién aparece en qué página (equipo, publicaciones futuras, etc.), seguí
  el patrón `members.projects` (columna `text[]` en Neon) + `GET
  /api/members?project=X` — nunca un `SELECT *` sin filtrar que dependa de que
  el componente decida a mano qué mostrar.
- Si el dato no existe todavía para una sección nueva (ej. un proyecto nuevo
  sin líder documentado, un email no confirmado), **preguntale al usuario con
  AskUserQuestion antes de inventarlo o de asumir que el default aplica.**
  Nunca inventes personas, emails o nombres de proyecto — pasó dos veces antes
  de esta sesión y tuvo que revertirse ambas.

## 2. Nunca texto hardcodeado en español en componentes del sitio público

El toggle EN/ES (`lib/i18n.tsx`, `useLanguage()`) existe desde antes de esta
sesión pero la mayoría del contenido nunca pasó por él — el botón cambiaba el
estado pero la página se veía igual. Regla dura: **todo string visible en un
componente o página bajo `app/` (excepto `/admin`, `/portal`, `/vinculacion`
de gestión, `/investigacion/espacios`, `/gestion-carrera`, `/contribuciones` —
esas son herramientas internas, siempre en español) va a
`translations.es`/`translations.en` en `lib/i18n.tsx`, nunca como string
literal en el JSX.** Esto incluye estados de loading/empty, placeholders,
labels de botones y aria-labels visibles. Antes de dar por terminado un
componente nuevo o editado, corré:

```bash
grep -rn ">Cargando \|>No hay " components/ app/ --include=*.tsx
```

y confirmá que cualquier resultado fuera de `components/admin/` es un bug a
corregir, no un caso aceptable.

Si el componente es un **Server Component** (sin `'use client'`, ej. las
páginas en `app/.../page.tsx`) y necesita texto traducible, no le agregues
`'use client'` a la página entera — extraé ese bloque a un componente cliente
chico (ver `components/ProjectInfoPlaceholder.tsx` como ejemplo) que sí use
`useLanguage()`.

## 3. Cambios en Neon (Postgres)

- **Nunca `prisma db push` / `prisma migrate`** en este proyecto — ver la
  advertencia permanente en `CLAUDE.md` → `## Stack Técnico`. El schema de
  Prisma solo modela `Contribution`/`ContributionAuthor`; comparar contra toda
  la base ofrece borrar tablas reales con datos.
- Para cambios aditivos simples (agregar columna, poblar datos existentes,
  insertar una fila), si tenés el Neon Project ID a mano (pedíselo al usuario
  si no lo tenés — "Project ID", no "Org ID", alcanza para `run_sql` y
  `describe_table_schema`), podés ejecutar el SQL directamente vía el MCP de
  Neon en lugar de escribir un script y pedirle al usuario que lo corra. Igual
  dejá un script en `scripts/` como referencia documentada del cambio, aunque
  ya lo hayas aplicado vos.
- **Cualquier INSERT/UPDATE que afecte datos de una persona real (nombre, rol,
  email, ORCID) — confirmá el dato exacto con el usuario antes de escribirlo**,
  incluso si parece obvio. Un `INSERT` fue rechazado una vez en esta sesión
  porque el usuario quería revisar el rol exacto primero.

## 4. Git: dos ramas, siempre sincronizadas

`main` hace auto-deploy a producción en Vercel: no se trabaja directamente en
ella. Cada cambio va en una rama de feature y entra a `main` por merge/PR.
Antes de editar un archivo compartido, `git diff origin/main -- <archivo>`
(hubo auto-commits que revirtieron trabajo ajeno).

```bash
git add <archivos específicos>   # nunca -A a ciegas sin revisar git status primero
git commit -m "..."
git push origin <rama-de-feature>
```

Si no sabés el nombre exacto de la rama de feature activa, mirá el contexto
del sistema (branch requirements) o `git branch` antes de asumir.

## 5. Después de cada push a `main`: verificar el deployment, no asumir

Un push exitoso a git **no** significa que el sitio se actualizó. En esta
sesión, builds fallaron por: un `useSearchParams()` sin `<Suspense>`, un tipo
`FooterContext` sin todos los campos requeridos, y otros. Ninguno se hubiera
detectado sin revisar Vercel explícitamente. Después de cada push:

1. Esperá ~40-60s (usá `Bash` con un loop `while` corto, nunca un `sleep`
   standalone largo).
2. Revisá el deployment de producción más reciente:
   `mcp__Vercel__get_deployment` con `idOrUrl:
   "pineuleam-git-main-r2damiansters-projects.vercel.app"` (o
   `list_deployments` si necesitás más contexto), `teamId:
   "team_bfWYT0VBtmA1Dj9nL7242ZJL"`, `projectId:
   "prj_FzfL9E6xk7TUi5AkMQ5njDnNQAH7"`.
3. Si `state`/`readyState` es `ERROR`, leé los build logs
   (`mcp__Vercel__get_deployment_build_logs`) y arreglá la causa raíz antes de
   reportar nada como terminado — no le digas al usuario que algo está
   desplegado hasta confirmar `READY`.
4. Solo entonces confirmale al usuario el resultado.

No hace falta este paso completo para cambios de una sola línea de string sin
tipos nuevos (bajo riesgo), pero sí para cualquier cambio que toque una
interfaz TypeScript, agregue una prop nueva, o modifique más de 2-3 archivos.

## 6. Documentar la sesión en CLAUDE.md (y ANTIGRAVITY.md si aplica a Antigravity)

Este proyecto se edita en conjunto con otro agente (Antigravity). Al terminar
un bloque de cambios coherente:

- Agregá o extendé la sección `## Cambios Recientes (Sesión N — fecha)` en
  `CLAUDE.md` con un punto numerado por cambio, mencionando **qué archivo se
  tocó y por qué** (no solo qué se ve distinto).
- Si el cambio establece una regla o patrón que Antigravity debería conocer
  antes de tocar el mismo código (ej. "no repitas footer genérico", "usá
  `members.projects`"), agregá un resumen corto en `ANTIGRAVITY.md` bajo
  `## 📌 Estado Actual y Tareas` — Antigravity no lee el detalle completo de
  `CLAUDE.md` por defecto, solo ese resumen.
- Actualizá versión/fecha en el encabezado y pie de página de `CLAUDE.md`.
