// lib/poster/assets.ts
// Carga de fuentes (opentype) e imágenes (data URL reducida). Solo navegador.

import type { PosterFonts, PosterImage } from './types';

export interface FontPairOption {
  id: string;
  nombre: string;
  descripcion: string;
  sans: string;
  sansBold: string;
  serif: string;
  serifItalic: string;
}

// Formato .woff (opentype.js 1.3.4 no lee woff2). Archivos en public/fonts/poster/.
export const FONT_PAIRS: FontPairOption[] = [
  {
    id: 'institucional',
    nombre: 'Institucional',
    descripcion: 'Inter + Merriweather — sobria, muy legible a distancia',
    sans: 'inter-latin-400-normal.woff',
    sansBold: 'inter-latin-600-normal.woff',
    serif: 'merriweather-latin-400-normal.woff',
    serifItalic: 'merriweather-latin-400-italic.woff',
  },
  {
    id: 'editorial',
    nombre: 'Editorial',
    descripcion: 'Montserrat + Playfair Display — más elegante y de revista',
    sans: 'montserrat-latin-500-normal.woff',
    sansBold: 'montserrat-latin-700-normal.woff',
    serif: 'playfair-display-latin-400-normal.woff',
    serifItalic: 'playfair-display-latin-400-italic.woff',
  },
];

const fontCache = new Map<string, PosterFonts>();

export async function loadFontPair(pairId: string): Promise<PosterFonts> {
  const cached = fontCache.get(pairId);
  if (cached) return cached;
  const pair = FONT_PAIRS.find((option) => option.id === pairId) ?? FONT_PAIRS[0];
  const opentypeModule: any = await import('opentype.js');
  const opentype = opentypeModule.default ?? opentypeModule;
  const loadOne = async (fileName: string) => {
    const response = await fetch(`/fonts/poster/${fileName}`);
    if (!response.ok) throw new Error(`No se pudo cargar la fuente ${fileName}`);
    return opentype.parse(await response.arrayBuffer());
  };
  const [sans, sansBold, serif, serifItalic] = await Promise.all([
    loadOne(pair.sans), loadOne(pair.sansBold), loadOne(pair.serif), loadOne(pair.serifItalic),
  ]);
  const fonts: PosterFonts = { sans, sansBold, serif, serifItalic };
  fontCache.set(pairId, fonts);
  return fonts;
}

const MAX_PHOTO_SIDE = 2000;

function readImageSize(href: string): Promise<{ width: number; height: number; element: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve({ width: element.naturalWidth, height: element.naturalHeight, element });
    element.onerror = () => reject(new Error('No se pudo leer la imagen'));
    element.src = href;
  });
}

/**
 * Convierte cualquier imagen (URL o data URL) en una data URL JPEG reducida a MAX_PHOTO_SIDE.
 * Incrustar la foto es lo que vuelve el SVG autónomo y permite rasterizarlo (PNG) y exportarlo (PDF).
 */
export async function fetchPhotoAsDataUrl(sourceUrl: string): Promise<PosterImage> {
  let objectUrl: string | null = null;
  let imageSource = sourceUrl;
  if (!sourceUrl.startsWith('data:') && !sourceUrl.startsWith('blob:')) {
    const response = await fetch(sourceUrl, { mode: 'cors' });
    if (!response.ok) throw new Error('No se pudo descargar la foto');
    objectUrl = URL.createObjectURL(await response.blob());
    imageSource = objectUrl;
  }
  try {
    const { width, height, element } = await readImageSize(imageSource);
    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('El navegador no permite procesar imágenes');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(element, 0, 0, canvas.width, canvas.height);
    return { href: canvas.toDataURL('image/jpeg', 0.86), width: canvas.width, height: canvas.height };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

/** Logos de /public: se guardan con su tamaño real para calcular proporciones (nunca a mano). */
export async function loadLogo(path: string): Promise<PosterImage | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    const blob = await response.blob();
    const href: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const { width, height } = await readImageSize(href);
    return { href, width, height };
  } catch {
    return null;
  }
}
