// lib/poster/types.ts
// Tipos compartidos del generador de roll up / póster (SVG vectorial). Sin dependencias de DOM.

export type PosterElement =
  | { kind: 'rect'; x: number; y: number; width: number; height: number; radius?: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { kind: 'image'; href: string; x: number; y: number; width: number; height: number; fit?: 'slice' | 'meet'; clipPathData?: string; opacity?: number }
  | { kind: 'path'; d: string; fill?: string; opacity?: number; transformY?: number };

export interface PosterBlock {
  id: string;
  height: number;
  elements: PosterElement[];
}

export interface PlacedBlock extends PosterBlock {
  x: number;
  y: number;
}

export interface Composition {
  designWidth: number;
  designHeight: number;
  placed: PlacedBlock[];
  dropped: string[];
  overflow: boolean;
}

/** Imagen ya descargada y reducida, lista para incrustarse como data URL. */
export interface PosterImage {
  href: string;
  width: number;
  height: number;
}

export interface PosterFonts {
  sans: any;
  sansBold: any;
  serif: any;
  serifItalic: any;
}

export interface PosterTheme {
  id: string;
  nombre: string;
  primary: string;
  accent: string;
  accentLight: string;
  paper: string;
  ink: string;
  muted: string;
  tint: string;
}

/** Cuánto pesa el texto frente a las imágenes en la composición. */
export type PosterDensity = 'texto' | 'equilibrado' | 'imagenes';

export interface PosterContent {
  kicker: string;
  title: string;
  subtitle: string;
  description: string;
  itemsTitle: string;
  items: string[];
  stats: { n: string; l: string }[];
  objectivesTitle: string;
  /** tipo 'general' se rotula «Objetivo general»; los demás van como lista de específicos. */
  objectives: { tipo: string; text: string }[];
  detailsTitle: string;
  details: { label: string; value: string }[];
  teamTitle: string;
  leader: string;
  team: string[];
  scanLabel: string;
  url: string;
  contact: string;
}

export interface PosterSize {
  id: string;
  widthCm: number;
  heightCm: number;
  group: string;
  label: string;
}
