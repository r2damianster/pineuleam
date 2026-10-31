// Tipos de la producción académica pública (/api/produccion y /publicaciones).

export type TipoProduccion = 'articulo' | 'libro' | 'capitulo' | 'ponencia' | 'propiedad';

export interface ItemProduccion {
  id: string;
  tipo: TipoProduccion;
  categoria: 'regional' | 'impacto' | null;
  titulo: string;
  autores: string;
  fecha: string; // YYYY-MM-DD
  periodo: string; // "2026-2"
  proyectoId: string | null;
  proyectoNombre: string | null;
  fuente: string | null;
  descripcion: string;
  enlace: string | null;
  pdf: string | null;
}
