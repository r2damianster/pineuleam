// Pie de las fotos de evidencia de los informes de Vinculación. Las fotos de podcast/evento no tienen
// "beneficiarios" sino audiencia alcanzada, y a veces no se conoce alguno de los dos conteos (null).
export interface FotoInforme {
  espacio_nombre: string;
  fecha: string;
  num_pasantes: number | null;
  num_beneficiarios: number | null;
  es_audiencia?: boolean;
}

export function pieDeFoto(foto: FotoInforme): string {
  const partes = [foto.espacio_nombre, foto.fecha];
  if (foto.num_pasantes !== null && foto.num_pasantes !== undefined) partes.push(`${foto.num_pasantes} estudiante(s)`);
  if (foto.num_beneficiarios !== null && foto.num_beneficiarios !== undefined) {
    partes.push(`${foto.num_beneficiarios} ${foto.es_audiencia ? 'persona(s) de audiencia' : 'beneficiario(s)'}`);
  }
  return partes.join(' · ');
}
