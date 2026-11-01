// Rellena las plantillas institucionales reales "INFORME MENSUAL DEL LÍDER/SUPERVISOR DEL
// PROYECTO DE VINCULACIÓN" (Sesión 57) — a diferencia del semestral (marco lógico), este es
// el formato simple que el proyecto ya llenaba a mano en Word. Las plantillas en blanco
// (/templates/informe-vinculacion-lider-mensual.docx, informe-vinculacion-supervisor-mensual.docx) se derivaron de
// los documentos reales de mayo/julio 2026 que subió el usuario, reemplazando cada valor por
// un marcador {{CAMPO}} — el encabezado, logo, fuentes y etiquetas de sección son los originales,
// sin tocar. Reutiliza los helpers de plantillaSupervisor.ts (mismo patrón que el semestral).
import fs from 'fs';
import { pieDeFoto } from '@/lib/pieFotoInforme';
import path from 'path';
import PizZip from 'pizzip';
import { escaparXml, corrida, parrafo, celdaSimple, tabla, fila, dimensionesImagen, dibujoEnLinea, descargarFoto } from './plantillaSupervisor';
import type { DatosInformeMensual } from '@/lib/informeMensualTareas';

const RUTA_LIDER = path.join(process.cwd(), 'templates', 'informe-vinculacion-lider-mensual.docx');
const RUTA_SUPERVISOR = path.join(process.cwd(), 'templates', 'informe-vinculacion-supervisor-mensual.docx');

interface ImagenIncrustada {
  relacion: string;
  extension: 'png' | 'jpeg';
  datos: Buffer;
}

const sustituirTodo = (xml: string, marcador: string, nuevo: string) => xml.split(marcador).join(nuevo);

/**
 * Reemplaza el PÁRRAFO ENTERO que contiene `marcador` (ubicado por su texto, no por el XML
 * exacto que lo rodea) por `nuevoContenido`. Más robusto que buscar el string completo del
 * párrafo-marcador tal cual se escribió al construir la plantilla en blanco: si el .docx se
 * volvió a abrir/guardar (Word puede reformatear atributos, dividir runs, etc.) ese string
 * exacto deja de existir y el marcador queda pegado literal en el documento final — buscar
 * solo el texto `{{...}}` y ubicar el párrafo dinámicamente sobrevive a esos cambios.
 */
function reemplazarParrafoMarcador(xml: string, marcador: string, nuevoContenido: string): string {
  const idx = xml.indexOf(marcador);
  if (idx === -1) return xml; // el marcador ya no está (plantilla cambiada) — no romper el resto del documento
  const inicioParrafo = (() => {
    const re = /<w:p(?=[ >])/g;
    let m, ultimo = -1;
    while ((m = re.exec(xml)) && m.index < idx) ultimo = m.index;
    return ultimo === -1 ? idx : ultimo;
  })();
  const finParrafo = xml.indexOf('</w:p>', idx) + '</w:p>'.length;
  return xml.slice(0, inicioParrafo) + nuevoContenido + xml.slice(finParrafo);
}

function narrativaEspacio(espacio: DatosInformeMensual['espacios'][number]): string {
  if (espacio.esAudiencia) {
    return `${espacio.nombre}\nAudiencia observada: ${espacio.total} personas (no se registra desglose por sexo)`;
  }
  return `${espacio.nombre}\nBeneficiarios directos: ${espacio.total}\nMujeres ${espacio.mujeres} y varones ${espacio.hombres}`;
}
function narrativaZona(zona: DatosInformeMensual['espacios'][number]['zona']): string {
  return `Zona donde se realiza la Vinculación\nCantón: ${zona.canton || '—'}\nParroquia: ${zona.parroquia || '—'}\nBarrio/Sector: ${zona.barrio || '—'}\nUbicación: ${zona.ubicacion || '—'}`;
}
function parrafosDeTexto(texto: string, opciones: { negrita?: boolean; tamano?: number } = {}) {
  return texto.split('\n').map(linea => parrafo(corrida(linea, opciones))).join('');
}

