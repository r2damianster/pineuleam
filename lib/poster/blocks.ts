// lib/poster/blocks.ts
// Bloques del cartel. Cada bloque devuelve { height, elements } en coordenadas LOCALES (y = 0 es su borde superior).
// Todo se deriva de designWidth; ningún texto está escrito aquí: viene de `content`.

import { paragraph, wrapText, measureText, fitTextSize } from './text';
import { qrPathFromMatrix } from './qr';
import type { PosterBlock, PosterContent, PosterDensity, PosterElement, PosterFonts, PosterImage, PosterTheme } from './types';

export interface BlockContext {
  fonts: PosterFonts;
  theme: PosterTheme;
  content: PosterContent;
  photos: PosterImage[];
  logos: PosterImage[];
  qrMatrix: boolean[][] | null;
  designWidth: number;
  density: PosterDensity;
  /** Cabecera baja para formato apaisado. */
  compact?: boolean;
}

// Cuánta imagen lleva el cartel según la preferencia: foto de portada (alto relativo al ancho) y fotos de galería.
export const DENSITY_SETTINGS: Record<PosterDensity, { heroRatio: number; galleryPhotos: number }> = {
  texto: { heroRatio: 0.5, galleryPhotos: 2 },
  equilibrado: { heroRatio: 0.72, galleryPhotos: 4 },
  imagenes: { heroRatio: 1.0, galleryPhotos: 6 },
};

const MARGIN = 72;
const NO_WRAP = 1e7;

