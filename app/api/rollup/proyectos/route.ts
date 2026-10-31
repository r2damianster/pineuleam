// app/api/rollup/proyectos/route.ts
// Proyectos activos con los datos que precargan el roll up (título, líder, equipo, textos).
// Cualquier docente puede generar un roll up de cualquier proyecto: solo lee datos ya públicos del sitio.

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { esDocente } from '@/lib/modulos';
import { obtenerCifrasCarrera, obtenerDatosRollup } from '@/lib/rollupDatos';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sesion = await getAppSessionFromCookies();
    if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!esDocente(sesion)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const sql = neon(process.env.DATABASE_URL!);
    const proyectos = await sql`
      SELECT * FROM proyectos
      WHERE activo = true
      ORDER BY "order" ASC, nombre_oficial ASC
    `;
    const miembros = await sql`
      SELECT name, role, is_leader, projects
      FROM members
      WHERE activo = true
      ORDER BY "order" ASC
    `;
    const resultado = await Promise.all(proyectos.map(async (proyecto: any) => ({
      id: proyecto.id,
      slug: proyecto.slug,
      nombre_oficial: proyecto.nombre_oficial,
      lider_nombre: proyecto.lider_nombre,
      hero_subtitle_es: proyecto.hero_subtitle_es,
      hero_description_es: proyecto.hero_description_es,
      info_text_es: proyecto.info_text_es,
      ...(await obtenerDatosRollup(sql, proyecto)),
      equipo: miembros
        .filter((miembro: any) => Array.isArray(miembro.projects) && miembro.projects.includes(proyecto.id))
        .map((miembro: any) => ({ name: miembro.name, role: miembro.role, is_leader: miembro.is_leader })),
    })));
    // Roll up general de la carrera: proyecto virtual (no existe en la tabla). Los textos oficiales
    // (misión, visión, objetivo general…) los aporta el cliente desde lib/i18n.tsx para no duplicarlos.
    resultado.unshift({
      id: 'carrera',
      slug: 'carrera-pine',
      nombre_oficial: 'Pedagogía de los Idiomas Nacionales y Extranjeros',
      lider_nombre: null,
      hero_subtitle_es: null,
      hero_description_es: null,
      info_text_es: null,
      cifras_disponibles: await obtenerCifrasCarrera(sql),
      objetivos: [],
      detalles: [],
      equipo: [],
    });
    return NextResponse.json(resultado);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
