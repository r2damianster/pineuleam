// lib/poster/compose.ts
// Composición adaptativa: prueba lienzos de distinto ancho de diseño (texto relativamente más pequeño
// cuanto más ancho) hasta que el contenido cabe en la relación de aspecto pedida; si no cabe,
// descarta bloques opcionales en orden. Funciona con cualquier medida.

import { buildBlocks, type BlockContext, type BlockId, type BlockMap } from './blocks';
import type { Composition, PlacedBlock, PosterBlock, PosterDensity } from './types';

// Orden de aparición y orden en que se descartan bloques cuando el contenido no cabe, según la densidad elegida:
// con más texto se sacrifican primero las imágenes; con más imágenes, los textos secundarios.
const DISPLAY_ORDER_BY_DENSITY: Record<PosterDensity, BlockId[]> = {
  texto: ['header', 'description', 'objectives', 'items', 'details', 'team', 'stats', 'gallery', 'footer'],
  equilibrado: ['header', 'description', 'gallery', 'objectives', 'items', 'details', 'team', 'stats', 'footer'],
  imagenes: ['header', 'gallery', 'description', 'stats', 'team', 'items', 'objectives', 'details', 'footer'],
};
const DROP_ORDER_BY_DENSITY: Record<PosterDensity, BlockId[]> = {
  texto: ['gallery', 'stats', 'team', 'details'],
  equilibrado: ['stats', 'details', 'team', 'items', 'objectives'],
  imagenes: ['stats', 'details', 'objectives', 'items', 'team'],
};
const DESIGN_WIDTHS = [1000, 1080, 1160, 1240, 1340, 1460, 1600, 1760, 1960, 2200, 2500];
const MIN_GAP = 56;
const MAX_GAP = 120;

type ContextWithoutWidth = Omit<BlockContext, 'designWidth' | 'compact'>;

function composeVertical(baseContext: ContextWithoutWidth, aspectRatio: number): Composition {
  const displayOrder = DISPLAY_ORDER_BY_DENSITY[baseContext.density];
  const dropOrder = DROP_ORDER_BY_DENSITY[baseContext.density];
  for (let droppedCount = 0; droppedCount <= dropOrder.length; droppedCount++) {
    const droppedIds: string[] = dropOrder.slice(0, droppedCount);
    for (const designWidth of DESIGN_WIDTHS) {
      const designHeight = designWidth * aspectRatio;
      const blocks: BlockMap = buildBlocks({ ...baseContext, designWidth });
      const shown = displayOrder
        .filter((id) => !droppedIds.includes(id))
        .map((id) => blocks[id])
        .filter((block): block is PosterBlock => Boolean(block));
      const totalHeight = shown.reduce((sum, block) => sum + block.height, 0);
      if (totalHeight + (shown.length - 1) * MIN_GAP > designHeight) continue;

      const freeSpace = designHeight - totalHeight;
      const gap = Math.min(MAX_GAP, freeSpace / (shown.length - 1));
      const leftover = freeSpace - gap * (shown.length - 1);
      const placed: PlacedBlock[] = [];
      let cursorY = 0;
      shown.forEach((block, blockIndex) => {
        const isFooter = block.id === 'footer';
        const y = isFooter ? designHeight - block.height : cursorY;
        placed.push({ ...block, x: 0, y });
        // El sobrante se reparte tras la cabecera y el primer bloque para que el cartel respire arriba.
        const extra = blockIndex < 2 ? leftover * 0.5 : 0;
        cursorY = y + block.height + gap + extra;
      });
      return { designWidth, designHeight, placed, dropped: droppedIds, overflow: false };
    }
  }

  // Nada cabe ni descartando: mínimo (cabecera + pie) y se avisa en la UI.
  const designWidth = DESIGN_WIDTHS[DESIGN_WIDTHS.length - 1];
  const designHeight = designWidth * aspectRatio;
  const blocks = buildBlocks({ ...baseContext, designWidth });
  const minimal = [blocks.header, blocks.gallery, blocks.footer].filter((block): block is PosterBlock => Boolean(block));
  const placed: PlacedBlock[] = [];
  let cursorY = 0;
  minimal.forEach((block) => {
    const y = block.id === 'footer' ? Math.max(cursorY, designHeight - block.height) : cursorY;
    placed.push({ ...block, x: 0, y });
    cursorY = y + block.height + MIN_GAP;
  });
  return { designWidth, designHeight, placed, dropped: [...dropOrder], overflow: true };
}

