# 🎓 Carrera de Pedagogía de los Idiomas Nacionales y Extranjeros — ULEAM

Sitio público del proyecto de Innovaciones Pedagógicas e Internacionalización de la Universidad Laica Eloy Alfaro de Manabí (ULEAM), junto con el **Portal PINE** — el sistema operativo interno para docencia, vinculación e investigación de la carrera.

**Versión:** 0.12.13
**Estado:** Sitio público funcional ✅ — Portal PINE (Neon) construido y desplegado ✅ — Confirmación visual & Redirección en Formularios ✅ — Módulo Superadmin con 'Ver como' (Impersonar) ✅ — Panel de Indicadores & Supervisión ✅ — i18n ES/EN completo ✅ — Dedupe en tiempo real, subaulas y auditoría IA de asistencia ✅ — Informe Semestral del Supervisor (antes "mensual"), entidad beneficiaria por espacio y redacción con IA de actividades no previstas ✅
**Tech Stack:** Next.js 14 (App Router) + TypeScript + TailwindCSS + Neon (Postgres Serverless) + Cloudinary
**Sitio en producción:** https://pineuleam.vercel.app
**Repositorio:** https://github.com/r2damianster/pineuleam.git

> ⚠️ Este README es un resumen de alto nivel. La fuente de verdad detallada y actualizada del proyecto (esquema de base de datos, decisiones de diseño, historial sesión por sesión) es [`CLAUDE.md`](./CLAUDE.md).

---

## 🌟 Módulos principales

### Sitio público (`/`, `/investigacion/*`, `/vinculacion/dinamicas-linguisticas`, `/docencia/*`, `/publicaciones`, `/boletines`)
Landing institucional bilingüe (ES/EN) con contenido contextual por proyecto: equipo, publicaciones científicas, podcast (Educa PINE / Voces Fuera del Aula), noticias y actividades. Todo el contenido vive en **Neon Postgres** (migrado desde datos estáticos en la Sesión 25) — nada de esto usa PocketBase ni mocks.

### Portal PINE (`/portal/*`)
Sistema operativo real para el trabajo de campo de la carrera:
- **Vinculación:** gestión de espacios (clubes/aulas), con **subaulas opcionales** activables solo por el líder; asignación de estudiantes-instructores, registro de beneficiarios, asistencia (checklists desmarcados por defecto + resumen de validación antes de guardar), Test MCER (pre/post, exportable a Word), encuestas de satisfacción, difusión de eventos — incluye enlaces/QR públicos sin login para que un beneficiario tome su test o encuesta desde el celular. **Detección de duplicados en tiempo real** (70% aviso / 90% bloqueo) en asistencia, difusión y registro de beneficiario, bloqueo duro de solapamiento de horario entre espacios, y **auditoría IA no bloqueante** de la foto de asistencia (Groq vision). Los pasantes además reportan horas de podcast, de investigación y **horas/actividades autónomas** (tope de 16 h), todas aprobadas por su supervisor.
- **Notificaciones del Portal:** bloque "Pendientes" en el dashboard (aprobaciones por hacer para supervisores y administradores; rechazos para pasantes). Ver `NOTIFICACIONES.md`.
- **Dashboard Pedagógico del Pasante** (`/portal/mi-avance`): avance de horas reglamentarias frente a la meta de **96h**, resultados MCER iniciales vs finales de sus alumnos comunitarios, semáforo de asistencia de aula (< 70% alerta en rojo) y reseñas cualitativas de satisfacción.
- **Indicadores & Supervisión Docente** (`/vinculacion/supervisar/indicadores`): panel analítico para profesores con desgloses por pasante, matriz de ganancia pedagógica MCER (Pre vs Post), alertas de asistencias pendientes >72h e informes ejecutivos.
- **Investigación:** gestión de espacios + generador de Informes Mensuales (`/investigacion/informes`).
- **Gestión de Carrera:** registro de eventos abierto a cualquier docente.
- **Contribuciones Académicas:** registro de producción académica de docentes (artículos, libros, capítulos, memorias de evento), con campos específicos por tipo.
- **Indicadores** (`/pine-dashboard`): KPIs en tiempo real desde Neon.