async function construirBloqueEvidencias(
  evidencias: DatosInformeMensual['evidencias'],
  registrarImagen: (datos: Buffer, extension: 'png' | 'jpeg') => { relacion: string; identificador: number }
): Promise<string> {
  if (evidencias.length === 0) return parrafo(corrida('No hay fotografías de sesiones aprobadas en el mes seleccionado.', { tamano: 18 }));
  const fotosDescargadas = (
    await Promise.all(evidencias.map(async foto => ({ foto, datosFoto: await descargarFoto(foto.url) })))
  ).filter(elemento => elemento.datosFoto);
  if (fotosDescargadas.length === 0) return parrafo(corrida('No hay fotografías de sesiones aprobadas en el mes seleccionado.', { tamano: 18 }));
  return fotosDescargadas.map(({ foto, datosFoto }) => {
    const dimensiones = dimensionesImagen(datosFoto!) ?? { ancho: 4, alto: 3 };
    const anchoMaximo = 350;
    const ancho = Math.min(anchoMaximo, dimensiones.ancho);
    const alto = Math.round((ancho * dimensiones.alto) / dimensiones.ancho);
    const { relacion, identificador } = registrarImagen(datosFoto!, 'jpeg');
    return (
      parrafo(dibujoEnLinea(relacion, ancho, alto, identificador), 'center') +
      parrafo(corrida(pieDeFoto(foto), { tamano: 14 }), 'center')
    );
  }).join('');
}

function construirTablaHoras(pasantes: DatosInformeMensual['pasantes']): string {
  const encabezado = fila([
    celdaSimple(2400, parrafo(corrida('Espacio', { negrita: true, tamano: 16 }), 'center'), 'D9D9D9'),
    celdaSimple(2400, parrafo(corrida('Docente Supervisor', { negrita: true, tamano: 16 }), 'center'), 'D9D9D9'),
    celdaSimple(2400, parrafo(corrida('Estudiante', { negrita: true, tamano: 16 }), 'center'), 'D9D9D9'),
    celdaSimple(1800, parrafo(corrida('Horas del mes', { negrita: true, tamano: 16 }), 'center'), 'D9D9D9'),
  ]);
  if (pasantes.length === 0) {
    return tabla([2400, 2400, 2400, 1800], [encabezado, fila([celdaSimple(9000, parrafo(corrida('No hay pasantes asignados este mes.', { tamano: 16 }), 'center'))])]);
  }
  const filas = pasantes.map(pasante => fila([
    celdaSimple(2400, parrafo(corrida(pasante.espacio_nombre, { tamano: 16 }))),
    celdaSimple(2400, parrafo(corrida(pasante.supervisor_nombre, { tamano: 16 }))),
    celdaSimple(2400, parrafo(corrida(pasante.estudiante_nombre, { tamano: 16 }))),
    celdaSimple(1800, parrafo(corrida(`${pasante.horas_mes} h`, { tamano: 16 }), 'center')),
  ]));
  return tabla([2400, 2400, 2400, 1800], [encabezado, ...filas]);
}

/** Rellena los campos simples de texto (info general, título, firmas) — comunes a ambas plantillas. */
function rellenarCamposComunes(xml: string, datos: DatosInformeMensual): string {
  xml = sustituirTodo(xml, '{{ETIQUETA_MES}}', escaparXml(datos.etiquetaMes.toUpperCase()));
  xml = sustituirTodo(xml, '{{UNIDAD_ACADEMICA}}', escaparXml(datos.general.unidad_academica));
  xml = sustituirTodo(xml, '{{CARRERA}}', escaparXml(datos.general.carrera));
  xml = sustituirTodo(xml, '{{PROYECTO_NOMBRE}}', escaparXml(datos.general.proyecto_nombre));
  xml = sustituirTodo(xml, '{{LIDER_NOMBRE}}', escaparXml(datos.general.lider_nombre));
  xml = sustituirTodo(xml, '{{SUPERVISOR_NOMBRE}}', escaparXml(datos.general.supervisor_nombre));
  xml = sustituirTodo(xml, '{{FECHA_EMISION}}', escaparXml(datos.general.fecha_emision));
  // Observaciones: párrafo completo (una o más líneas).
  xml = reemplazarParrafoMarcador(xml, '{{OBSERVACIONES}}', parrafosDeTexto(datos.observaciones || 'Ninguna.', { tamano: 18 }));
  // Actividades: párrafo completo → una línea por actividad.
  const bloqueActividades = datos.actividades.length
    ? datos.actividades.map(linea => parrafo(corrida(`• ${linea}`, { tamano: 16 }))).join('')
    : parrafo(corrida('No se registraron actividades este mes.', { tamano: 18 }));
  xml = reemplazarParrafoMarcador(xml, '{{ACTIVIDADES}}', bloqueActividades);
  return xml;
}

