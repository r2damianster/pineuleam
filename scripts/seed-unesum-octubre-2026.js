// Conferencias en la UNESUM (octubre 2026): contribución (memoria de evento) + noticia por cada una.
// Uso: node --env-file=.env.local scripts/seed-unesum-octubre-2026.js [--apply]
// Sin --apply solo muestra lo que insertaría. Idempotente: omite títulos ya existentes.
import { PrismaClient } from '@prisma/client'
import { neon } from '@neondatabase/serverless'

const prisma = new PrismaClient()
const shouldApply = process.argv.includes('--apply')

const PROYECTO_NOMBRE_OFICIAL =
  'Lograr la innovación pedagógica e internacionalización del proceso de formación inicial y continua de docentes para el desarrollo humano y sostenible.'
const ARTURO = { authorName: 'Arturo Damián Rodríguez Zambrano', order: 1, isCarreraAuthor: true, esEstudiante: false, usuarioId: 1 }

const conferencias = [
  {
    fecha: '2026-10-22',
    hora: '10:30',
    titulo: 'Transformar para quién: aprendizaje, una aproximación al aprendizaje intergeneracional en la universidad',
    nombreEvento: 'XIX Seminario de Trabajo Científico Metodológico, UNESUM INNOVA 2026 — Jornada «Transformar para mejorar»',
    organizadorEvento: 'Dirección Académica, Universidad Estatal del Sur de Manabí (UNESUM)',
    ciudad: 'Jipijapa',
    participacion: 'Conferencista magistral',
    detalle:
      'Conferencia magistral dictada el 22 de octubre de 2026, de 10h30 a 12h00, en el Auditorio del Complejo Universitario de la UNESUM (Jipijapa), por invitación de la Dirección Académica (Oficio N.º 019 – UNESUM INNOVA 2026).',
    tipoNoticia: 'evento_fisico',
    descripcionNoticia:
      'El 22 de octubre de 2026, el Dr. Arturo Rodríguez Zambrano, líder del proyecto, dictó la conferencia magistral «Transformar para quién: aprendizaje, una aproximación al aprendizaje intergeneracional en la universidad» en el XIX Seminario de Trabajo Científico Metodológico UNESUM INNOVA 2026, de la Universidad Estatal del Sur de Manabí. La charla, de 10h30 a 12h00 en el Auditorio del Complejo Universitario, revisó cómo ha cambiado el concepto de generación a lo largo del tiempo y qué implica para la enseñanza universitaria. La participación fue por invitación de la Dirección Académica de la UNESUM.',
    foto: '/images/2026-10-22_ConferenciaMagistral-UNESUMInnova.jpg',
  },
  {
    fecha: '2026-10-30',
    hora: '14:00',
    titulo: 'Desarrollo y uso de aplicaciones en la universidad: perspectiva crítica desde la brecha generacional',
    nombreEvento: 'Semana de capacitación «Innovación y gestión del conocimiento en la transformación educativa»',
    organizadorEvento: 'Carrera de Desarrollo de Software, Universidad Estatal del Sur de Manabí (UNESUM)',
    ciudad: 'Jipijapa (modalidad virtual)',
    participacion: 'Conferencista',
    detalle:
      'Conferencia en línea presentada el 30 de octubre de 2026, 14h00 (hora de Manta), en la semana de capacitación organizada por la Carrera de Desarrollo de Software de la UNESUM.',
    tipoNoticia: 'evento_formacion',
    descripcionNoticia:
      'El 30 de octubre de 2026, a las 14h00 y en modalidad virtual, el Dr. Arturo Rodríguez Zambrano participó como conferencista en la semana de capacitación «Innovación y gestión del conocimiento en la transformación educativa», organizada por la Carrera de Desarrollo de Software de la Universidad Estatal del Sur de Manabí (UNESUM). Su exposición contrastó la etiqueta de «nativos digitales» con la evidencia disponible sobre la brecha generacional en el aprendizaje.',
    foto: null,
  },
]

async function main() {
  const sql = neon(process.env.DATABASE_URL)
  for (const conferencia of conferencias) {
    const label = `${conferencia.fecha} — ${conferencia.titulo.slice(0, 60)}`

    const contributionExists = await prisma.contribution.findFirst({ where: { titulo: conferencia.titulo } })
    if (contributionExists) console.log(`= contribución ya existe: ${label}`)
    else {
      console.log(`${shouldApply ? '+' : '~'} contribución: ${label}`)
      if (shouldApply) {
        await prisma.contribution.create({
          data: {
            tipoPublicacion: 'MEMORIA_EVENTO',
            proyecto: PROYECTO_NOMBRE_OFICIAL,
            proyectoId: 'internacionalizacion',
            titulo: conferencia.titulo,
            nombrePonencia: conferencia.titulo,
            nombreEvento: conferencia.nombreEvento,
            organizadorEvento: conferencia.organizadorEvento,
            pais: 'Ecuador',
            ciudad: conferencia.ciudad,
            fechaPublicacion: new Date(`${conferencia.fecha}T05:00:00.000Z`),
            campoDetallado: conferencia.detalle,
            estado: 'OTRO',
            filiacion: 'Universidad Laica Eloy Alfaro de Manabí',
            identificacionParticipante: '131041753-8',
            categoria: 'AUXILIAR_I',
            participacion: conferencia.participacion,
            lineaInvestigacion: 'Educación y Nuevos Escenarios de la Formación Profesional',
            periodoAcademico: '2026-2',
            creadoPorId: 1,
            origen: 'docente',
            aprobada: true,
            authors: { create: [ARTURO] },
          },
        })
      }
    }

    const noticeExists = await sql`select id from actividades_difusion where titulo = ${conferencia.titulo}`
    if (noticeExists.length) console.log(`= noticia ya existe: ${label}`)
    else {
      console.log(`${shouldApply ? '+' : '~'} noticia: ${label}`)
      if (shouldApply) {
        const photos = conferencia.foto ? [conferencia.foto] : []
        await sql`
          insert into actividades_difusion
            (titulo, tipo, fecha, hora, registrador_id, evidencia_url, categoria, descripcion,
             profesores_responsables, periodo_academico, origen, photos, aprobado_sitio, aprobado_por,
             fecha_aprobacion, area_sustantiva, proyecto_id, proyectos, publicar_noticias, publicar_actividades)
          values
            (${conferencia.titulo}, ${conferencia.tipoNoticia}, ${conferencia.fecha}, ${conferencia.hora}, 1,
             ${conferencia.foto}, 'investigacion', ${conferencia.descripcionNoticia},
             ${[1]}, '2026-2', 'difusion', ${photos}, true, 1,
             now(), 'investigacion', 'internacionalizacion', ${['internacionalizacion']}, true, false)`
      }
    }
  }
}

main().finally(() => prisma.$disconnect())
