// lib/poster/themes.ts
// Paletas y medidas. Un tema solo cambia colores; el motor y los bloques son los mismos para todos los proyectos.

import type { PosterSize, PosterTheme } from './types';

const BASE = { paper: '#FFFFFF', ink: '#1F2937', muted: '#5B6573' };

export const POSTER_THEMES: PosterTheme[] = [
  { id: 'uleam', nombre: 'Azul ULEAM', primary: '#003366', accent: '#C99700', accentLight: '#FFD700', tint: '#EEF3F9', ...BASE },
  { id: 'vinculacion', nombre: 'Verde Vinculación', primary: '#0B5D4B', accent: '#1E9C86', accentLight: '#7FE0CC', tint: '#EAF6F3', ...BASE },
  { id: 'docencia', nombre: 'Ámbar Docencia', primary: '#7A3B0B', accent: '#D9822B', accentLight: '#FFC36E', tint: '#FBF1E6', ...BASE },
  { id: 'redlea', nombre: 'Violeta RED LEA', primary: '#44256F', accent: '#B04A8F', accentLight: '#F0A6D4', tint: '#F3EEF9', ...BASE },
  { id: 'habilidades', nombre: 'Celeste Habilidades', primary: '#1A3A6B', accent: '#3A9ECC', accentLight: '#9AD7F2', tint: '#EAF3FA', ...BASE },
  { id: 'mentoring', nombre: 'Vino Mentoring', primary: '#6E1A3E', accent: '#C2457A', accentLight: '#F4A9C8', tint: '#F9ECF2', ...BASE },
];

// Tema sugerido al elegir un proyecto (la persona puede cambiarlo).
export const TEMA_POR_PROYECTO: Record<string, string> = {
  carrera: 'uleam',
  internacionalizacion: 'uleam',
  vinculacion: 'vinculacion',
  docencia_innovadora: 'docencia',
  redlea: 'redlea',
  desarrollo_habilidades: 'habilidades',
  mentoring: 'mentoring',
};

export function themeById(themeId: string): PosterTheme {
  return POSTER_THEMES.find((theme) => theme.id === themeId) ?? POSTER_THEMES[0];
}

export const POSTER_SIZES: PosterSize[] = [
  { id: 'rollup-85x200', widthCm: 85, heightCm: 200, group: 'Roll up', label: 'Roll up 85 × 200 cm' },
  { id: 'rollup-80x200', widthCm: 80, heightCm: 200, group: 'Roll up', label: 'Roll up 80 × 200 cm' },
  { id: 'rollup-100x200', widthCm: 100, heightCm: 200, group: 'Roll up', label: 'Roll up 100 × 200 cm' },
  { id: 'rollup-120x200', widthCm: 120, heightCm: 200, group: 'Roll up', label: 'Roll up 120 × 200 cm' },
  { id: 'a0', widthCm: 84.1, heightCm: 118.9, group: 'Póster vertical', label: 'A0 vertical' },
  { id: 'a1', widthCm: 59.4, heightCm: 84.1, group: 'Póster vertical', label: 'A1 vertical' },
  { id: 'a2', widthCm: 42, heightCm: 59.4, group: 'Póster vertical', label: 'A2 vertical' },
  { id: 'a3', widthCm: 29.7, heightCm: 42, group: 'Póster vertical', label: 'A3 vertical' },
  { id: 'a0-h', widthCm: 118.9, heightCm: 84.1, group: 'Apaisado', label: 'A0 apaisado' },
  { id: 'a1-h', widthCm: 84.1, heightCm: 59.4, group: 'Apaisado', label: 'A1 apaisado' },
  { id: 'a3-h', widthCm: 42, heightCm: 29.7, group: 'Apaisado', label: 'A3 apaisado' },
  { id: 'custom', widthCm: 90, heightCm: 120, group: 'Personalizada', label: 'Medida personalizada' },
];
