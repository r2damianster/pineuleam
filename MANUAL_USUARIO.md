# 📖 Manual de Usuario - Portal PINE

Bienvenido al manual de uso del **Portal PINE** (Innovaciones Pedagógicas e Internacionalización), ULEAM. Sistema para gestionar el trabajo de campo de Vinculación (Club de Inglés y otros espacios), Investigación, y el registro de indicadores (MCER, asistencia, encuestas, difusión).

**🌐 Acceso a la plataforma:** [https://www.pineuleam.net/portal/login](https://www.pineuleam.net/portal/login)

> Esta es distinta de la página pública del proyecto (`/investigacion/proyecto-innovacion`, etc.) — el Portal es solo para quienes tienen cuenta.

---

## Primer ingreso: quién crea tu cuenta y cómo

No todos los roles se autoregistran — depende de quién eres:

| Rol | ¿Cómo entra por primera vez? |
|---|---|
| **Profesor** | Se autoregistra en [/registro](https://www.pineuleam.net/registro), pero **solo si su correo está en la lista autorizada del proyecto** (contacta al líder si sale "correo no autorizado"). |
| **Estudiante / Pasante-instructor de vinculación** | **No hay pantalla de registro.** Tu profesor te da de alta desde Administrar Pasantes (solo nombres/apellidos/email). La primera vez que entras en [/portal/login](https://www.pineuleam.net/portal/login) con ese correo, la clave que escribas queda guardada como tu contraseña definitiva — de ahí en adelante entras normal. |
| **Beneficiario / Participante** | **Nunca tiene cuenta ni contraseña.** Lo registra su instructor o profesor desde `/vinculacion/registrar-evaluar` como parte de sus datos, no como usuario del sistema — siempre junto con su Pre-Test. |

Tras entrar llegas a `/portal/dashboard`, donde ves solo las tarjetas que te corresponden según tu rol y tus módulos asignados.

**🔔 Pendientes:** si tienes algo por hacer, arriba de las tarjetas aparece el bloque "Pendientes" con un enlace directo a cada cosa. Supervisores: registros de asistencia y horas (podcast, investigación, autónomas) por aprobar. Administradores de sitio: videos/podcasts y eventos por aprobar. Pasantes: asistencias que tu supervisor rechazó (con el motivo en Mi Avance). Si no tienes nada pendiente, el bloque no aparece.

---

## 👨‍🏫 Perfil: Profesor de Vinculación (hoy: Arturo, Cynthia)

Tres tarjetas separadas en el Portal:

### Registros de Vinculación (tareas del día a día)
**Visible solo para pasantes, superadmin y el líder de Vinculación** (desde Sesión 49). Los demás profesores supervisores no la ven: trabajan desde su tarjeta "Supervisión de Vinculación".

El profesor puede hacer todo lo que hace un estudiante-instructor (ver más abajo) en **cualquier** espacio de vinculación, no solo en los que él mismo creó — es respaldo, no reemplazo del instructor.

### Supervisión de Vinculación (profesores supervisores)

Cada supervisor ve solo los espacios y pasantes a su cargo; superadmin y líderes ven todo.

**» Generar Informe Semestral (.docx)** (`/vinculacion/informes`, sub-selector "Semestral") — permite seleccionar el periodo semestral fijo (Periodo 1: abril–agosto, Periodo 2: septiembre–diciembre) y el año, visualizar las estadísticas acumuladas de asistencias y beneficiarios (con corte a hoy si el periodo sigue abierto), registrar dificultades u obstáculos con su impacto y recomendación, y descargar el documento de Word `.docx` oficial con gráficos generados automáticamente.

**» Generar Informe Mensual (.docx)** (`/vinculacion/informes`, sub-selector "Mensual", Sesión 57) — formato adicional y más simple, por mes calendario: elige el mes, revisa beneficiarios y zona (Cantón/Parroquia/Barrio/Ubicación) por espacio, edita el texto de actividades del mes (precargado automáticamente) y las observaciones, y descarga el `.docx`. El líder ve el mismo formato para todo el proyecto. La zona de cada espacio se completa una sola vez en "Administrar Espacios".

### Gestión de Vinculación (solo profesor/admin)

**» Ficha y Plan del Proyecto** (`/vinculacion/proyecto`) — administra la ficha técnica del proyecto (código, entidad beneficiaria, vigencia, ODS, zona), matriz de Objetivos Específicos y Actividades (con opción de clonar al ciclo siguiente), Metas por ciclo, Presupuesto y redacción de textos cualitativos con asistente de IA.

**» Informes Oficiales .docx (Supervisor / Líder)** (`/vinculacion/informes`) — módulo unificado para la generación de informes mensuales de supervisores e informes semestrales del líder de proyecto, además de consultar e imprimir el historial de informes previamente generados.

**» Administrar Espacios** (`/vinculacion/espacios`) — crea/lista espacios (clubes, aulas, cohortes). Un espacio es, por ejemplo, "Club de Inglés A", asociado a un ciclo/semestre. Al entrar a un espacio (clic en su nombre) puedes asignar qué pasantes son instructores de ese espacio — la única función que queda ahí; asistencia/beneficiarios/MCER/encuesta se manejan aparte, ver abajo. Si el espacio es grande y quieres dividirlo en subgrupos (ej. "Aula A"/"Aula B"), solo el **líder de Vinculación** puede activar "Este espacio se divide en aulas/subgrupos" y administrar esas aulas desde el botón "Aulas" — al activarlo, el pasante que registre asistencia primero elige su aula y solo ve a los beneficiarios/instructores de esa aula.

**» Administrar Pasantes** (`/vinculacion/pasantes`) — CRUD completo de estudiantes-instructores:
- **Uno por uno:** formulario con nombres, apellidos y email — nada de contraseña, la define el pasante en su primer ingreso (ver tabla de arriba).
- **Carga masiva por Excel:** botón "Descargar plantilla" (`.xlsx` con columnas Nombres/Apellidos/Email) → llenar y subir el archivo → aparece una vista previa marcando cada fila como ✅ válida o ❌ con el motivo (campo faltante, email inválido, repetido en el archivo, o ya registrado) → "Confirmar y Crear" solo inserta las filas válidas. Nada se guarda hasta confirmar.
- Editar/eliminar pasantes existentes, ver en qué espacios es instructor cada uno, y su estado (Activo / Pendiente de activar).

---

## 👩‍🎓 Perfil: Estudiante / Pasante-Instructor de Vinculación

> 📌 **Comportamiento General Post-Envío:** Al enviar con éxito cualquier registro (asistencia, beneficiario+Pre-Test, evaluación final o podcast/video), el formulario **se desmonta para evitar registros dobles** y despliega una **tarjeta visual de éxito**. Se inicia un temporizador de **5 a 6 segundos** que redirige automáticamente al Portal PINE (`/portal/dashboard`), con la opción de volver de inmediato o iniciar un nuevo registro.

### » Registrar y evaluar beneficiario (`/vinculacion/registrar-evaluar`)
Un beneficiario nuevo **siempre** se registra junto con su Pre-Test MCER — no queda registrado sin evaluación, es un solo envío obligatorio en la misma pantalla:
- **Registrar nuevo + Pre-Test:** nombres, apellidos, contacto, email (opcional), edad, si tiene discapacidad (y cuál), y situación ocupacional (Solo estudia / Estudia y trabaja / Solo trabaja / Desempleado y no estudia — si trabaja, qué rol; si estudia, nivel educativo y, si es universidad, carrera y curso), seguido de las preguntas del Pre-Test MCER. El beneficiario no inicia sesión — es solo su ficha de datos. Al completar, se muestra el puntaje y nivel asignado antes de redirigir al portal. Si el nombre se parece mucho a alguien ya registrado (posible misma persona con dos fichas), aparece un aviso de confirmación antes de guardar — así se evita duplicar a un beneficiario que ya existe.
- **Asignar beneficiario existente:** para alguien que ya es beneficiario en otro espacio/ciclo — ya tiene su Pre-Test de antes, solo se le suma a este espacio, sin repetir la evaluación.
- **QR Auto-registro + Pre-Test:** botón que genera un link/QR para el espacio — cada beneficiario se registra él mismo desde su celular y responde el Pre-Test en la misma pantalla, sin login.
- **📄 Descargar Pre-Test en Word:** para aplicarlo en papel — trae también los campos de datos del beneficiario en blanco, ya que el registro y el Pre-Test van siempre juntos.

### » Asistencia (`/vinculacion/asistencia`)
Elige el espacio y la fecha — la lista de beneficiarios, pasantes titulares e invitados aparece **sin ningún check marcado** (Sesión 55: hay que marcar conscientemente a cada presente, ya no viene "todos presentes" por defecto; hay botones "Marcar todos"/"Desmarcar todos" si hace falta). Si el espacio se divide en aulas, primero eliges tu aula y las listas se acotan a ella. Requiere hora de inicio/fin y foto obligatoria.

Antes de guardar aparece un **Resumen de Validación**: revisa espacio, fecha, horario y cuántos marcaste, y confirma con una casilla. Si el sistema detecta que el registro se parece mucho a otro ya guardado (mismo espacio/día/horario/beneficiarios), muestra una advertencia — puedes confirmar igual si es un grupo distinto, o revisar si es un duplicado real. Si la coincidencia es casi total, el sistema **no deja guardar** (evita un duplicado exacto). También puede desmarcar automáticamente a un beneficiario si ya está registrado en otro espacio con un horario muy cercano — no es un error, es para que no quede una asistencia duplicada de la misma persona.

Al guardar, se desmonta el formulario, muestra el estado *"Pendiente de aprobación"* y redirige en 5s al portal PINE. La foto pasa por una revisión automática de apoyo (cuenta cuántas personas aparecen) — es solo informativa para tu supervisor, nunca bloquea tu registro.

### » Registrar Evento o Podcast (`/vinculacion/difusion`)
Visible para todo pasante (y para quienes ven la tarjeta). Ahí se registran eventos y podcasts; los podcasts suben su video y acreditan horas cuando el supervisor las aprueba. Si el título/fecha/tipo se parece mucho a un evento ya registrado ese mismo día, pide confirmar antes de guardar.

### » Registrar Actividades de Investigación (`/vinculacion/investigacion-actividades`)
Solo aparece si te asignaron el módulo Investigación (se asigna en `/admin/roles`). Registras fecha, horas y descripción; tu supervisor las aprueba o rechaza.

### » Registrar Horas / Actividades Autónomas (`/vinculacion/actividades-autonomas`)
Para todo pasante. Registra lo que haces por tu cuenta: planificar clases, crear recursos, etc. (fecha, horas, descripción). **Máximo 16 horas en total**: cuentan las pendientes y las aprobadas; si el supervisor rechaza una, ese cupo se libera. Solo suman a tus 96 h cuando quedan aprobadas.

### » Evaluación final del beneficiario (`/vinculacion/evaluacion-final`)
El Post-Test MCER y la Encuesta de Satisfacción se responden juntos, en un solo envío (el beneficiario ya está registrado de antes, aquí no se piden sus datos):
1. Botón **"📄 Descargar Evaluación Final en Word"** — para aplicarla en papel (MCER + encuesta en blanco).
2. Selecciona el beneficiario (solo aparecen los inscritos en tu espacio) y el ciclo académico a evaluar, transcribe sus respuestas del MCER.
3. Sube una foto de la evaluación física resuelta (opcional). El sistema calcula el nivel (A1/A2/B1/B2) automáticamente.
4. Sigue la Encuesta (obligatoria en el mismo envío): satisfacción, **cuánto le sirvió el programa** (en sus estudios o trabajo, uso de lo aprendido, seguridad al hablar, oportunidades), qué tan probable es que lo recomiende (0-10) y una nota con una **recomendación por cada pasante con quien trabajó** — solo aparecen los pasantes que coincidieron con ese beneficiario en alguna sesión. Nada viene marcado de antemano. **Puede responderla el propio beneficiario** (dale el dispositivo o usa el QR); si la llenas tú desde tu cuenta de pasante queda registrado y tu supervisor recibe un aviso.
5. Al enviar, la pantalla de éxito muestra la calificación final obtenida y el nivel A1-B2 asignado, e inicia la cuenta regresiva para regresar al dashboard.
6. **QR Evaluación Final:** genera un link/QR para que el beneficiario tome el Post-Test + encuesta él mismo desde su celular, sin login.
7. ¿Necesitas reenviar solo la encuesta suelta (sin MCER, ej. si el Post-Test ya se tomó antes)? Hay un link a `/vinculacion/encuesta` al pie de la página, para ese caso puntual.

### » Registrar podcast o evento (`/vinculacion/difusion`)
Formulario completo para registrar eventos y podcasts de Vinculación, Investigación, Asignaturas o Maestría:
- **Campos del registro:** Título, Categoría (Vinculación / Investigación / Asignatura / **Maestría o Posgrado**), Tipo de Difusión (Podcast, Evento Físico, Encuentro Comunitario, Evento de Formación, Visita Técnica), Fecha, Hora opcional, Audiencia alcanzada y Profesores responsables.
- **Descripción & Observaciones con Inteligencia Artificial:** Incluye áreas de texto libre para describir los objetivos y logros del evento, junto con el botón **✨ Generar / Pulir con IA** para redactar la ficha formal e institucional automáticamente.
- **Conexión directa con Moderación:** La información registrada llega directamente al panel `/admin/contenido` para revisión, edición y publicación en noticias o actividades del sitio web.
- **Evidencia obligatoria:** Captura de métricas del podcast o foto del evento. Al enviar, confirma que quedó en revisión y redirige en 5s al portal PINE.

> Todo lo de arriba (excepto Registrar podcast o evento) solo funciona **dentro de tu espacio asignado** — si intentas operar un espacio donde no eres instructor, el sistema te lo bloquea.

---

## 🧑‍🏫 Perfil: Líder o colíder de proyecto — administrar las fotos de tu proyecto

Si eres **líder o colíder** de un proyecto (según el equipo del proyecto), en tu **Portal → "Administrar mi proyecto"** puedes:

1. **Ver las fotos de tu proyecto** (las que suben los pasantes en eventos y podcasts, y las que subas tú). Solo ves las de **tu** proyecto y solo las que **no** tienen menores de edad.
2. **Publicar** una foto en la galería de tu proyecto: marca la(s) foto(s), elige la galería en **"Publicar en…"** y pulsa el botón. También puedes **Quitar**, **Ocultar/Mostrar** o **Descartar**.
3. **Subir una foto** (botón **+ Subir foto**). Al subirla debes declarar si aparecen **menores de edad**; si marcas **Sí**, la foto no se publicará.
4. **Editar** título, descripción, recorte y **orden** (las de menor número salen primero).

**Máximo por galería:** cada galería tiene un tope de fotos visibles (por ejemplo 8). Si publicas más, el sitio **solo muestra las primeras**; las demás siguen guardadas. Verás el contador (por ejemplo 8/8) y un aviso si te pasas.

**Qué no puedes hacer:** publicar en la **portada** del sitio ni en galerías de **otros proyectos** (eso lo hace administración del sitio).

## 🎓 Perfil: Pasante / docente — al registrar eventos, podcasts y asistencia

- **Asistencia, eventos y podcasts** piden ahora una casilla **"¿Aparecen menores de edad en la foto?"** (viene en **No**). Si marcas **Sí**, la foto solo la verá el equipo de administración y **no se publicará** en la web.
- **Docentes:** al registrar un evento o podcast debes elegir **a qué proyecto(s) pertenece**; solo aparecen los proyectos de los que eres miembro. Los **pasantes** no eligen: sus eventos son de Vinculación y sus podcasts de Vinculación e Internacionalización.
- **Acceso temporal (QR) para externos:** al generar el enlace eliges los proyectos; quien lo use no puede cambiarlos. Las fotos de externos siempre pasan por revisión antes de publicarse.
- **Al subir un video en `/portal/subir-video`** (sin ser pasante de un club) debes elegir uno o más **profesores responsables** — son quienes podrán aprobar y publicar tu video sin esperar a administración del sitio.

## ✅ Aprobar eventos y podcasts sin ser administrador del sitio (Sesión 53)

Aprobar ya no depende únicamente de administración del sitio. Depende de quién registró y de quién quedó como responsable:

- **Podcast de un pasante de club de Vinculación:** lo aprueba **el supervisor de ese pasante** (el mismo profesor que ya aprueba sus horas) en `/vinculacion/supervisar` → pestaña **Podcast**. Junto al botón "Editar episodio" aparece **"Publicar en el sitio"**: confirma si hay menores y si la calidad de la foto es aceptable, y con un solo clic publica el video **y** la actividad/noticia asociada. Si marcas menores o mala calidad, no se publica nada y la foto queda descartada.
- **Asistencia:** al aprobar en `/vinculacion/supervisar` → pestaña **Asistencia**, ahora se piden las mismas dos casillas (menores y calidad). **No afecta las horas del pasante** — esas se acreditan igual; solo decide si la foto sirve para la web y los informes.
- **Cualquier otro evento o podcast** (uno donde te marcaron, o te marcaste tú mismo, como **profesor responsable**): entra a tu cola personal en **`/portal/dashboard` → "Mis aprobaciones"** (`/portal/aprobaciones`). Ahí ves cada pendiente, confirmas menores/calidad y apruebas. **Puedes aprobar tu propio registro** si eres el único responsable — no necesitas que otra persona lo revise.
- **Administración del sitio** (`contenido_sitio`) sigue pudiendo aprobar cualquier cosa desde `/admin/videos` y `/admin/contenido`, y puede despublicar lo que sea en cualquier momento — esto no le quita ese control, solo deja de ser el único paso obligatorio.

## 🖼️ Gestión del Sitio — Banco de fotos (administración)

`/admin/photos` es el banco único de fotos: filtros (origen, ubicación, sin ubicar, proyecto, fechas, menores, estado), selección múltiple y **Publicar en…**. Las fotos con **"Menores: revisar"** (externos, asistencia) **no se publican** hasta que las marques como **revisadas** ("Marcar sin menores"); las de **"Mala calidad"** tampoco, hasta "Marcar calidad aceptable". La **portada** solo la administra administración del sitio, pero un líder puede **proponer** una foto de su proyecto (botón "Proponer para portada"); revísalas con el filtro **Estado → "Propuestas para portada"** y decide con **Aprobar para portada** o **Rechazar propuesta** (no borra la foto, solo la saca de la cola). Las galerías de proyecto (Docencia, RED LEA, Club de Inglés, y las de cada proyecto) ya no muestran siempre las mismas fotos en el mismo orden: rotan, con las más recientes siempre presentes y el resto saliendo por turnos — no hace falta reordenarlas a mano cada vez que publicas una nueva.

## 🔬 Perfil: Investigación (hoy: Jhonny, German, Cristina, Johana)

Tarjeta **"Gestionar Investigación"** — dos funciones:

- **» Administrar Espacios** (`/investigacion/espacios`) — crear/listar espacios de investigación.
- **» Informes Mensuales** (`/investigacion/informes`) — elige un rango de fechas, el sistema trae las actividades/publicaciones/episodios de podcast de ese período, genera un resumen ejecutivo asistido por IA y arma el documento descargable. Queda guardado un historial de los informes generados anteriormente.

---

## 📝 Perfil: Cualquier Docente — Contribuciones Académicas y Utilidades

Dos tarjetas visibles a cualquier profesor con cuenta, sin importar su área:

- **» Contribuciones Académicas** (`/contribuciones/new`) — registra tu producción académica (artículos, libros, capítulos, memorias de evento, propiedad intelectual) con los campos específicos según el tipo elegido. El listado completo (`/contribuciones`) solo lo ve quien tiene el módulo `admin`.
- **» Utilidades** (`/utilidades`) — generador de documentos de trámite de la carrera: Acta Técnica, Oficios, Convocatorias (a docentes o estudiantes vía Excel), PATs de Maestría, Pares Lectores (evaluación de trabajos de titulación) y Certificados. Todos con redacción asistida por IA para los campos de texto libre, y selector de docentes/autoridades ya cargado (no hace falta escribir nombres a mano).

---

## 🎤 Perfil: Cualquier Docente — Gestión de Carrera

Tarjeta **"Gestión de Carrera"**, visible a cualquier profesor sin importar su área. `/gestion-carrera` — registro de eventos generales de la carrera, distinto del formulario simple de Difusión que usa el estudiante-instructor:

- **Categoría**: Investigación (indica el proyecto) / Vinculación / Asignatura (indica el nombre de la materia).
- Tipo de evento, número de asistentes, descripción, fecha, hora, observaciones (opcional), foto (opcional).

---

## 📊 Perfil: Indicadores (módulo `admin`)

Disponible para cualquier docente (profesor/admin). Desde Sesión 49 se entra por la tarjeta **"Yo y la Carrera"** → **» Ver Dashboard PINE** (`/pine-dashboard`; ya no existe la tarjeta "Indicadores" aparte; `/investigacion/informes` sigue requiriendo el módulo `admin`/`investigacion`), agrupado por áreas (Vinculación e Investigación):
- **Diagnóstico MCER (Pre-Test) — Semestre Actual:** Beneficiarios evaluados en test inicial respecto al total de inscritos en talleres (cobertura diagnóstica en tiempo real).
- **Evaluaciones Finales (Post-Test) — Meta Proyecto (2 Años):** Avance de los participantes que culminan su evaluación final al cierre de ciclo respecto a la meta de 100 evaluados.
- **Beneficiarios Inscritos & Atendidos:** Cantidad de beneficiarios asignados a talleres sobre el total de registrados en la plataforma.
- **Horas Acreditadas de Vinculación y Práctica:** Suma de horas acumuladas de pasantes en docencia, podcasts e investigación.
- **Satisfacción Promedio:** Promedio sobre 5.0 obtenido en encuestas de satisfacción.
- **Audiencia de Difusión:** Alcance semestral acumulado en eventos y podcasts.
- **Investigadores Vinculados:** Estudiantes de la carrera vinculados a procesos de investigación (con módulo asignado o actividades reportadas).
- **Contribuciones Académicas:** Desglose por tipo de publicaciones (artículos regionales, alto impacto, libros, capítulos, memorias y propiedad intelectual).

---

## 🛠️ Gestión del Sitio (contenido público)

Distinto de todo lo anterior — es para editar el contenido de la página pública (miembros del equipo, publicaciones, videos, noticias, documentos). Tarjeta **"Gestión del Sitio"** → `/admin`, requiere el mismo login del Portal con el módulo `contenido_sitio` — **restringido solo a Arturo Rodríguez y Jhonny Villafuerte** (líder/colíder de este proyecto), no es lo mismo que el módulo `admin` de Indicadores.

**Ocultar un registro sin borrarlo:** en Noticias, Actividades, Publicaciones, Podcast y Miembros, la columna verde/gris de la tabla (según el módulo dice "Visible en el sitio", "Visible en /noticias" o "Visible en /actividades") es un botón — un clic lo saca de la página pública al instante, sin perder el registro ni su contenido; otro clic lo vuelve a mostrar. Es distinto de **Eliminar**, que sí borra la fila para siempre. La columna "Destacado" (en Noticias y Podcast) también es clickeable directo desde la tabla, sin necesidad de abrir "Editar".

**Buscar y paginar:** arriba de cada tabla hay un cuadro de búsqueda (filtra por título, autor, descripción, email, etc.) y un selector de "Mostrar 10/25/50/100 por página" — útil cuando la lista crece. Abajo de la tabla, "Anterior"/"Siguiente" para moverse entre páginas.

**Banco de Fotos:** sección "Fotos" del panel — sube una imagen, ponele un título y elegí dónde aparece (hoy: portada del sitio, carrusel principal). Ocultar/mostrar/eliminar funciona igual que el resto de tablas.

**Proyectos:** sección "Proyectos" del panel — ocultá o reordená cualquier proyecto o red (incluida RED LEA) del menú del sitio sin necesidad de pedirle a un programador que edite código. También podés crear un proyecto nuevo completo (portada, texto de integración, contacto) si es del tipo simple — los proyectos con página propia más elaborada (RED LEA, Vinculación, Docencia, Internacionalización) solo se pueden ocultar/reordenar desde acá, su contenido interno sigue necesitando a un programador.

---

## 🔐 Superadmin

Módulo de administración avanzada restringido a la cuenta de Superadmin (`/superadmin`). Ofrece acceso a las siguientes herramientas principales:

1. **Explorador de Tablas y Consola SQL (`/superadmin/sql`):** Exploración directa de tablas y ejecución de consultas en Neon Postgres.
2. **Funcionalidad "Ver como" / Impersonación (`/superadmin/ver-como`):**
   - Permite al Superadmin navegar por la plataforma asumiendo temporalmente el rol e identidad de cualquier persona registrada (docente, estudiante, beneficiario, admin).
   - **Filtro 1 (Casillas de Verificación):** Permite filtrar usuarios seleccionando sus roles principales, sus módulos de acceso asignados y detectar **quiénes poseen accesos múltiples (2+ módulos)**.
   - **Filtro 2 (Búsqueda por Persona):** Búsqueda por nombre, apellido, correo o cédula.
   - **Barra Flotante Global:** Durante el modo *"Ver como"*, se despliega una barra amarilla superior fija en todo el sitio indicando la persona actual y ofreciendo el botón `↩ Volver a Superadmin` para restaurar la sesión en un solo clic.
   - **Log de Auditoría (`/superadmin/audit`):** Guarda la trazabilidad completa de cada evento de impersonación.

---

## Nota para quien ya tenía cuenta antes de agosto 2026

El sistema de asistencia viejo (con cuentas de Andy Castillo, Josselyn Mera y Ailys Bailón) fue reemplazado — esas cuentas quedaron huérfanas y sus contraseñas no se pueden recuperar. Si eras parte de ese grupo, **regístrate de nuevo** como el rol que te corresponda (ver tabla al inicio del manual).