// ── Apaisado: cabecera ancha, 3 columnas, pie ancho ──
const LANDSCAPE_DESIGN_WIDTHS = [1700, 1900, 2100, 2350, 2600, 2900, 3300, 3700, 4200];
const COLUMN_MARGIN = 72;
const COLUMN_GAP = 48;

function stackColumn(blocks: (PosterBlock | null)[]): { items: PosterBlock[]; height: number } {
  const items = blocks.filter((block): block is PosterBlock => Boolean(block));
  const height = items.reduce((sum, block) => sum + block.height, 0) + Math.max(0, items.length - 1) * MIN_GAP;
  return { items, height };
}

function composeLandscape(baseContext: ContextWithoutWidth, aspectRatio: number): Composition {
  for (const includeStats of [true, false]) {
    for (const designWidth of LANDSCAPE_DESIGN_WIDTHS) {
      const designHeight = designWidth * aspectRatio;
      const columnWidth = (designWidth - COLUMN_MARGIN * 2 - COLUMN_GAP * 2) / 3;
      const wide = buildBlocks({ ...baseContext, designWidth, compact: true });
      const narrow = buildBlocks({ ...baseContext, designWidth: columnWidth + COLUMN_MARGIN * 2, compact: true });
      const columns = [
        stackColumn([narrow.description, narrow.objectives]),
        stackColumn([narrow.gallery, narrow.details]),
        stackColumn([narrow.items, narrow.team, includeStats ? narrow.stats : null]),
      ];
      const bodyHeight = Math.max(...columns.map((column) => column.height));
      const headerHeight = wide.header?.height ?? 0;
      const footerHeight = wide.footer?.height ?? 0;
      const free = designHeight - headerHeight - footerHeight - bodyHeight;
      if (free < MIN_GAP * 2) continue;

      const placed: PlacedBlock[] = [];
      if (wide.header) placed.push({ ...wide.header, x: 0, y: 0 });
      const bodyTop = headerHeight + free / 2;
      columns.forEach((column, columnIndex) => {
        // Los bloques estrechos ya traen su margen de 72 a cada lado: su contenido queda alineado con la columna.
        const columnX = columnIndex * (columnWidth + COLUMN_GAP);
        let cursorY = bodyTop;
        column.items.forEach((block) => {
          placed.push({ ...block, x: columnX, y: cursorY });
          cursorY += block.height + MIN_GAP;
        });
      });
      if (wide.footer) placed.push({ ...wide.footer, x: 0, y: designHeight - footerHeight });
      return { designWidth, designHeight, placed, dropped: includeStats ? [] : ['stats'], overflow: false };
    }
  }
  const designWidth = LANDSCAPE_DESIGN_WIDTHS[LANDSCAPE_DESIGN_WIDTHS.length - 1];
  const designHeight = designWidth * aspectRatio;
  const wide = buildBlocks({ ...baseContext, designWidth, compact: true });
  const placed: PlacedBlock[] = [];
  if (wide.header) placed.push({ ...wide.header, x: 0, y: 0 });
  if (wide.footer) placed.push({ ...wide.footer, x: 0, y: designHeight - wide.footer.height });
  return { designWidth, designHeight, placed, dropped: ['description', 'gallery', 'objectives', 'items', 'details', 'team', 'stats'], overflow: true };
}

export function composeForSize(baseContext: ContextWithoutWidth, widthCm: number, heightCm: number): Composition {
  const aspectRatio = heightCm / widthCm;
  return heightCm < widthCm ? composeLandscape(baseContext, aspectRatio) : composeVertical(baseContext, aspectRatio);
}
