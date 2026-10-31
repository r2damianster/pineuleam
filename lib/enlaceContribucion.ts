// Helpers de enlaces_contribucion (QR/enlace público para enviar una contribución académica).
// Sin imports de Node: los usa tanto el servidor como el cliente.

export const TIPOS_PUBLICACION = [
  'ARTICULO_REGIONAL',
  'ARTICULO_ALTO_IMPACTO',
  'LIBRO',
  'CAPITULO_LIBRO',
  'MEMORIA_EVENTO',
  'PROPIEDAD_INTELECTUAL',
] as const;

export type TipoPublicacionEnlace = typeof TIPOS_PUBLICACION[number];

export const TIPO_PUBLICACION_LABEL: Record<TipoPublicacionEnlace, string> = {
  ARTICULO_REGIONAL: 'Artículo regional',
  ARTICULO_ALTO_IMPACTO: 'Artículo de alto impacto',
  LIBRO: 'Libro',
  CAPITULO_LIBRO: 'Capítulo de libro',
  MEMORIA_EVENTO: 'Publicación en memoria de evento',
  PROPIEDAD_INTELECTUAL: 'Propiedad intelectual',
};

export const MAX_AUTORES = 6;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esTokenValido(token: string): boolean {
  return UUID.test(token);
}

interface FilaEnlace {
  expira_en: string | Date;
  max_usos: number | null;
  usos_actuales: number;
  activo: boolean;
}

// null = vigente; si no, el motivo por el que ya no sirve.
export function motivoEnlaceNoVigente(enlace: FilaEnlace): 'revocado' | 'expirado' | 'agotado' | null {
  if (!enlace.activo) return 'revocado';
  if (new Date(enlace.expira_en).getTime() <= Date.now()) return 'expirado';
  if (enlace.max_usos !== null && enlace.usos_actuales >= enlace.max_usos) return 'agotado';
  return null;
}

// Menor número de orden libre (1..MAX_AUTORES) dado los ya usados; null si no queda ninguno.
export function siguienteOrdenLibre(ordenesUsados: number[]): number | null {
  for (let orden = 1; orden <= MAX_AUTORES; orden++) {
    if (!ordenesUsados.includes(orden)) return orden;
  }
  return null;
}
