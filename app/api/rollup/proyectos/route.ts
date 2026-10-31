// app/api/rollup/proyectos/route.ts
// Proyectos activos con los datos que precargan el roll up (título, líder, equipo, textos).
// Cualquier docente puede generar un roll up de cualquier proyecto: solo lee datos ya públicos del sitio.

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { esDocente } from '@/lib/modulos';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sesion = await getAppSessionFromCookies();
    if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!esDocente(sesion)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const sql = neon(process.env.DATABASE_URL!);
    const proyectos = await sql`
      SELECT id, slug, nombre_oficial, nav_label, es_red, lider_nombre,
             hero_subtitle_es, hero_description_es, info_text_es, integration_text_es
      FROM proyectos
      WHERE activo = true
      ORDER BY "order" ASC, nombre_oficial ASC
    `;
    const miembros = await sql`
      SELECT name, role, is_leader, projects
      FROM members
      WHERE activo = true
      ORDER BY "order" ASC
    `;
    const resultado = proyectos.map((proyecto: any) => ({
      ...proyecto,
      equipo: miembros
        .filter((miembro: any) => Array.isArray(miembro.projects) && miembro.projects.includes(proyecto.id))
        .map((miembro: any) => ({ name: miembro.name, role: miembro.role, is_leader: miembro.is_leader })),
    }));
    return NextResponse.json(resultado);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
