import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import type { ItemProduccion, TipoProduccion } from '@/lib/produccion';

// Producción académica pública: une `Contribution` (fuente de periodo y proyecto) con `publications`
// (descripción curada, PDF, portada). Nunca expone datos personales (cédula, correo, creador).

const TIPO_POR_CONTRIBUCION: Record<string, TipoProduccion> = {
  ARTICULO_REGIONAL: 'articulo',
  ARTICULO_ALTO_IMPACTO: 'articulo',
  LIBRO: 'libro',
  CAPITULO_LIBRO: 'capitulo',
  MEMORIA_EVENTO: 'ponencia',
  PROPIEDAD_INTELECTUAL: 'propiedad',
};

const LARGO_MAXIMO_DESCRIPCION = 220;

const normalizarTitulo = (titulo: string) => titulo.trim().toLowerCase();

// Periodos del proyecto: enero–agosto = N-1, septiembre–diciembre = N-2.
function periodoDeFecha(fecha: string): string {
  const [anio, mes] = fecha.split('-').map(Number);
  return `${anio}-${mes >= 9 ? 2 : 1}`;
}

function acortar(texto: string): string {
  const limpio = (texto || '').replace(/\s+/g, ' ').trim();
  if (limpio.length <= LARGO_MAXIMO_DESCRIPCION) return limpio;
  const corte = limpio.slice(0, LARGO_MAXIMO_DESCRIPCION);
  const ultimoEspacio = corte.lastIndexOf(' ');
  return `${corte.slice(0, ultimoEspacio > 120 ? ultimoEspacio : LARGO_MAXIMO_DESCRIPCION).replace(/[.,;:\s]+$/, '')}…`;
}

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });

    const [contribuciones, publicaciones, proyectos] = await Promise.all([
      sql`
        SELECT c.id, c."tipoPublicacion" AS tipo, c.titulo, c."nombreRevista", c."nombreEvento", c.ciudad,
          c."claseDeObra", c."campoDetallado" AS descripcion, c."fechaPublicacion"::date::text AS fecha,
          c."periodoAcademico" AS periodo, c."proyectoId", c."linkPublicacion", c."codigoPublicacion",
          COALESCE((SELECT string_agg(a."authorName", ', ' ORDER BY a."order") FROM "ContributionAuthor" a WHERE a."contributionId" = c.id), '') AS autores
        FROM "Contribution" c
        WHERE c.aprobada = true
          AND (c."tipoPublicacion" IN ('MEMORIA_EVENTO', 'PROPIEDAD_INTELECTUAL') OR c.estado = 'PUBLICADO')
      `,
      sql`
        SELECT id, title, authors, abstract, publication_date::date::text AS fecha, doi_link, pdf_file, type, category
        FROM publications WHERE activo = true
      `,
      sql`SELECT id, nombre_oficial FROM proyectos`,
    ]);

    const nombreProyecto = new Map<string, string>(proyectos.map((proyecto) => [proyecto.id, proyecto.nombre_oficial]));
    const publicacionesUsadas = new Set<string>();

    const items: ItemProduccion[] = contribuciones.map((contribucion) => {
      const tipo = TIPO_POR_CONTRIBUCION[contribucion.tipo] ?? 'articulo';
      const enlaces = [contribucion.linkPublicacion, contribucion.codigoPublicacion].filter(Boolean);
      const publicacion = publicaciones.find(
        (candidata) =>
          normalizarTitulo(candidata.title) === normalizarTitulo(contribucion.titulo) ||
          (candidata.doi_link && enlaces.includes(candidata.doi_link)),
      );
      if (publicacion) publicacionesUsadas.add(publicacion.id);

      const fuente =
        tipo === 'ponencia'
          ? [contribucion.nombreEvento, contribucion.ciudad].filter(Boolean).join(' · ')
          : tipo === 'propiedad'
            ? contribucion.claseDeObra
            : contribucion.nombreRevista;

      return {
        id: `contrib_${contribucion.id}`,
        tipo,
        categoria: tipo === 'articulo' ? (contribucion.tipo === 'ARTICULO_ALTO_IMPACTO' ? 'impacto' : 'regional') : null,
        titulo: contribucion.titulo,
        autores: publicacion?.authors || contribucion.autores,
        fecha: contribucion.fecha,
        periodo: contribucion.periodo,
        proyectoId: contribucion.proyectoId,
        proyectoNombre: contribucion.proyectoId ? (nombreProyecto.get(contribucion.proyectoId) ?? null) : null,
        fuente: fuente || null,
        descripcion: acortar(publicacion?.abstract || contribucion.descripcion),
        enlace: publicacion?.doi_link || contribucion.linkPublicacion || null,
        pdf: publicacion?.pdf_file || null,
      };
    });

    // Publicaciones cargadas a mano que no están en Contribuciones: sin proyecto asignado, periodo según la fecha.
    for (const publicacion of publicaciones) {
      if (publicacionesUsadas.has(publicacion.id)) continue;
      const esLibro = publicacion.type === 'book';
      items.push({
        id: publicacion.id,
        tipo: esLibro ? 'libro' : 'articulo',
        categoria: esLibro ? null : publicacion.category === 'impacto' ? 'impacto' : 'regional',
        titulo: publicacion.title,
        autores: publicacion.authors,
        fecha: publicacion.fecha,
        periodo: periodoDeFecha(publicacion.fecha),
        proyectoId: null,
        proyectoNombre: null,
        fuente: null,
        descripcion: acortar(publicacion.abstract),
        enlace: publicacion.doi_link || null,
        pdf: publicacion.pdf_file || null,
      });
    }

    items.sort((primero, segundo) => segundo.fecha.localeCompare(primero.fecha));
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