export function roundedRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height / 2);
  return `M${x + r} ${y}H${x + width - r}A${r} ${r} 0 0 1 ${x + width} ${y + r}V${y + height - r}A${r} ${r} 0 0 1 ${x + width - r} ${y + height}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + height - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

function chevronPath(width: number, bodyBottom: number, depth: number): string {
  return `M0 0H${width}V${bodyBottom}L${width / 2} ${bodyBottom + depth}L0 ${bodyBottom}Z`;
}

function shiftPaths(elements: PosterElement[], offsetY: number): PosterElement[] {
  return elements.map((element) => (element.kind === 'path' ? { ...element, transformY: (element.transformY ?? 0) + offsetY } : element));
}

// ── Cabecera: fondo con chevron, logo en píldora, kicker, título y subtítulo (con foto de fondo opcional) ──
function buildHeader(context: BlockContext): PosterBlock {
  const { fonts, theme, content, photos, logos, designWidth: width, compact } = context;
  const contentWidth = width - MARGIN * 2;
  const centerX = width / 2;
  const chevronDepth = Math.round(width * (compact ? 0.035 : 0.07));
  const shadowOffset = 16;
  const textElements: PosterElement[] = [];
  let cursor = 84;

  const logo = logos[0];
  const logoElements: PosterElement[] = [];
  if (logo) {
    const logoHeight = compact ? 80 : 104;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    const pillPadding = 26;
    const pillWidth = logoWidth + pillPadding * 2;
    const pillHeight = logoHeight + pillPadding;
    logoElements.push({ kind: 'rect', x: centerX - pillWidth / 2, y: cursor, width: pillWidth, height: pillHeight, radius: pillHeight / 2, fill: '#FFFFFF' });
    logoElements.push({ kind: 'image', href: logo.href, x: centerX - logoWidth / 2, y: cursor + pillPadding / 2, width: logoWidth, height: logoHeight, fit: 'meet' });
    cursor += pillHeight + 48;
  }

  if (content.kicker) {
    const kicker = paragraph(fonts.sansBold, content.kicker, { x: centerX, top: cursor, size: 27, fill: theme.accentLight, anchor: 'middle', maxWidth: contentWidth, tracking: 5, uppercase: true });
    textElements.push(...kicker.elements);
    cursor += kicker.height + 38;
  }

  // Título: el mayor tamaño en que cabe en ≤ 4 líneas (≤ 2 si es apaisado). Última línea en cursiva y color de acento.
  const maxTitleLines = compact ? 2 : 4;
  let titleSize = compact ? 92 : 124;
  let titleLines = wrapText(fonts.serif, content.title, titleSize, contentWidth);
  while (titleSize > 48 && (titleLines.length > maxTitleLines || titleLines.some((line) => measureText(fonts.serif, line, titleSize) > contentWidth))) {
    titleSize -= 4;
    titleLines = wrapText(fonts.serif, content.title, titleSize, contentWidth);
  }
  titleLines.forEach((line, lineIndex) => {
    const isLast = lineIndex === titleLines.length - 1 && titleLines.length > 1;
    const lineParagraph = paragraph(isLast ? fonts.serifItalic : fonts.serif, line, {
      x: centerX, top: cursor, size: titleSize, fill: isLast ? theme.accentLight : '#FFFFFF', anchor: 'middle', maxWidth: NO_WRAP, lineHeight: 1.14,
    });
    textElements.push(...lineParagraph.elements);
    cursor += lineParagraph.height;
  });

  if (content.subtitle) {
    cursor += 34;
    const subtitle = paragraph(fonts.serifItalic, content.subtitle, { x: centerX, top: cursor, size: compact ? 36 : 46, fill: '#E8EEF7', anchor: 'middle', maxWidth: contentWidth - 80, lineHeight: 1.3 });
    textElements.push(...subtitle.elements);
    cursor += subtitle.height;
  }

  const naturalBodyBottom = cursor + 84;
  const hasPhoto = photos.length > 0;
  const heroRatio = DENSITY_SETTINGS[context.density].heroRatio;
  const bodyBottom = hasPhoto ? Math.max(naturalBodyBottom, Math.round(width * (compact ? 0.2 : heroRatio))) : naturalBodyBottom;
  const extraTop = (bodyBottom - naturalBodyBottom) / 2;
  const height = bodyBottom + chevronDepth + shadowOffset;

  const elements: PosterElement[] = [];
  elements.push({ kind: 'path', d: chevronPath(width, bodyBottom + shadowOffset, chevronDepth), fill: theme.accent });
  elements.push({ kind: 'path', d: chevronPath(width, bodyBottom, chevronDepth), fill: theme.primary });
  if (hasPhoto) {
    const heroPhoto = photos[0];
    elements.push({ kind: 'image', href: heroPhoto.href, x: 0, y: 0, width, height: bodyBottom + chevronDepth, fit: 'slice', clipPathData: chevronPath(width, bodyBottom, chevronDepth) });
    elements.push({ kind: 'path', d: chevronPath(width, bodyBottom, chevronDepth), fill: theme.primary, opacity: 0.8 });
  }
  elements.push(...logoElements.map((element) => (element.kind === 'rect' || element.kind === 'image' ? { ...element, y: element.y + extraTop } : element)));
  elements.push(...shiftPaths(textElements, extraTop));
  return { id: 'header', height, elements };
}

// ── Descripción: párrafo con barra de acento ──
function buildDescription(context: BlockContext): PosterBlock | null {
  const { fonts, theme, content, designWidth: width } = context;
  if (!content.description.trim()) return null;
  const textBlock = paragraph(fonts.serif, content.description, { x: MARGIN + 34, top: 0, size: 40, fill: theme.ink, maxWidth: width - MARGIN * 2 - 34, lineHeight: 1.55 });
  return {
    id: 'description',
    height: textBlock.height,
    elements: [{ kind: 'rect', x: MARGIN, y: 6, width: 8, height: Math.max(8, textBlock.height - 12), fill: theme.accent }, ...textBlock.elements],
  };
}

// ── Lista numerada (líneas, objetivos, ejes) ──
function buildItems(context: BlockContext): PosterBlock | null {
  const { fonts, theme, content, designWidth: width } = context;
  const items = content.items.map((item) => item.trim()).filter(Boolean);
  if (items.length === 0) return null;
  const contentWidth = width - MARGIN * 2;
  const elements: PosterElement[] = [];
  let cursor = 0;

  if (content.itemsTitle) {
    const title = paragraph(fonts.sansBold, content.itemsTitle, { x: MARGIN, top: cursor, size: 34, fill: theme.primary, maxWidth: contentWidth, tracking: 4, uppercase: true });
    elements.push(...title.elements);
    cursor += title.height + 14;
    elements.push({ kind: 'rect', x: MARGIN, y: cursor, width: 130, height: 7, radius: 3, fill: theme.accent });
    cursor += 7 + 36;
  }

  items.forEach((item, itemIndex) => {
    const numberLabel = paragraph(fonts.serif, String(itemIndex + 1), { x: MARGIN, top: cursor - 6, size: 58, fill: theme.accent, maxWidth: 90 });
    const itemText = paragraph(fonts.sans, item, { x: MARGIN + 92, top: cursor, size: 36, fill: theme.ink, maxWidth: contentWidth - 92, lineHeight: 1.35 });
    elements.push(...numberLabel.elements, ...itemText.elements);
    cursor += Math.max(itemText.height, 64) + 30;
  });
  return { id: 'items', height: cursor - 30, elements };
}

// ── Galería: de 1 a 6 fotos en rejilla ──
interface GalleryCell { x: number; y: number; width: number; height: number }

function galleryCells(count: number, totalWidth: number, gap: number): { cells: GalleryCell[]; height: number } {
  const half = (totalWidth - gap) / 2;
  const third = (totalWidth - gap * 2) / 3;
  const layouts: Record<number, () => { cells: GalleryCell[]; height: number }> = {
    1: () => { const h = totalWidth * 0.62; return { cells: [{ x: 0, y: 0, width: totalWidth, height: h }], height: h }; },
    2: () => { const h = half * 0.95; return { cells: [{ x: 0, y: 0, width: half, height: h }, { x: half + gap, y: 0, width: half, height: h }], height: h }; },
    3: () => {
      const topHeight = totalWidth * 0.5; const bottomHeight = half * 0.8;
      return { cells: [{ x: 0, y: 0, width: totalWidth, height: topHeight }, { x: 0, y: topHeight + gap, width: half, height: bottomHeight }, { x: half + gap, y: topHeight + gap, width: half, height: bottomHeight }], height: topHeight + gap + bottomHeight };
    },
    4: () => {
      const h = half * 0.8;
      return { cells: [0, 1, 2, 3].map((index) => ({ x: (index % 2) * (half + gap), y: Math.floor(index / 2) * (h + gap), width: half, height: h })), height: h * 2 + gap };
    },
    5: () => {
      const topHeight = totalWidth * 0.46; const cellHeight = half * 0.7;
      return { cells: [{ x: 0, y: 0, width: totalWidth, height: topHeight }, ...[0, 1, 2, 3].map((index) => ({ x: (index % 2) * (half + gap), y: topHeight + gap + Math.floor(index / 2) * (cellHeight + gap), width: half, height: cellHeight }))], height: topHeight + gap + cellHeight * 2 + gap };
    },
    6: () => {
      const h = third * 1.05;
      return { cells: [0, 1, 2, 3, 4, 5].map((index) => ({ x: (index % 3) * (third + gap), y: Math.floor(index / 3) * (h + gap), width: third, height: h })), height: h * 2 + gap };
    },
  };
  return layouts[Math.min(6, Math.max(1, count))]();
}

function buildGallery(context: BlockContext): PosterBlock | null {
  const { photos, designWidth: width } = context;
  // La primera foto del carrete es la de portada de la cabecera; la galería usa las demás.
  const galleryPhotos = photos.slice(1, 1 + DENSITY_SETTINGS[context.density].galleryPhotos);
  if (galleryPhotos.length === 0) return null;
  const totalWidth = width - MARGIN * 2;
  const { cells, height } = galleryCells(galleryPhotos.length, totalWidth, 18);
  const elements: PosterElement[] = galleryPhotos.map((photo, photoIndex) => {
    const cell = cells[photoIndex];
    const x = MARGIN + cell.x;
    return { kind: 'image', href: photo.href, x, y: cell.y, width: cell.width, height: cell.height, fit: 'slice', clipPathData: roundedRectPath(x, cell.y, cell.width, cell.height, 22) } as PosterElement;
  });
  return { id: 'gallery', height, elements };
}


// ── Objetivos del proyecto: general destacado + específicos con viñeta ──
function buildObjectives(context: BlockContext): PosterBlock | null {
  const { fonts, theme, content, designWidth: width } = context;
  const objectives = content.objectives.filter((objective) => objective.text.trim());
  if (objectives.length === 0) return null;
  const contentWidth = width - MARGIN * 2;
  const elements: PosterElement[] = [];
  let cursor = 0;

  if (content.objectivesTitle) {
    const title = paragraph(fonts.sansBold, content.objectivesTitle, { x: MARGIN, top: cursor, size: 34, fill: theme.primary, maxWidth: contentWidth, tracking: 4, uppercase: true });
    elements.push(...title.elements);
    cursor += title.height + 14;
    elements.push({ kind: 'rect', x: MARGIN, y: cursor, width: 130, height: 7, radius: 3, fill: theme.accent });
    cursor += 7 + 34;
  }

  // Tipos que se muestran como párrafo rotulado (misión, visión, objetivo general); el resto va como lista de específicos.
  const LABELED_TYPES: Record<string, string> = { mision: 'Misión', vision: 'Visión', general: 'Objetivo general' };
  const generalObjectives = objectives.filter((objective) => objective.tipo in LABELED_TYPES);
  const specificObjectives = objectives.filter((objective) => !(objective.tipo in LABELED_TYPES));

  generalObjectives.forEach((objective) => {
    const label = paragraph(fonts.sansBold, LABELED_TYPES[objective.tipo], { x: MARGIN, top: cursor, size: 26, fill: theme.accent, maxWidth: contentWidth, tracking: 3, uppercase: true });
    const text = paragraph(fonts.serif, objective.text, { x: MARGIN, top: cursor + label.height + 8, size: 38, fill: theme.ink, maxWidth: contentWidth, lineHeight: 1.45 });
    elements.push(...label.elements, ...text.elements);
    cursor += label.height + 8 + text.height + 36;
  });

  if (specificObjectives.length > 0) {
    const label = paragraph(fonts.sansBold, specificObjectives.length > 1 ? 'Objetivos específicos' : 'Objetivo específico', { x: MARGIN, top: cursor, size: 26, fill: theme.accent, maxWidth: contentWidth, tracking: 3, uppercase: true });
    elements.push(...label.elements);
    cursor += label.height + 14;
    specificObjectives.forEach((objective) => {
      const text = paragraph(fonts.sans, objective.text, { x: MARGIN + 44, top: cursor, size: 33, fill: theme.ink, maxWidth: contentWidth - 44, lineHeight: 1.4 });
      elements.push({ kind: 'rect', x: MARGIN + 4, y: cursor + 17, width: 16, height: 16, radius: 4, fill: theme.accent });
      elements.push(...text.elements);
      cursor += text.height + 24;
    });
    cursor -= 24;
  } else {
    cursor -= 36;
  }
  return { id: 'objectives', height: Math.max(cursor, 0), elements };
}

// ── Ficha del proyecto: pares etiqueta / valor (unidad académica, ODS, zona, vigencia…) ──
function buildDetails(context: BlockContext): PosterBlock | null {
  const { fonts, theme, content, designWidth: width } = context;
  const details = content.details.filter((detail) => detail.value.trim());
  if (details.length === 0) return null;
  const contentWidth = width - MARGIN * 2;
  const labelWidth = Math.min(380, contentWidth * 0.34);
  const elements: PosterElement[] = [];
  let cursor = 40;

  if (content.detailsTitle) {
    const title = paragraph(fonts.sansBold, content.detailsTitle, { x: MARGIN + 30, top: cursor, size: 30, fill: theme.accent, maxWidth: contentWidth - 60, tracking: 5, uppercase: true });
    elements.push(...title.elements);
    cursor += title.height + 22;
  }
  details.forEach((detail) => {
    const label = paragraph(fonts.sansBold, detail.label, { x: MARGIN + 30, top: cursor, size: 24, fill: theme.muted, maxWidth: labelWidth - 20, tracking: 2, uppercase: true, lineHeight: 1.3 });
    const value = paragraph(fonts.sans, detail.value, { x: MARGIN + 30 + labelWidth, top: cursor - 2, size: 32, fill: theme.ink, maxWidth: contentWidth - 60 - labelWidth, lineHeight: 1.3 });
    elements.push(...label.elements, ...value.elements);
    cursor += Math.max(label.height, value.height) + 20;
  });
  const height = cursor + 20;
  return { id: 'details', height, elements: [{ kind: 'rect', x: MARGIN, y: 0, width: contentWidth, height, radius: 22, fill: theme.tint }, ...elements] };
}

// ── Equipo: banda con responsable y miembros ──
function buildTeam(context: BlockContext): PosterBlock | null {
  const { fonts, theme, content, designWidth: width } = context;
  const team = content.team.map((name) => name.trim()).filter(Boolean);
  if (!content.leader.trim() && team.length === 0) return null;
  const centerX = width / 2;
  const contentWidth = width - MARGIN * 2 - 40;
  const elements: PosterElement[] = [];
  let cursor = 56;

  if (content.teamTitle) {
    const title = paragraph(fonts.sansBold, content.teamTitle, { x: centerX, top: cursor, size: 30, fill: theme.accent, anchor: 'middle', maxWidth: contentWidth, tracking: 5, uppercase: true });
    elements.push(...title.elements);
    cursor += title.height + 22;
  }
  if (content.leader.trim()) {
    const leader = paragraph(fonts.sansBold, content.leader, { x: centerX, top: cursor, size: 42, fill: theme.primary, anchor: 'middle', maxWidth: contentWidth, lineHeight: 1.3 });
    elements.push(...leader.elements);
    cursor += leader.height + 16;
  }
  if (team.length > 0) {
    const names = paragraph(fonts.sans, team.join('  ·  '), { x: centerX, top: cursor, size: 32, fill: theme.muted, anchor: 'middle', maxWidth: contentWidth, lineHeight: 1.5 });
    elements.push(...names.elements);
    cursor += names.height;
  }
  const height = cursor + 56;
  return { id: 'team', height, elements: [{ kind: 'rect', x: 0, y: 0, width, height, fill: theme.tint }, ...elements] };
}

// ── Cifras ──
function buildStats(context: BlockContext): PosterBlock | null {
  const { fonts, theme, content, designWidth: width } = context;
  const stats = content.stats.filter((stat) => stat.n.trim() || stat.l.trim());
  if (stats.length === 0) return null;
  const contentWidth = width - MARGIN * 2;
  const cellWidth = contentWidth / stats.length;
  const elements: PosterElement[] = [];
  let tallest = 0;
  stats.forEach((stat, statIndex) => {
    const centerX = MARGIN + cellWidth * statIndex + cellWidth / 2;
    const numberSize = fitTextSize(fonts.serif, [stat.n || ' '], 96, cellWidth - 30);
    const number = paragraph(fonts.serif, stat.n, { x: centerX, top: 0, size: numberSize, fill: theme.primary, anchor: 'middle', maxWidth: cellWidth });
    const label = paragraph(fonts.sansBold, stat.l, { x: centerX, top: number.height + 6, size: 24, fill: theme.muted, anchor: 'middle', maxWidth: cellWidth - 30, tracking: 2, uppercase: true, lineHeight: 1.3 });
    elements.push(...number.elements, ...label.elements);
    tallest = Math.max(tallest, number.height + 6 + label.height);
    if (statIndex > 0) elements.push({ kind: 'rect', x: MARGIN + cellWidth * statIndex - 1.5, y: 8, width: 3, height: 0, fill: theme.accentLight });
  });
  const dividerHeight = tallest - 16;
  const finalElements = elements.map((element) => (element.kind === 'rect' && element.height === 0 ? { ...element, height: dividerHeight } : element));
  return { id: 'stats', height: tallest, elements: finalElements };
}

// ── Pie: banda con QR, invitación a escanear, web, contacto; franja de logos ──
function buildFooter(context: BlockContext): PosterBlock {
  const { fonts, theme, content, logos, qrMatrix, designWidth: width } = context;
  const elements: PosterElement[] = [];
  const bandPadding = 64;
  const hasQr = Boolean(qrMatrix && content.url.trim());
  const qrSize = Math.min(340, width * 0.3);
  const cardPadding = 26;
  const cardSize = qrSize + cardPadding * 2;
  const textX = hasQr ? MARGIN + cardSize + 56 : MARGIN;
  const textWidth = width - textX - MARGIN;

  const textStack: PosterElement[] = [];
  let stackHeight = 0;
  if (hasQr && content.scanLabel) {
    const scan = paragraph(fonts.sansBold, content.scanLabel, { x: textX, top: stackHeight, size: 28, fill: theme.accentLight, maxWidth: textWidth, tracking: 4, uppercase: true });
    textStack.push(...scan.elements);
    stackHeight += scan.height + 14;
  }
  const displayUrl = content.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (displayUrl) {
    const urlSize = fitTextSize(fonts.serifItalic, [displayUrl], 52, textWidth);
    const urlText = paragraph(fonts.serifItalic, displayUrl, { x: textX, top: stackHeight, size: urlSize, fill: '#FFFFFF', maxWidth: NO_WRAP });
    textStack.push(...urlText.elements);
    stackHeight += urlText.height + 18;
  }
  if (content.contact.trim()) {
    const contact = paragraph(fonts.sans, content.contact, { x: textX, top: stackHeight, size: 28, fill: '#DCE6F2', maxWidth: textWidth, lineHeight: 1.45 });
    textStack.push(...contact.elements);
    stackHeight += contact.height;
  }

  const bandContentHeight = Math.max(hasQr ? cardSize : 0, stackHeight);
  const bandHeight = bandContentHeight + bandPadding * 2;
  elements.push({ kind: 'rect', x: 0, y: 0, width, height: bandHeight, fill: theme.primary });
  elements.push({ kind: 'rect', x: 0, y: 0, width, height: 10, fill: theme.accent });

  if (hasQr && qrMatrix) {
    const cardY = bandPadding + (bandContentHeight - cardSize) / 2;
    elements.push({ kind: 'rect', x: MARGIN, y: cardY, width: cardSize, height: cardSize, radius: 24, fill: '#FFFFFF' });
    elements.push({ kind: 'path', d: qrPathFromMatrix(qrMatrix, MARGIN + cardPadding, cardY + cardPadding, qrSize), fill: '#000000' });
  }
  elements.push(...shiftPaths(textStack, bandPadding + (bandContentHeight - stackHeight) / 2));

  // Franja de logos
  let totalHeight = bandHeight;
  // El primer logo ya va en la píldora de la cabecera; la franja inferior muestra los demás.
  const usableLogos = logos.slice(1, 6);
  if (usableLogos.length > 0) {
    const stripPadding = 44;
    const logoHeight = 96;
    const stripHeight = logoHeight + stripPadding * 2;
    const widths = usableLogos.map((logo) => (logo.width / logo.height) * logoHeight);
    const available = width - MARGIN * 2;
    const scale = Math.min(1, available / (widths.reduce((sum, value) => sum + value, 0) + 60 * (usableLogos.length - 1)));
    const scaledWidths = widths.map((value) => value * scale);
    const gap = usableLogos.length > 1 ? (available - scaledWidths.reduce((sum, value) => sum + value, 0)) / (usableLogos.length - 1) : 0;
    elements.push({ kind: 'rect', x: 0, y: bandHeight, width, height: stripHeight, fill: '#FFFFFF' });
    let cursorX = usableLogos.length > 1 ? MARGIN : (width - scaledWidths[0]) / 2;
    usableLogos.forEach((logo, logoIndex) => {
      const scaledHeight = logoHeight * scale;
      elements.push({ kind: 'image', href: logo.href, x: cursorX, y: bandHeight + (stripHeight - scaledHeight) / 2, width: scaledWidths[logoIndex], height: scaledHeight, fit: 'meet' });
      cursorX += scaledWidths[logoIndex] + gap;
    });
    totalHeight += stripHeight;
  }
  return { id: 'footer', height: totalHeight, elements };
}

export type BlockId = 'header' | 'description' | 'gallery' | 'objectives' | 'items' | 'details' | 'team' | 'stats' | 'footer';
export type BlockMap = Record<BlockId, PosterBlock | null>;

export function buildBlocks(context: BlockContext): BlockMap {
  return {
    header: buildHeader(context),
    description: buildDescription(context),
    gallery: buildGallery(context),
    objectives: buildObjectives(context),
    items: buildItems(context),
    details: buildDetails(context),
    team: buildTeam(context),
    stats: buildStats(context),
    footer: buildFooter(context),
  };
}
