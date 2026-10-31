// lib/poster/qr.ts
// QR vectorial: un solo <path> con un cuadrado por módulo oscuro.
// La matriz se calcula una vez (async, por el import dinámico); el trazado se arma sin esperar.

export async function buildQrMatrix(url: string): Promise<boolean[][]> {
  const qrModule: any = await import('qrcode-generator');
  const qrcode = qrModule.default ?? qrModule;
  const qr = qrcode(0, 'M');
  qr.addData(url || ' ');
  qr.make();
  const moduleCount: number = qr.getModuleCount();
  const matrix: boolean[][] = [];
  for (let row = 0; row < moduleCount; row++) {
    const rowModules: boolean[] = [];
    for (let column = 0; column < moduleCount; column++) rowModules.push(Boolean(qr.isDark(row, column)));
    matrix.push(rowModules);
  }
  return matrix;
}

export function qrPathFromMatrix(matrix: boolean[][], x: number, y: number, size: number): string {
  const moduleCount = matrix.length;
  const moduleSize = size / moduleCount;
  const overlap = 0.15; // solapa módulos vecinos: evita costuras blancas al rasterizar
  const side = (moduleSize + overlap).toFixed(2);
  const parts: string[] = [];
  matrix.forEach((rowModules, row) => {
    rowModules.forEach((isDark, column) => {
      if (!isDark) return;
      parts.push(`M${(x + column * moduleSize).toFixed(2)} ${(y + row * moduleSize).toFixed(2)}h${side}v${side}h-${side}z`);
    });
  });
  return parts.join('');
}
