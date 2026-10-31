// lib/poster/text.ts
// Motor de texto: medir, saltar líneas y convertir a trazados (<path>) con opentype.js.
// El texto del cartel nunca es <text>: así se ve igual en cualquier equipo y la imprenta no necesita fuentes.

import type { PosterElement } from './types';

export function measureText(font: any, text: string, size: number, tracking = 0): number {
  if (!tracking) return font.getAdvanceWidth(text, size);
  return Array.from(text).reduce((total, character) => total + font.getAdvanceWidth(character, size) + tracking, -tracking);
}

export function wrapText(font: any, text: string, size: number, maxWidth: number, tracking = 0): string[] {
  const lines: string[] = [];
  for (const paragraphText of text.split('\n')) {
    const words = paragraphText.split(/\s+/).filter(Boolean);
    if (words.length === 0) { lines.push(''); continue; }
    let currentLine = '';
    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (currentLine && measureText(font, candidate, size, tracking) > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
}

export function textPathData(font: any, text: string, x: number, baselineY: number, size: number, tracking = 0): string {
  if (!tracking) return font.getPath(text, x, baselineY, size).toPathData(2);
  let cursorX = x;
  const parts: string[] = [];
  for (const character of Array.from(text)) {
    parts.push(font.getPath(character, cursorX, baselineY, size).toPathData(2));
    cursorX += font.getAdvanceWidth(character, size) + tracking;
  }
  return parts.join(' ');
}

export interface ParagraphOptions {
  x: number;
  top: number;
  size: number;
  fill: string;
  anchor?: 'start' | 'middle' | 'end';
  maxWidth: number;
  lineHeight?: number;
  tracking?: number;
  /** Texto en mayúsculas (útil para etiquetas con tracking). */
  uppercase?: boolean;
}

export interface ParagraphResult {
  elements: PosterElement[];
  height: number;
  lines: string[];
}

/** Párrafo ajustado a un ancho. La altura devuelta nace del contenido real (permite apilar bloques). */
export function paragraph(font: any, text: string, options: ParagraphOptions): ParagraphResult {
  const { x, top, size, fill, anchor = 'start', maxWidth, lineHeight = 1.25, tracking = 0, uppercase = false } = options;
  const sourceText = uppercase ? text.toUpperCase() : text;
  const lines = wrapText(font, sourceText, size, maxWidth, tracking);
  const lineStep = size * lineHeight;
  const unitsPerEm = font.unitsPerEm || 1000;
  const ascent = (font.ascender / unitsPerEm) * size;
  const descent = (-font.descender / unitsPerEm) * size;
  const elements: PosterElement[] = [];

  lines.forEach((line, lineIndex) => {
    if (!line) return;
    const lineWidth = measureText(font, line, size, tracking);
    const startX = anchor === 'middle' ? x - lineWidth / 2 : anchor === 'end' ? x - lineWidth : x;
    const baselineY = top + lineIndex * lineStep + (lineStep - (ascent + descent)) / 2 + ascent;
    elements.push({ kind: 'path', d: textPathData(font, line, startX, baselineY, size, tracking), fill });
  });

  return { elements, height: lines.length * lineStep, lines };
}

/** Mayor tamaño (≤ maxSize) en que todos los textos caben en una sola línea de ancho maxWidth. */
export function fitTextSize(font: any, texts: string[], maxSize: number, maxWidth: number): number {
  const widestAtOne = Math.max(...texts.map((text) => measureText(font, text, 1)), 0.0001);
  return Math.min(maxSize, maxWidth / widestAtOne);
}
