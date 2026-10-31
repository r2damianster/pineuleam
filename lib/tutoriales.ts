// Catálogo de videos tutoriales del Portal PINE.
// Sin imports de Node/Neon: se usa desde páginas y, si hace falta, desde middleware.
// Cada tutorial declara a qué roles (usuarios.rol) se muestra; la página /portal/tutoriales
// filtra por el rol de la sesión. Para agregar uno: copiar el MP4 a public/video/ y sumar
// una entrada aquí.

export interface Tutorial {
  id: string;
  titulo: string;
  descripcion: string;
  duracion: string; // texto para mostrar, ej. "1:26"
  archivo: string; // ruta pública del MP4
  roles: string[]; // valores de usuarios.rol que lo ven
}

export const TUTORIALES: Tutorial[] = [
  {
    id: 'rollup',
    titulo: 'Roll up y pósters: crea el cartel de la carrera o de tu proyecto',
    descripcion: 'Paso a paso en /portal/rollup: elegir carrera o proyecto, medida, tipografía y colores, datos y cifras con casilla, más texto o más imágenes, carrete de fotos y descarga en PDF. Recuerda: el roll up no se guarda, descárgalo.',
    duracion: '1:53',
    archivo: '/video/rollup-tutorial.mp4',
    roles: ['profesor', 'admin'],
  },
  {
    id: 'utilidades',
    titulo: 'Utilidades: generadores de documentos',
    descripcion: 'Recorrido por las 6 herramientas de /utilidades: Acta Técnica, Oficios, Convocatorias, PATs de Maestría, Pares Lectores y Certificados.',
    duracion: '1:26',
    archivo: '/video/utilidades-tutorial.mp4',
    roles: ['profesor', 'admin', 'secretaria'],
  },
  {
    id: 'contribucion-externa',
    titulo: 'Contribuciones por enlace: qué ve y qué hace quien lo recibe',
    descripcion: 'El mismo video que ve la persona externa al abrir tu enlace/QR: dónde están los datos, autocompletar por DOI o PDF y cómo agregar los autores en orden.',
    duracion: '1:17',
    archivo: '/video/contribucion-externa-tutorial.mp4',
    roles: ['profesor', 'admin'],
  },
  {
    id: 'contribucion-enlace-docente',
    titulo: 'Contribuciones: pide a tu estudiante que registre tu publicación',
    descripcion: 'Cómo generar el enlace/QR, enviarlo a tu estudiante o egresado y aprobar el registro para que sume a los indicadores de la carrera.',
    duracion: '1:13',
    archivo: '/video/contribucion-enlace-docente-tutorial.mp4',
    roles: ['profesor', 'admin'],
  },
];

// Mismo MP4 que muestra /enviar-contribucion/[token] (público, sin sesión).
export const TUTORIAL_CONTRIBUCION_EXTERNA = {
  duracion: '1:17',
  archivo: '/video/contribucion-externa-tutorial.mp4',
  poster: '/video/contribucion-externa-tutorial-poster.jpg',
};

export function tutorialesParaRol(rol: string | undefined | null): Tutorial[] {
  if (!rol) return [];
  return TUTORIALES.filter(tutorial => tutorial.roles.includes(rol));
}