### Gestión del Sitio (`/admin`)
Panel CRUD para el contenido público — Miembros, Publicaciones, Podcast, Noticias, Actividades, Documentos, **Fotos** (banco de fotos administrable, alimenta un carrusel en la portada) y **Proyectos** (ocultar/reordenar cualquier proyecto o red del menú, crear proyectos nuevos sin tocar código). Cada tabla incluye buscador, paginación configurable (10/25/50/100) y la posibilidad de **ocultar un registro del sitio sin borrarlo** (Sesión 30). Restringido al líder/colíder del proyecto vía el módulo `contenido_sitio`.

### `/utilidades`
Generador de documentos administrativos de la carrera (Acta Técnica, Oficios, Convocatorias, PATs de Maestría, Pares Lectores) con redacción asistida por IA.

### Superadmin (`/superadmin`)
Explorador de tablas + SQL runner sobre toda la base de datos Neon, con funcionalidad **"Ver como" (Impersonación de Usuarios)** desde `/superadmin/ver-como`, filtros interactivos por rol/módulos (casillas de verificación) y persona, barra flotante global de reversión y log de auditoría. Restringido al Superadmin principal.

Detalle completo de cada módulo, esquema de Neon, roles y permisos: ver [`CLAUDE.md`](./CLAUDE.md).

---

## 🚀 Cómo empezar (desarrollo local)

### Prerrequisitos
- Node.js 18+
- Cuenta en [Neon.tech](https://neon.tech) (PostgreSQL Serverless)
- Cuenta en [Cloudinary](https://cloudinary.com) (subida de evidencias/fotos)

### Configuración

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno (ver .env.local.example)
# DATABASE_URL, SESSION_SECRET, CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET

# 3. Iniciar en desarrollo
npm run dev
```

El esquema de Neon ya existe en producción — los scripts en `scripts/migrate-*.js` documentan cómo se construyó cada tabla, pero no hace falta correrlos contra una base nueva salvo que estés levantando un entorno desde cero (en cuyo caso, revisar el orden y las notas de cada script primero).

### Verificación antes de dar un cambio por terminado

```bash
npx tsc --noEmit   # chequeo de tipos
npm run build      # build de producción
```

> ⚠️ En algunos checkouts Windows `npx tsc`/`npm run build` fallan porque `node_modules/.bin` queda vacío tras la instalación — si pasa, usar `node node_modules/typescript/bin/tsc --noEmit` y `node node_modules/next/dist/bin/next build` directo (mismos comandos, sin `npx`/`npm run`).

---

## 🗄️ Base de datos

Todo vive en un único proyecto Neon Postgres, compartido entre el sitio público y el Portal PINE — sin PocketBase, sin mocks. El esquema real (con las tablas huérfanas y el drift documentado) está en `CLAUDE.md` → `## Portal PINE`. **Nunca correr `prisma db push`/`migrate`** — el schema de Prisma solo modela el módulo de Contribuciones Académicas, y esos comandos comparan contra toda la base (ver advertencia completa en `CLAUDE.md`).

---

## 👥 Equipo del Proyecto

- **Líder:** Arturo Rodríguez — arturo.rodriguez@uleam.edu.ec
- **Colíder:** Jhonny Villafuerte — jhonny.villafuerte@uleam.edu.ec

El equipo completo, por proyecto, está documentado en `CLAUDE.md` → `## Equipo actual`.

---

## 📚 Documentación

| Archivo | Para qué |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Fuente de verdad del proyecto — esquema, decisiones, historial de sesiones. Instrucciones de contexto para Claude Code. |
| [`ANTIGRAVITY.md`](./ANTIGRAVITY.md) | Instrucciones equivalentes para Antigravity (AGY), el otro agente que colabora en este repo. |
| [`MANUAL_USUARIO.md`](./MANUAL_USUARIO.md) | Manual de uso del Portal PINE, por rol. |
| [`CHANGELOG.md`](./CHANGELOG.md) | Historial de versiones. |
