// Rellena la plantilla institucional "Informe de Seguimiento de Tareas (Supervisor)".
// La plantilla (encabezado, colores, tablas, textos) se conserva tal cual: solo se completan
// las celdas vacías y se agregan filas, el cronograma, gráficos y fotos.
import fs from 'fs';
import { pieDeFoto } from '@/lib/pieFotoInforme';
import path from 'path';
import PizZip from 'pizzip';

const RUTA_PLANTILLA = path.join(process.cwd(), 'templates', 'informe-vinculacion-supervisor-semestral.docx');
const EMU_POR_PIXEL = 9525;
export const NOMBRES_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const COLOR_EJECUTADO = '70AD47';
export const COLOR_PLANIFICADO = 'BDD7EE';

interface ImagenIncrustada {
  relacion: string;
  extension: 'png' | 'jpeg';
  datos: Buffer;
}

export const escaparXml = (texto: unknown) =>
  String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function corrida(texto: string, opciones: { negrita?: boolean; tamano?: number } = {}) {
  const propiedades =
    `<w:rPr><w:rFonts w:eastAsia="Times New Roman" w:cstheme="minorHAnsi"/>${opciones.negrita ? '<w:b/>' : ''}` +
    `${opciones.tamano ? `<w:sz w:val="${opciones.tamano}"/><w:szCs w:val="${opciones.tamano}"/>` : ''}</w:rPr>`;
  return `<w:r>${propiedades}<w:t xml:space="preserve">${escaparXml(texto)}</w:t></w:r>`;
}

export function parrafo(contenido: string, alineacion?: 'center' | 'left') {
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/>${alineacion ? `<w:jc w:val="${alineacion}"/>` : ''}</w:pPr>${contenido}</w:p>`;
}

export function celdaSimple(ancho: number, contenido: string, relleno?: string) {
  return `<w:tc><w:tcPr><w:tcW w:w="${ancho}" w:type="dxa"/>${relleno ? `<w:shd w:val="clear" w:color="auto" w:fill="${relleno}"/>` : ''}<w:vAlign w:val="center"/></w:tcPr>${contenido || parrafo('')}</w:tc>`;
}

const BORDES_TABLA =
  '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:left w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:right w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="808080"/></w:tblBorders>';

export function tabla(anchos: number[], filas: string[], conBordes = true) {
  const rejilla = anchos.map(ancho => `<w:gridCol w:w="${ancho}"/>`).join('');
  const total = anchos.reduce((suma, ancho) => suma + ancho, 0);
  return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/>${conBordes ? BORDES_TABLA : ''}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${rejilla}</w:tblGrid>${filas.join('')}</w:tbl>`;
}

