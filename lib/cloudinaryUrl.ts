// lib/cloudinaryUrl.ts
// Puro — sin dependencias de Node, Neon ni Next.
// Genera miniaturas Cloudinary insertando transformaciones en la URL.

/**
 * Genera una URL de miniatura Cloudinary con ancho y calidad automáticos.
 * Si `url` no es una URL de Cloudinary (no contiene "/upload/"), devuelve url sin cambios.
 * Nunca lanza — es seguro usarlo con cualquier string.
 */
export function imagenCloudinary(url: string | null | undefined, ancho = 1800): string {
  if (!url) return '';
  const uploadIdx = url.indexOf('/upload/');
  if (uploadIdx === -1) return url;
  const transformacion = `w_${ancho},c_limit,q_auto:good,f_jpg`;
  return url.slice(0, uploadIdx + '/upload/'.length) + transformacion + '/' + url.slice(uploadIdx + '/upload/'.length);
}

export function miniaturaCloudinary(url: string | null | undefined, ancho = 400): string {
  if (!url) return '';
  const uploadIdx = url.indexOf('/upload/');
  if (uploadIdx === -1) return url; // ruta local o URL externa
  const transformacion = `w_${ancho},c_fill,q_auto,f_auto`;
  return url.slice(0, uploadIdx + '/upload/'.length) + transformacion + '/' + url.slice(uploadIdx + '/upload/'.length);
}
