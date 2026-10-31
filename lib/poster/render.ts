// lib/poster/render.ts
// Convierte la composición en un nodo <svg> real (DOM) y lo exporta a SVG / PDF / PNG.
// El mismo nodo sirve para la vista previa y para las tres exportaciones.

import type { Composition, PosterElement } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

function setAttributes(node: Element, attributes: Record<string, string | number | undefined>) {
  Object.entries(attributes).forEach(([name, value]) => {
    if (value !== undefined) node.setAttribute(name, String(value));
  });
}

export function buildSvgElement(composition: Composition, paperColor: string): SVGSVGElement {
  const { designWidth, designHeight, placed } = composition;
  const svg = document.createElementNS(SVG_NS, 'svg');
  setAttributes(svg, { viewBox: `0 0 ${designWidth} ${designHeight}` });
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('xmlns:xlink', XLINK_NS);

  const defs = document.createElementNS(SVG_NS, 'defs');
  svg.appendChild(defs);
  let clipCounter = 0;

  const background = document.createElementNS(SVG_NS, 'rect');
  setAttributes(background, { width: designWidth, height: designHeight, fill: paperColor });
  svg.appendChild(background);

  const renderElement = (element: PosterElement, parent: Element) => {
    if (element.kind === 'rect') {
      const rect = document.createElementNS(SVG_NS, 'rect');
      setAttributes(rect, {
        x: element.x, y: element.y, width: element.width, height: element.height,
        rx: element.radius, ry: element.radius, fill: element.fill ?? 'none',
        stroke: element.stroke, 'stroke-width': element.strokeWidth, opacity: element.opacity,
      });
      parent.appendChild(rect);
    } else if (element.kind === 'path') {
      const path = document.createElementNS(SVG_NS, 'path');
      setAttributes(path, { d: element.d, fill: element.fill ?? '#000000', opacity: element.opacity });
      if (element.transformY) path.setAttribute('transform', `translate(0 ${element.transformY})`);
      parent.appendChild(path);
    } else {
      const image = document.createElementNS(SVG_NS, 'image');
      setAttributes(image, {
        x: element.x, y: element.y, width: element.width, height: element.height,
        preserveAspectRatio: element.fit === 'slice' ? 'xMidYMid slice' : 'xMidYMid meet', opacity: element.opacity,
      });
      image.setAttributeNS(XLINK_NS, 'xlink:href', element.href);
      image.setAttribute('href', element.href);
      if (element.clipPathData) {
        clipCounter += 1;
        const clipId = `poster-clip-${clipCounter}`;
        const clipPath = document.createElementNS(SVG_NS, 'clipPath');
        clipPath.setAttribute('id', clipId);
        const clipShape = document.createElementNS(SVG_NS, 'path');
        clipShape.setAttribute('d', element.clipPathData);
        clipPath.appendChild(clipShape);
        defs.appendChild(clipPath);
        image.setAttribute('clip-path', `url(#${clipId})`);
      }
      parent.appendChild(image);
    }
  };

  placed.forEach((block) => {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('transform', `translate(${block.x} ${block.y})`);
    block.elements.forEach((element) => renderElement(element, group));
    svg.appendChild(group);
  });
  return svg;
}

function cloneWithPhysicalSize(svg: SVGSVGElement, widthMm: number, heightMm: number, unit: 'mm' | 'px'): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', unit === 'mm' ? `${widthMm}mm` : String(widthMm));
  clone.setAttribute('height', unit === 'mm' ? `${heightMm}mm` : String(heightMm));
  clone.removeAttribute('style');
  return clone;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function exportSvg(svg: SVGSVGElement, widthCm: number, heightCm: number, fileName: string) {
  const clone = cloneWithPhysicalSize(svg, widthCm * 10, heightCm * 10, 'mm');
  const source = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
  downloadBlob(new Blob([source], { type: 'image/svg+xml' }), fileName);
}

export async function exportPdf(svg: SVGSVGElement, widthCm: number, heightCm: number, fileName: string) {
  const widthMm = widthCm * 10;
  const heightMm = heightCm * 10;
  const { jsPDF } = await import('jspdf');
  const { svg2pdf } = await import('svg2pdf.js');
  const pdf = new jsPDF({ orientation: widthMm > heightMm ? 'landscape' : 'portrait', unit: 'mm', format: [widthMm, heightMm], compress: true });
  // svg2pdf lee estilos calculados: el clon debe estar en el DOM (oculto) mientras se convierte.
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden';
  const clone = cloneWithPhysicalSize(svg, widthMm, heightMm, 'px');
  holder.appendChild(clone);
  document.body.appendChild(holder);
  try {
    await svg2pdf(clone, pdf, { x: 0, y: 0, width: widthMm, height: heightMm });
  } finally {
    holder.remove();
  }
  pdf.save(fileName);
}

const PNG_MAX_SIDE = 3600;

export async function exportPng(svg: SVGSVGElement, widthCm: number, heightCm: number, fileName: string) {
  const scale = PNG_MAX_SIDE / Math.max(widthCm, heightCm);
  const pixelWidth = Math.round(widthCm * scale);
  const pixelHeight = Math.round(heightCm * scale);
  const clone = cloneWithPhysicalSize(svg, pixelWidth, pixelHeight, 'px');
  const source = new XMLSerializer().serializeToString(clone);
  const svgUrl = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image: HTMLImageElement = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('No se pudo rasterizar el cartel'));
      element.src = svgUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('El navegador no permite crear la imagen');
    context.drawImage(image, 0, 0, pixelWidth, pixelHeight);
    const blob: Blob = await new Promise((resolve, reject) => canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('PNG vacío'))), 'image/png'));
    downloadBlob(blob, fileName);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
