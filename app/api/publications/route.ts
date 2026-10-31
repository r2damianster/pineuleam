import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const { searchParams } = new URL(request.url);

    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : null;
    const page = searchParams.get('page') ? Math.max(1, parseInt(searchParams.get('page')!, 10)) : 1;
    const category = searchParams.get('category');
    const query = searchParams.get('q');
    const offset = limit ? (page - 1) * limit : 0;
    const searchPattern = query ? `%${query}%` : null;
    // ?all=true (usado solo por /admin/publications) trae también las ocultas
    // (activo=false) para poder reactivarlas — el sitio público nunca lo manda.
    const incluirInactivas = searchParams.get('all') === 'true';

    // Los artículos publicados y aprobados de Contribuciones se reflejan solos en el sitio público,
    // salvo que ya estén en `publications` (mismo título o mismo DOI/enlace). En el listado de admin
    // (?all=true) no se mezclan: ahí solo se editan filas de `publications`.
    const articulosDeContribuciones = sql`
      SELECT 'contrib_' || c.id AS id, c.titulo AS title,
        COALESCE((SELECT string_agg(a."authorName", ', ' ORDER BY a."order") FROM "ContributionAuthor" a WHERE a."contributionId" = c.id), '') AS authors,
        c."campoDetallado" AS abstract, c."fechaPublicacion"::date AS publication_date,
        COALESCE(c."linkPublicacion", c."codigoPublicacion") AS doi_link, NULL::text AS pdf_file, NULL::text AS cover_image,
        'article'::text AS type,
        CASE WHEN c."tipoPublicacion" = 'ARTICULO_ALTO_IMPACTO' THEN 'impacto' ELSE 'regional' END AS category,
        c."fechaSubida" AS created, c."fechaSubida" AS updated, true AS activo
      FROM "Contribution" c
      WHERE ${!incluirInactivas}::boolean
        AND c."tipoPublicacion" IN ('ARTICULO_REGIONAL', 'ARTICULO_ALTO_IMPACTO')
        AND c.estado = 'PUBLICADO' AND c.aprobada = true
        AND NOT EXISTS (
          SELECT 1 FROM publications p
          WHERE lower(trim(p.title)) = lower(trim(c.titulo))
            OR (p.doi_link IS NOT NULL AND p.doi_link IN (c."linkPublicacion", c."codigoPublicacion"))
        )
    `;

    const todas = sql`
      SELECT * FROM (
        SELECT id, title, authors, abstract, publication_date, doi_link, pdf_file, cover_image, type, category, created, updated, activo FROM publications
        UNION ALL
        ${articulosDeContribuciones}
      ) AS todas
      WHERE (${category}::text IS NULL OR category = ${category})
        AND (${searchPattern}::text IS NULL OR title ILIKE ${searchPattern} OR authors ILIKE ${searchPattern})
        AND (${incluirInactivas} OR activo = true)
    `;

    const publications = await sql`
      ${todas}
      ORDER BY publication_date DESC
      ${limit ? sql`LIMIT ${limit} OFFSET ${offset}` : sql``}
    `;

    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM (${todas}) AS contadas`;

    if (!limit) {
      return NextResponse.json(publications);
    }
    return NextResponse.json({ publications, total: count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !usuario.modulos_acceso.includes('contenido_sitio')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { title, authors, abstract, publication_date, doi_link, pdf_file, cover_image, type, category } = await request.json();
    if (!title || !authors || !abstract || !publication_date || !type || !category) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const id = `pub_${Date.now()}`;
    const [nueva] = await sql`
      INSERT INTO publications (id, title, authors, abstract, publication_date, doi_link, pdf_file, cover_image, type, category)
      VALUES (${id}, ${title}, ${authors}, ${abstract}, ${publication_date}, ${doi_link || null}, ${pdf_file || null}, ${cover_image || null}, ${type}, ${category})
      RETURNING *
    `;
    return NextResponse.json(nueva, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
