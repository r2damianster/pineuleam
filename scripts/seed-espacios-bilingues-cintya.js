// Crea 2 espacios de Vinculación supervisados por Cintya Zambrano (usuarios.id = 8) y asigna a 14 pasantes
// como "apoyo": su supervisor titular original NO cambia (podcast/investigación/autónomas siguen con él);
// Cintya aprueba las asistencias de estos espacios. Idempotente (por nombre de espacio y por pareja espacio+usuario).
// Zona geográfica copiada de los espacios 11/12 (mismas sedes bilingües). Cíclo: el mismo de esos espacios.
// Uso: node --env-file=.env.local scripts/seed-espacios-bilingues-cintya.js
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const SUPERVISORA_EMAIL = 'cintya.zambrano@uleam.edu.ec';

const GRUPOS = [
  {
    nombre: 'Básica Bilingüe - Grupo Cintya',
    referenciaId: 11,
    pasantes: [36, 37, 39, 49, 45, 47, 50],
  },
  {
    nombre: 'Inicial Bilingüe - Grupo Cintya',
    referenciaId: 12,
    pasantes: [35, 38, 40, 43, 46, 48, 44],
  },
];

async function run() {
  const [supervisora] = await sql`SELECT id FROM usuarios WHERE email = ${SUPERVISORA_EMAIL}`;
  if (!supervisora) throw new Error(`No existe ${SUPERVISORA_EMAIL}`);

  for (const grupo of GRUPOS) {
    const [referencia] = await sql`SELECT * FROM "espacios_enseñanza" WHERE id = ${grupo.referenciaId}`;
    let [espacio] = await sql`SELECT id FROM "espacios_enseñanza" WHERE nombre = ${grupo.nombre} AND area = 'vinculacion'`;
    if (!espacio) {
      [espacio] = await sql`
        INSERT INTO "espacios_enseñanza"
          (nombre, tipo, ciclo_id, profesor_id, area, categoria, usa_aulas, entidad_id,
           zona_canton, zona_parroquia, zona_barrio, zona_ubicacion)
        VALUES
          (${grupo.nombre}, ${referencia.tipo}, ${referencia.ciclo_id}, ${supervisora.id}, 'vinculacion', ${referencia.categoria}, false, ${referencia.entidad_id},
           ${referencia.zona_canton}, ${referencia.zona_parroquia}, ${referencia.zona_barrio}, ${referencia.zona_ubicacion})
        RETURNING id`;
      console.log(`Espacio creado: ${grupo.nombre} (id ${espacio.id})`);
    } else {
      console.log(`Espacio ya existía: ${grupo.nombre} (id ${espacio.id})`);
    }

    for (const pasanteId of grupo.pasantes) {
      await sql`
        INSERT INTO espacio_instructores (espacio_id, usuario_id, tipo)
        VALUES (${espacio.id}, ${pasanteId}, 'apoyo')
        ON CONFLICT (espacio_id, usuario_id) DO NOTHING`;
    }
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM espacio_instructores WHERE espacio_id = ${espacio.id}`;
    console.log(`  ${n} instructores en el espacio`);
  }
}
run().catch(e => { console.error(e); process.exit(1); });
// Rollback: DELETE FROM espacio_instructores WHERE espacio_id IN (SELECT id FROM "espacios_enseñanza" WHERE nombre LIKE '%- Grupo Cintya' AND nombre LIKE '%Bilingüe%');
//           DELETE FROM "espacios_enseñanza" WHERE nombre IN ('Básica Bilingüe - Grupo Cintya','Inicial Bilingüe - Grupo Cintya');