export const fila = (celdas: string[]) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${celdas.join('')}</w:tr>`;

/** Lee ancho y alto de un PNG (IHDR) o JPEG (marcador SOF). */
export function dimensionesImagen(datos: Buffer): { ancho: number; alto: number } | null {
  if (datos.length > 24 && datos.readUInt32BE(0) === 0x89504e47) {
    return { ancho: datos.readUInt32BE(16), alto: datos.readUInt32BE(20) };
  }
  if (datos[0] === 0xff && datos[1] === 0xd8) {
    let posicion = 2;
    while (posicion + 9 < datos.length) {
      if (datos[posicion] !== 0xff) { posicion++; continue; }
      const marcador = datos[posicion + 1];
      const longitud = datos.readUInt16BE(posicion + 2);
      if (marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador)) {
        return { alto: datos.readUInt16BE(posicion + 5), ancho: datos.readUInt16BE(posicion + 7) };
      }
      posicion += 2 + longitud;
    }
  }
  return null;
}

export function dibujoEnLinea(relacion: string, ancho: number, alto: number, identificador: number) {
  const anchoEmu = Math.round(ancho * EMU_POR_PIXEL);
  const altoEmu = Math.round(alto * EMU_POR_PIXEL);
  return (
    `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${anchoEmu}" cy="${altoEmu}"/>` +
    `<wp:docPr id="${identificador}" name="Imagen ${identificador}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${identificador}" name="imagen${identificador}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${relacion}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${anchoEmu}" cy="${altoEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>` +
    `</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
  );
}

export async function descargarFoto(url: string): Promise<Buffer | null> {
  // Cloudinary: recorte uniforme 4:3 en JPG liviano, así todas las fotos quedan del mismo tamaño.
  const urlOptimizada = url.includes('/upload/') ? url.replace('/upload/', '/upload/c_fill,w_640,h_480,q_auto,f_jpg/') : url;
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 8000);
  try {
    const respuesta = await fetch(urlOptimizada, { signal: controlador.signal });
    if (!respuesta.ok) return null;
    return Buffer.from(await respuesta.arrayBuffer());
  } catch {
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}

const textoDeCelda = (celdaXml: string) => (celdaXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('');
const filasDeTabla = (tablaXml: string) => tablaXml.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || [];
const celdasDeFila = (filaXml: string) => filaXml.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || [];

/** Agrega texto al primer párrafo de una celda (deja intacto lo que ya trae la plantilla). */
function agregarTexto(celdaXml: string, texto: string, opciones: { negrita?: boolean; tamano?: number } = {}) {
  if (celdaXml.includes('</w:p>')) return celdaXml.replace('</w:p>', () => `${corrida(texto, opciones)}</w:p>`);
  // Párrafo vacío autocerrado: <w:p .../>
  return celdaXml.replace(/<w:p((?:\s[^>]*?)?)\/>/, (_todo, atributos) => `<w:p${atributos}>${corrida(texto, opciones)}</w:p>`);
}

/** Reemplaza el contenido de una fila de datos vacía por valores, uno por celda. */
function llenarFilaVacia(filaXml: string, valores: string[], tamano = 18) {
  let indice = 0;
  // Al clonar la fila se quitan los identificadores únicos de párrafo para no duplicarlos.
  return filaXml.replace(/ w14:(paraId|textId)="[^"]*"/g, '').replace(/<w:tc>[\s\S]*?<\/w:tc>/g, celda => {
    const valor = valores[indice++] ?? '';
    return valor ? agregarTexto(celda, valor, { tamano }) : celda;
  });
}

const sustituir = (xml: string, original: string, nuevo: string) => xml.split(original).join(nuevo);

export interface DatosInformeSupervisor {
  periodo: { etiquetaPeriodo: string; etiqueta: string; mesesPeriodo: number[]; mesElegido: number; anio: number };
  general: Record<string, any>;
  tareas: any[];
  no_previstas: any[];
  participacion: { pasantes: any[]; grupos: any[]; genero: Record<string, number>; edad: Record<string, number>; audiencia_podcast?: number };
  fotos: { url: string; fecha: string; espacio_nombre: string; num_beneficiarios: number; num_pasantes: number }[];
  obstaculos?: { descripcion: string; recomendacion: string }[];
}

export async function generarInformeSupervisorDesdePlantilla(
  datos: DatosInformeSupervisor,
  graficos: { pasantes?: Buffer | null; genero?: Buffer | null }
): Promise<Buffer> {
  const zip = new PizZip(fs.readFileSync(RUTA_PLANTILLA, 'binary'));
  let xml = zip.file('word/document.xml')!.asText();
  const imagenes: ImagenIncrustada[] = [];
  let contadorImagenes = 0;

  const registrarImagen = (datosImagen: Buffer, extension: 'png' | 'jpeg') => {
    contadorImagenes++;
    const relacion = `rIdInforme${contadorImagenes}`;
    imagenes.push({ relacion, extension, datos: datosImagen });
    return { relacion, identificador: 900 + contadorImagenes };
  };
  const imagenComoParrafo = (datosImagen: Buffer, extension: 'png' | 'jpeg', anchoMaximo: number) => {
    const dimensiones = dimensionesImagen(datosImagen) ?? { ancho: 4, alto: 3 };
    const ancho = Math.min(anchoMaximo, dimensiones.ancho);
    const alto = Math.round((ancho * dimensiones.alto) / dimensiones.ancho);
    const { relacion, identificador } = registrarImagen(datosImagen, extension);
    return parrafo(dibujoEnLinea(relacion, ancho, alto, identificador), 'center');
  };

  const general = datos.general;
  const tablas = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
  if (tablas.length < 7) throw new Error('La plantilla del informe no tiene la estructura esperada');
  const [, tablaGeneral, tablaCronograma, tablaPlanificadas, tablaNoPrevistas, tablaParticipacion, tablaObstaculos] = tablas;

  // 1. Información general: cada celda trae solo la etiqueta; se agrega el valor.
  const valoresGenerales: [string, string][] = [
    ['Nombre del Proyecto', general.proyecto_nombre],
    ['Código de proyecto', general.proyecto_codigo],
    ['Unidad Académica', general.unidad_academica],
    ['Carrera', general.carrera],
    ['Nombre del docente supervisor', general.supervisor_nombre],
    ['Informe del trimestre', `${datos.periodo.etiquetaPeriodo} · corte a ${datos.periodo.etiqueta}`],
    ['Vigencia del proyecto', general.vigencia],
    ['Entidad beneficiaria', general.entidad_beneficiaria],
    ['No. de estudiantes supervisados', String(general.total_pasantes ?? 0)],
    ['No. Beneficiarios', String(general.total_beneficiarios ?? 0)],
  ];
  const nuevaGeneralBase = tablaGeneral.replace(/<w:tc>[\s\S]*?<\/w:tc>/g, celda => {
    const etiqueta = textoDeCelda(celda).replace(/\s+/g, ' ').trim();
    const coincidencia = valoresGenerales.find(([nombre]) => etiqueta.startsWith(nombre));
    return coincidencia && coincidencia[1] ? agregarTexto(celda, ` ${coincidencia[1]}`) : celda;
  });
  // La plantilla no trae fila para ODS/Línea de Investigación: se agrega al final, mismo ancho
  // de columnas que el resto de la tabla (4807/4975).
  const filaOdsLinea = fila([
    celdaSimple(4807, parrafo(`${corrida('Objetivo de Desarrollo Sostenible (ODS):', { negrita: true })}${general.ods ? corrida(` ${general.ods}`) : ''}`)),
    celdaSimple(4975, parrafo(`${corrida('Línea de Investigación:', { negrita: true })}${general.linea_investigacion ? corrida(` ${general.linea_investigacion}`) : ''}`)),
  ]);
  const nuevaGeneral = nuevaGeneralBase.replace('</w:tbl>', () => `${filaOdsLinea}</w:tbl>`);
  xml = sustituir(xml, tablaGeneral, nuevaGeneral);

  // 2.1 Cronograma: tabla anidada con sombreado por mes (planificado / realizado).
  const meses = datos.periodo.mesesPeriodo;
  const anchoTarea = 3400;
  const anchoMes = Math.floor(5900 / meses.length);
  const encabezadoCronograma = fila([
    celdaSimple(anchoTarea, parrafo(corrida('Actividad / tarea', { negrita: true, tamano: 16 })), 'D9D9D9'),
    ...meses.map(mesPeriodo => celdaSimple(anchoMes, parrafo(corrida(NOMBRES_MESES[mesPeriodo - 1], { negrita: true, tamano: 16 }), 'center'), 'D9D9D9')),
  ]);
  const filasCronograma = datos.tareas.map(tarea =>
    fila([
      celdaSimple(anchoTarea, parrafo(corrida(`${tarea.codigo} ${tarea.nombre}`.slice(0, 90), { tamano: 16 }))),
      ...meses.map(mesPeriodo => {
        const planificado = tarea.mesInicio != null && tarea.mesFin != null && mesPeriodo >= tarea.mesInicio && mesPeriodo <= tarea.mesFin;
        const ejecutado = Boolean(tarea.ejecucionPorMes?.[mesPeriodo]);
        return celdaSimple(anchoMes, parrafo(corrida(ejecutado ? '✔' : '', { tamano: 16 }), 'center'), ejecutado ? COLOR_EJECUTADO : planificado ? COLOR_PLANIFICADO : undefined);
      }),
    ])
  );
  const leyenda = parrafo(
    corrida('Verde: realizado (con registros aprobados) · Azul: planificado para el mes, aún sin registros aprobados.', { tamano: 16 })
  );
  const bloqueCronograma = datos.tareas.length
    ? tabla([anchoTarea, ...meses.map(() => anchoMes)], [encabezadoCronograma, ...filasCronograma]) + leyenda
    : parrafo(corrida('No hay tareas planificadas cargadas para este periodo en el plan del proyecto.', { tamano: 18 }));
  const filasCrono = filasDeTabla(tablaCronograma);
  const filaCuerpoCrono = filasCrono[2];
  const nuevaFilaCuerpoCrono = filaCuerpoCrono.replace(/<\/w:tc>(?![\s\S]*<\/w:tc>)/, () => `${bloqueCronograma}<w:p/></w:tc>`);
  xml = sustituir(xml, tablaCronograma, sustituir(tablaCronograma, filaCuerpoCrono, nuevaFilaCuerpoCrono));

  // 2.2 Tareas planificadas realizadas (se omiten las tareas sin registros aprobados).
  const tareasRealizadas = datos.tareas.filter(tarea => (tarea.realizado ?? 0) > 0 || tarea.avance != null && tarea.avance > 0 || tarea.observaciones);
  const construirTablaTareas = (tablaOriginal: string, filasDatos: string[][]) => {
    if (!filasDatos.length) return tablaOriginal;
    const filasOriginales = filasDeTabla(tablaOriginal);
    const plantillaFila = filasOriginales[2];
    const nuevasFilas = filasDatos.map(valores => llenarFilaVacia(plantillaFila, valores));
    let resultado = tablaOriginal;
    filasOriginales.slice(2).forEach(filaVacia => { resultado = resultado.replace(filaVacia, ''); });
    return resultado.replace('</w:tbl>', () => `${nuevasFilas.join('')}</w:tbl>`);
  };
  const nuevaPlanificadas = construirTablaTareas(
    tablaPlanificadas,
    tareasRealizadas.map(tarea => [
      `${tarea.codigo} ${tarea.nombre}`,
      tarea.avance != null ? `${tarea.avance}%` : '—',
      String(tarea.alumnos ?? 0),
      tarea.productos_sociales || '',
      tarea.productos_academicos || '',
      [tarea.realizado != null && tarea.meta != null ? `Realizado ${tarea.realizado} de ${tarea.meta} ${tarea.unidad}.` : '', tarea.observaciones].filter(Boolean).join(' '),
    ])
  );
  xml = sustituir(xml, tablaPlanificadas, nuevaPlanificadas);

  // 2.3 Actividades no previstas.
  const nuevaNoPrevistas = construirTablaTareas(
    tablaNoPrevistas,
    datos.no_previstas.map(actividad => [
      actividad.tarea,
      actividad.avance != null ? `${actividad.avance}%` : '—',
      String(actividad.alumnos ?? 0),
      actividad.productos_sociales || '',
      actividad.productos_academicos || '',
      actividad.observaciones || '',
    ])
  );
  xml = sustituir(xml, tablaNoPrevistas, nuevaNoPrevistas);

  // 3. Participación: estudiantes (por grupos/espacios) y beneficiarios por sexo.
  const filasParticipacion = filasDeTabla(tablaParticipacion);
  const grupos = datos.participacion.grupos || [];
  const pasantes = datos.participacion.pasantes || [];
  const lineasEstudiantes = [
    ...grupos.map((grupo: any) => parrafo(corrida(`• ${grupo.nombre}: ${grupo.pasantes} estudiante(s) supervisado(s), ${grupo.beneficiarios} beneficiario(s).`, { tamano: 18 }))),
    ...pasantes.filter((pasante: any) => pasante.horas_periodo > 0).map((pasante: any) =>
      parrafo(corrida(`   ${pasante.nombres} ${pasante.apellidos}: ${pasante.horas_periodo} h en el periodo`, { tamano: 16 }))
    ),
  ].join('');
  const generoDatos = datos.participacion.genero || {};
  const totalBeneficiarios = general.total_beneficiarios ?? 0;
  const lineaSexo = parrafo(
    corrida(
      `Beneficiarios directos: ${totalBeneficiarios} (mujeres ${generoDatos.femenino ?? 0}, hombres ${generoDatos.masculino ?? 0}, otro/sin dato ${(generoDatos.otro ?? 0) + (generoDatos.prefiero_no_decir ?? 0)}). Beneficiarios indirectos: no se registran en el sistema.`,
      { tamano: 18 }
    )
  );
  const audienciaPodcast = datos.participacion.audiencia_podcast ?? 0;
  const lineaAudiencia = audienciaPodcast > 0
    ? parrafo(corrida(`Audiencia alcanzada por los podcasts de Vinculación del periodo: ${audienciaPodcast} personas.`, { tamano: 18 }))
    : '';
  const imagenPasantes = graficos.pasantes ? imagenComoParrafo(graficos.pasantes, 'png', 420) : '';
  const imagenGenero = graficos.genero ? imagenComoParrafo(graficos.genero, 'png', 300) : '';
  const agregarAlFinalDeCelda = (filaXml: string, contenido: string) => filaXml.replace(/<\/w:tc>(?![\s\S]*<\/w:tc>)/, () => `${contenido}</w:tc>`);
  let nuevaParticipacion = tablaParticipacion;
  if (filasParticipacion[2]) nuevaParticipacion = nuevaParticipacion.replace(filasParticipacion[2], agregarAlFinalDeCelda(filasParticipacion[2], lineasEstudiantes + imagenPasantes));
  if (filasParticipacion[4]) nuevaParticipacion = nuevaParticipacion.replace(filasParticipacion[4], agregarAlFinalDeCelda(filasParticipacion[4], lineaSexo + lineaAudiencia + imagenGenero));
  xml = sustituir(xml, tablaParticipacion, nuevaParticipacion);

  // 4. Obstáculos: Restricciones / Acción correctiva.
  const obstaculos = datos.obstaculos || [];
  const nuevaObstaculos = construirTablaTareas(
    tablaObstaculos,
    obstaculos.map(obstaculo => [obstaculo.descripcion, obstaculo.recomendacion || ''])
  );
  xml = sustituir(xml, tablaObstaculos, nuevaObstaculos);

  // 5. Adjuntos: fotos al azar (una por espacio primero), con leyenda.
  const fotosDescargadas = (
    await Promise.all(datos.fotos.map(async foto => ({ foto, datosFoto: await descargarFoto(foto.url) })))
  ).filter(elemento => elemento.datosFoto);
  let bloqueAdjuntos = '';
  if (fotosDescargadas.length) {
    const celdasFotos = fotosDescargadas.map(({ foto, datosFoto }) => {
      const contenido =
        imagenComoParrafo(datosFoto!, 'jpeg', 250) +
        parrafo(corrida(pieDeFoto(foto), { tamano: 14 }), 'center');
      return celdaSimple(4700, contenido);
    });
    const filasFotos: string[] = [];
    for (let indice = 0; indice < celdasFotos.length; indice += 2) {
      const par = celdasFotos.slice(indice, indice + 2);
      if (par.length === 1) par.push(celdaSimple(4700, ''));
      filasFotos.push(fila(par));
    }
    bloqueAdjuntos = tabla([4700, 4700], filasFotos, false);
  } else {
    bloqueAdjuntos = parrafo(corrida('No hay fotografías de sesiones aprobadas en el mes seleccionado.', { tamano: 18 }));
  }
  // Se agrega al final de la última celda de la tabla «Adjuntos» (no depende de la nota «Evidencias…»).
  const tablaAdjuntos = (xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || []).find(tablaXml => textoDeCelda(tablaXml).replace(/\s+/g, ' ').trim().startsWith('Adjuntos'));
  if (tablaAdjuntos) {
    // Una celda no puede terminar en una tabla: se deja un párrafo vacío después.
    const nuevaAdjuntos = tablaAdjuntos.replace(/<\/w:tc>(?![\s\S]*<\/w:tc>)/, () => `${bloqueAdjuntos}<w:p/></w:tc>`);
    xml = sustituir(xml, tablaAdjuntos, nuevaAdjuntos);
  } else {
    const posicionAdjuntos = xml.indexOf('Adjuntos');
    const cierreParrafo = xml.indexOf('</w:p>', posicionAdjuntos) + '</w:p>'.length;
    xml = xml.slice(0, cierreParrafo) + bloqueAdjuntos + '<w:p/>' + xml.slice(cierreParrafo);
  }

  // Firmas: nombres bajo las líneas de la plantilla.
  const posicionFirma = xml.indexOf('Docente Supervisor');
  if (posicionFirma >= 0) {
    const cierreFirma = xml.indexOf('</w:p>', posicionFirma) + '</w:p>'.length;
    const nombresFirmas = tabla(
      [4700, 4700],
      [fila([
        celdaSimple(4700, parrafo(corrida(general.supervisor_nombre || '', { tamano: 18 }), 'center')),
        celdaSimple(4700, parrafo(corrida(general.lider_nombre || '', { tamano: 18 }), 'center')),
      ])],
      false
    );
    xml = xml.slice(0, cierreFirma) + nombresFirmas + xml.slice(cierreFirma);
  }

  zip.file('word/document.xml', xml);

  // Encabezado institucional: código y revisión del documento.
  let encabezado = zip.file('word/header1.xml')!.asText();
  if (general.codigo_documento) encabezado = encabezado.replace(/CÓDIGO: <\/w:t>/, () => `CÓDIGO: ${escaparXml(general.codigo_documento)}</w:t>`);
  if (general.revision_documento) encabezado = encabezado.replace(/REVISIÓN:   <\/w:t>/, () => `REVISIÓN: ${escaparXml(general.revision_documento)}   </w:t>`);
  zip.file('word/header1.xml', encabezado);

  // Imágenes: archivos, relaciones y tipos de contenido.
  if (imagenes.length) {
    let relaciones = zip.file('word/_rels/document.xml.rels')!.asText();
    let tipos = zip.file('[Content_Types].xml')!.asText();
    imagenes.forEach(imagen => {
      const nombreArchivo = `informe_${imagen.relacion}.${imagen.extension === 'jpeg' ? 'jpg' : 'png'}`;
      zip.file(`word/media/${nombreArchivo}`, imagen.datos);
      relaciones = relaciones.replace('</Relationships>', `<Relationship Id="${imagen.relacion}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${nombreArchivo}"/></Relationships>`);
    });
    if (imagenes.some(imagen => imagen.extension === 'jpeg') && !/Extension="jpg"/i.test(tipos)) {
      tipos = tipos.replace('<Default Extension="png"', '<Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="png"');
    }
    zip.file('word/_rels/document.xml.rels', relaciones);
    zip.file('[Content_Types].xml', tipos);
  }

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}