export async function generarInformeLiderMensualDesdePlantilla(datos: DatosInformeMensual): Promise<Buffer> {
  const zip = new PizZip(fs.readFileSync(RUTA_LIDER, 'binary'));
  let xml = zip.file('word/document.xml')!.asText();
  const imagenes: ImagenIncrustada[] = [];
  let contador = 0;
  const registrarImagen = (datosImagen: Buffer, extension: 'png' | 'jpeg') => {
    contador++;
    const relacion = `rIdMensual${contador}`;
    imagenes.push({ relacion, extension, datos: datosImagen });
    return { relacion, identificador: 900 + contador };
  };

  xml = rellenarCamposComunes(xml, datos);

  // 2.2 Beneficiarios: una narrativa por espacio.
  const bloqueBenef = datos.espacios.length
    ? datos.espacios.map(espacio => parrafosDeTexto(narrativaEspacio(espacio), { tamano: 16 })).join(parrafo(''))
    : parrafo(corrida('No hay espacios de vinculación registrados.', { tamano: 18 }));
  xml = reemplazarParrafoMarcador(xml, '{{BENEFICIARIOS}}', bloqueBenef);

  // Zona: combinada (cantón/parroquia siempre igual — Manta/Urbanas —, barrios distintos por espacio).
  const cantones = Array.from(new Set(datos.espacios.map(e => e.zona.canton).filter(Boolean)));
  const parroquias = Array.from(new Set(datos.espacios.map(e => e.zona.parroquia).filter(Boolean)));
  const barrios = Array.from(new Set(datos.espacios.map(e => e.zona.barrio).filter(Boolean)));
  const bloqueZona = parrafosDeTexto(
    `Cantón: ${cantones.join(', ') || '—'}\nParroquias: ${parroquias.join(', ') || '—'}\nBarrios/Sectores: ${barrios.join(', ') || '—'}`,
    { tamano: 16 }
  );
  xml = reemplazarParrafoMarcador(xml, '{{ZONA}}', bloqueZona);

  // Gráfica de avance del proyecto: métrica simple en texto (sin gráfico, ver nota de alcance).
  xml = reemplazarParrafoMarcador(xml, '{{GRAFICO}}', parrafo(corrida(`Total de beneficiarios atendidos este mes: ${datos.general.total_beneficiarios}.`, { tamano: 16 })));

  // Distribución de estudiantes y docentes supervisores + Evidencias (marcador combinado, un solo párrafo).
  const bloqueDistribucion = datos.distribucion.length
    ? datos.distribucion.map(bloque => parrafo(corrida(`${bloque.espacio_nombre} — Supervisor: ${bloque.supervisor_nombre}. Estudiantes: ${bloque.pasantes.join(', ')}.`, { tamano: 16 }))).join('')
    : parrafo(corrida('Sin pasantes asignados este mes.', { tamano: 16 }));
  const bloqueEvidencias = await construirBloqueEvidencias(datos.evidencias, registrarImagen);
  xml = reemplazarParrafoMarcador(xml, '{{DISTRIBUCION_DOCENTES}}', bloqueDistribucion + parrafo('') + bloqueEvidencias);

  zip.file('word/document.xml', xml);
  incrustarImagenes(zip, imagenes);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export async function generarInformeSupervisorMensualDesdePlantilla(datos: DatosInformeMensual): Promise<Buffer> {
  const zip = new PizZip(fs.readFileSync(RUTA_SUPERVISOR, 'binary'));
  let xml = zip.file('word/document.xml')!.asText();
  const imagenes: ImagenIncrustada[] = [];
  let contador = 0;
  const registrarImagen = (datosImagen: Buffer, extension: 'png' | 'jpeg') => {
    contador++;
    const relacion = `rIdMensual${contador}`;
    imagenes.push({ relacion, extension, datos: datosImagen });
    return { relacion, identificador: 900 + contador };
  };

  xml = rellenarCamposComunes(xml, datos);

  // Fila-plantilla de Beneficiarios+Zona: clonar una fila por espacio. Se ubica por la posición
  // exacta del marcador (buscando el <w:tr> más cercano hacia atrás/adelante), NO con un regex
  // global desde el inicio del documento — ese regex capturaba desde el primer <w:tr> de TODO
  // el documento (la tabla de Información General) hasta el marcador, duplicando el documento
  // entero por cada espacio al clonar (bug real encontrado en producción, Sesión 58).
  const idxMarcadorFila = xml.indexOf('{{ESPACIO_NARRATIVA}}');
  if (idxMarcadorFila === -1) throw new Error('No se encontró {{ESPACIO_NARRATIVA}} en informe-supervisor-mensual.docx');
  const inicioFilaPlantilla = (() => {
    const re = /<w:tr(?=[ >])/g;
    let m, ultimo = -1;
    while ((m = re.exec(xml)) && m.index < idxMarcadorFila) ultimo = m.index;
    if (ultimo === -1) throw new Error('No se encontró <w:tr> antes de {{ESPACIO_NARRATIVA}}');
    return ultimo;
  })();
  const finFilaPlantilla = xml.indexOf('</w:tr>', idxMarcadorFila) + '</w:tr>'.length;
  const filaPlantilla = xml.slice(inicioFilaPlantilla, finFilaPlantilla);
  const filasGeneradas = datos.espacios.length
    ? datos.espacios.map(espacio =>
        filaPlantilla
          .replace('{{ESPACIO_NARRATIVA}}', escaparXml(narrativaEspacio(espacio)).replace(/\n/g, '</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">'))
          .replace('{{ZONA_NARRATIVA}}', escaparXml(narrativaZona(espacio.zona)).replace(/\n/g, '</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">'))
      ).join('')
    : filaPlantilla
        .replace('{{ESPACIO_NARRATIVA}}', 'No hay espacios asignados.')
        .replace('{{ZONA_NARRATIVA}}', '—');
  xml = xml.replace(filaPlantilla, filasGeneradas);

  // Evidencias + tabla de horas por pasante (marcador combinado).
  const bloqueEvidencias = parrafo(corrida('Evidencias', { negrita: true, tamano: 20 })) + await construirBloqueEvidencias(datos.evidencias, registrarImagen);
  const bloqueHoras = parrafo(corrida('Horas de los pasantes en el mes', { negrita: true, tamano: 20 })) + construirTablaHoras(datos.pasantes);
  xml = reemplazarParrafoMarcador(xml, '{{EVIDENCIAS_Y_HORAS}}', bloqueEvidencias + parrafo('') + bloqueHoras);

  zip.file('word/document.xml', xml);
  incrustarImagenes(zip, imagenes);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function incrustarImagenes(zip: PizZip, imagenes: ImagenIncrustada[]) {
  if (!imagenes.length) return;
  let relaciones = zip.file('word/_rels/document.xml.rels')!.asText();
  let tipos = zip.file('[Content_Types].xml')!.asText();
  imagenes.forEach(imagen => {
    const nombreArchivo = `mensual_${imagen.relacion}.${imagen.extension === 'jpeg' ? 'jpg' : 'png'}`;
    zip.file(`word/media/${nombreArchivo}`, imagen.datos);
    relaciones = relaciones.replace('</Relationships>', `<Relationship Id="${imagen.relacion}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${nombreArchivo}"/></Relationships>`);
  });
  if (imagenes.some(imagen => imagen.extension === 'jpeg') && !/Extension="jpg"/i.test(tipos)) {
    tipos = tipos.replace('<Default Extension="png"', '<Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="png"');
  }
  zip.file('word/_rels/document.xml.rels', relaciones);
  zip.file('[Content_Types].xml', tipos);
}
