// Rellena la plantilla institucional "Informe de Avances y Logros Proyecto (Líder)".
// Se conserva la plantilla tal cual (encabezado, textos, colores); solo se completan celdas,
// se agregan filas y se insertan cronograma, gráficos, fotos y listas de participantes.
// La plantilla trae tablas anidadas, por eso se edita con DOM y no con expresiones regulares.
//
// Tolerante a cambios de la plantilla: cada sección se ubica por su título, no por su posición.
// Si se borraron las notas de elaboración («Ejemplo:», «Copiar el cronograma…», etc.) o filas vacías,
// el contenido se agrega igual al final de la celda correspondiente.
import fs from 'fs';
import { pieDeFoto } from '@/lib/pieFotoInforme';
import path from 'path';
import PizZip from 'pizzip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import {
  NOMBRES_MESES,
  COLOR_EJECUTADO,
  COLOR_PLANIFICADO,
  escaparXml,
  corrida,
  parrafo,
  celdaSimple,
  tabla,
  fila,
  dimensionesImagen,
  dibujoEnLinea,
  descargarFoto,
} from './plantillaSupervisor';

const RUTA_PLANTILLA = path.join(process.cwd(), 'templates', 'informe-vinculacion-lider-semestral.docx');
const NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';

type Nodo = any;

export interface DatosInformeLider {
  periodo: { etiquetaLarga: string; etiqueta: string; mesesPeriodo: number[]; anio: number; hasta: string };
  general: Record<string, any>;
  tareas: any[];
  participacion: {
    docentes: { planificados: number; ejecutados: number };
    estudiantes: { planificados: number; ejecutados: number };
    beneficiarios_directos: number;
    beneficiarios_indirectos: number;
    genero: Record<string, number>;
    edad: Record<string, number>;
  };
  presupuesto: { cedula: string; concepto: string; solicitado: number; ejecutado: number; porcentaje: number; responsable: string | null }[];
  arbol: { central: string; causas: { texto: string; indirectas: string[] }[]; efectos: string[]; efecto_final: string };
  problemaResultados: { causa: string; resultados: string; aporte_ensenanza: string; aporte_metas: string }[];
  textos: { nuevos_problemas: string; contribucion_conocimientos: string; mejora_oferta: string; aporte_proyectos: string };
  mcer: { pretests: number; postests: number; meta_participantes: number };
  fotos: { url: string; fecha: string; espacio_nombre: string; num_beneficiarios: number; num_pasantes: number }[];
  participantes?: {
    docentes: { nombre: string; rol: string }[];
    estudiantes: string[];
    beneficiarios: { nombre: string; espacio: string }[];
  };
}

const hijosElemento = (nodo: Nodo, nombre: string): Nodo[] =>
  Array.from(nodo.childNodes as ArrayLike<Nodo>).filter(hijo => hijo.nodeType === 1 && hijo.nodeName === nombre);
const textoDe = (nodo: Nodo): string =>
  Array.from(nodo.getElementsByTagName('w:t') as ArrayLike<Nodo>).map(t => t.textContent || '').join('');
const textoLimpio = (nodo: Nodo): string => textoDe(nodo).replace(/\s+/g, ' ').trim();
const filasDe = (tablaNodo: Nodo): Nodo[] => hijosElemento(tablaNodo, 'w:tr');
const celdasDe = (filaNodo: Nodo): Nodo[] => hijosElemento(filaNodo, 'w:tc');
const parrafosDe = (celda: Nodo): Nodo[] => hijosElemento(celda, 'w:p');

export async function generarInformeLiderDesdePlantilla(
  datos: DatosInformeLider,
  graficos: { avance?: Buffer | null; genero?: Buffer | null; edad?: Buffer | null }
): Promise<Buffer> {
  return generarDesdeArchivo(RUTA_PLANTILLA, datos, graficos);
}

/** Igual que la anterior, pero con una plantilla indicada (sirve para probar variantes de la plantilla). */
export async function generarDesdeArchivo(
  rutaPlantilla: string,
  datos: DatosInformeLider,
  graficos: { avance?: Buffer | null; genero?: Buffer | null; edad?: Buffer | null }
): Promise<Buffer> {
  const zip = new PizZip(fs.readFileSync(rutaPlantilla, 'binary'));
  const documento: Nodo = new DOMParser().parseFromString(zip.file('word/document.xml')!.asText().replace(/^﻿/, ''), 'text/xml');
  const cuerpo: Nodo = documento.getElementsByTagName('w:body')[0];
  const elementosCuerpo: Nodo[] = Array.from(cuerpo.childNodes as ArrayLike<Nodo>).filter(nodo => nodo.nodeType === 1);
  const tablasCuerpo = elementosCuerpo.filter(nodo => nodo.nodeName === 'w:tbl');
  const parrafosCuerpo = elementosCuerpo.filter(nodo => nodo.nodeName === 'w:p');

  const imagenes: { relacion: string; extension: 'png' | 'jpeg'; datos: Buffer }[] = [];
  const registrarImagen = (datosImagen: Buffer, extension: 'png' | 'jpeg') => {
    const relacion = `rIdLider${imagenes.length + 1}`;
    imagenes.push({ relacion, extension, datos: datosImagen });
    return { relacion, identificador: 800 + imagenes.length };
  };
  const imagenComoParrafo = (datosImagen: Buffer, extension: 'png' | 'jpeg', anchoMaximo: number) => {
    const dimensiones = dimensionesImagen(datosImagen) ?? { ancho: 4, alto: 3 };
    const ancho = Math.min(anchoMaximo, dimensiones.ancho);
    const alto = Math.round((ancho * dimensiones.alto) / dimensiones.ancho);
    const { relacion, identificador } = registrarImagen(datosImagen, extension);
    return parrafo(dibujoEnLinea(relacion, ancho, alto, identificador), 'center');
  };

  /** Convierte un fragmento XML de WordprocessingML en nodos importables al documento. */
  const nodosDesdeXml = (xml: string): Nodo[] => {
    const fragmento: Nodo = new DOMParser().parseFromString(`<raiz ${NS}>${xml}</raiz>`, 'text/xml');
    return Array.from(fragmento.documentElement.childNodes as ArrayLike<Nodo>).map(nodo => documento.importNode(nodo, true));
  };
  const agregarXml = (contenedor: Nodo, xml: string) => {
    nodosDesdeXml(xml).forEach(nodo => contenedor.appendChild(nodo));
    // Una celda no puede terminar en una tabla.
    const ultimo = Array.from(contenedor.childNodes as ArrayLike<Nodo>).filter(hijo => hijo.nodeType === 1).pop();
    if (ultimo && ultimo.nodeName === 'w:tbl') nodosDesdeXml('<w:p/>').forEach(nodo => contenedor.appendChild(nodo));
  };
  const insertarDespues = (referencia: Nodo, xml: string) => {
    let anterior = referencia;
    nodosDesdeXml(xml).forEach(nodo => {
      anterior.parentNode.insertBefore(nodo, anterior.nextSibling);
      anterior = nodo;
    });
  };
  const agregarTextoAParrafo = (parrafoNodo: Nodo, texto: string, opciones: { negrita?: boolean; tamano?: number } = {}) => {
    nodosDesdeXml(corrida(texto, opciones)).forEach(nodo => parrafoNodo.appendChild(nodo));
  };
  /** Reemplaza todo el texto de un párrafo/celda por un valor nuevo, conservando el formato del primer texto. */
  const fijarTexto = (nodo: Nodo, texto: string) => {
    const textos: Nodo[] = Array.from(nodo.getElementsByTagName('w:t') as ArrayLike<Nodo>);
    if (!textos.length) {
      const primerParrafo = nodo.nodeName === 'w:p' ? nodo : parrafosDe(nodo)[0];
      if (primerParrafo) agregarTextoAParrafo(primerParrafo, texto, { tamano: 18 });
      return;
    }
    textos[0].textContent = texto;
    textos[0].setAttribute('xml:space', 'preserve');
    textos.slice(1).forEach(t => { t.textContent = ''; });
  };

  // ---- ubicación de secciones por título (no por posición) ----
  const tablaQueEmpieza = (texto: string): Nodo | undefined => tablasCuerpo.find(tablaNodo => textoLimpio(tablaNodo).startsWith(texto));
  const indiceFilaQueEmpieza = (tablaNodo: Nodo, texto: string): number => filasDe(tablaNodo).findIndex(filaNodo => textoLimpio(filaNodo).startsWith(texto));
  const indiceFilaQueContiene = (tablaNodo: Nodo, texto: string): number => filasDe(tablaNodo).findIndex(filaNodo => textoLimpio(filaNodo).includes(texto));
  /** Celda de contenido de una sección: la fila indicada si existe; si no, la última fila de la tabla. */
  const celdaDestino = (tablaNodo: Nodo, indiceFila: number): Nodo => {
    const filas = filasDe(tablaNodo);
    return celdasDe(filas[Math.min(indiceFila, filas.length - 1)])[0];
  };
  const parrafoQueEmpieza = (raiz: Nodo, texto: string): Nodo | undefined =>
    Array.from(raiz.getElementsByTagName('w:p') as ArrayLike<Nodo>).find(p => textoLimpio(p).startsWith(texto));
  /** Inserta después del párrafo-ancla (nota de la plantilla) o, si ya no existe, al final de la celda. */
  const colocar = (celda: Nodo, anclas: string[], xml: string) => {
    const ancla = anclas.map(texto => parrafoQueEmpieza(celda, texto)).find(Boolean);
    if (ancla) insertarDespues(ancla, xml);
    else agregarXml(celda, xml);
  };

  const lineas = (texto: string) => String(texto || '').split(/\n+/).map(linea => linea.trim()).filter(Boolean);
  const parrafosDeTexto = (texto: string) => lineas(texto).map(linea => parrafo(corrida(linea, { tamano: 18 }))).join('');

  /** Clona una fila de plantilla sin duplicar identificadores únicos de Word. */
  const clonarFila = (filaNodo: Nodo, vaciar = false): Nodo => {
    const clon = filaNodo.cloneNode(true);
    const limpiar = (nodo: Nodo) => {
      if (nodo.nodeType !== 1) return;
      ['w14:paraId', 'w14:textId'].forEach(atributo => nodo.hasAttribute(atributo) && nodo.removeAttribute(atributo));
      if (vaciar && nodo.nodeName === 'w:t') nodo.textContent = '';
      Array.from(nodo.childNodes as ArrayLike<Nodo>).forEach(limpiar);
    };
    limpiar(clon);
    return clon;
  };
  const llenarFila = (filaNodo: Nodo, valores: string[], tamano = 18) => {
    celdasDe(filaNodo).forEach((celda, indice) => {
      const valor = valores[indice];
      const primerParrafo = parrafosDe(celda)[0];
      if (valor && primerParrafo) agregarTextoAParrafo(primerParrafo, valor, { tamano });
    });
  };
  /**
   * Reemplaza las filas vacías de plantilla (desde `indicePrimeraFilaVacia`) por filas con datos.
   * Sin datos conserva la plantilla. Si la plantilla ya no trae filas vacías, clona la fila de encabezado.
   */
  const rellenarFilasVacias = (contenedorFilas: Nodo, indicePrimeraFilaVacia: number, filasDatos: string[][]) => {
    if (!filasDatos.length) return;
    const filas = filasDe(contenedorFilas);
    const hayFilaVacia = filas.length > indicePrimeraFilaVacia;
    const modelo = hayFilaVacia ? clonarFila(filas[indicePrimeraFilaVacia]) : clonarFila(filas[filas.length - 1], true);
    if (hayFilaVacia) filas.slice(indicePrimeraFilaVacia).forEach(filaVacia => contenedorFilas.removeChild(filaVacia));
    filasDatos.forEach(valores => {
      const nueva = clonarFila(modelo);
      llenarFila(nueva, valores);
      contenedorFilas.appendChild(nueva);
    });
  };

  const general = datos.general;

  // Encabezado del documento: facultad y fecha (mes-año).
  const parrafoFacultad = parrafosCuerpo.find(p => textoLimpio(p).toUpperCase().startsWith('FACULTAD DE'));
  if (parrafoFacultad) fijarTexto(parrafoFacultad, `FACULTAD DE ${String(general.facultad || '').toUpperCase()}`);
  const parrafoFecha = parrafosCuerpo.find(p => /^[….\s]*DE\s+\d{4}$/i.test(textoLimpio(p)));
  if (parrafoFecha) fijarTexto(parrafoFecha, general.fecha_texto || '');

  // 1. Información general.
  const tablaGeneral = tablaQueEmpieza('Nombre del Proyecto');
  const valoresGenerales: [string, string][] = [
    ['Nombre del Proyecto', general.proyecto_nombre],
    ['Código de proyecto', general.proyecto_codigo],
    ['Unidad Académica', general.unidad_academica],
    ['Carrera', general.carrera],
    ['Nombre del docente líder', general.lider_nombre],
    ['Vigencia del proyecto', general.vigencia],
    ['Entidad beneficiaria', general.entidad_beneficiaria],
    ['No. Beneficiarios Directos', String(datos.participacion.beneficiarios_directos)],
    ['No. Beneficiarios Indirectos', String(datos.participacion.beneficiarios_indirectos)],
    ['Objetivo de Desarrollo Sostenible', general.ods],
    ['Línea de Investigación', general.linea_investigacion],
  ];
  if (tablaGeneral) {
    filasDe(tablaGeneral).forEach(filaNodo =>
      celdasDe(filaNodo).forEach(celda =>
        parrafosDe(celda).forEach(parrafoNodo => {
          const etiqueta = textoLimpio(parrafoNodo);
          const coincidencia = valoresGenerales.find(([nombre]) => etiqueta.startsWith(nombre));
          if (coincidencia && coincidencia[1]) agregarTextoAParrafo(parrafoNodo, ` ${coincidencia[1]}`);
        })
      )
    );
  }

  // Planificación/Ejecución: cronograma sombreado por mes.
  const tablaCronograma = tablaQueEmpieza('Planificación/Ejecución');
  if (tablaCronograma) {
    const meses = datos.periodo.mesesPeriodo;
    const anchoTarea = 3000;
    const anchoMes = Math.floor(5600 / meses.length);
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
    const encabezadoCronograma = fila([
      celdaSimple(anchoTarea, parrafo(corrida('Actividad / tarea', { negrita: true, tamano: 16 })), 'D9D9D9'),
      ...meses.map(mesPeriodo => celdaSimple(anchoMes, parrafo(corrida(NOMBRES_MESES[mesPeriodo - 1], { negrita: true, tamano: 16 }), 'center'), 'D9D9D9')),
    ]);
    colocar(
      celdaDestino(tablaCronograma, 2),
      ['Copiar el cronograma'],
      datos.tareas.length
        ? tabla([anchoTarea, ...meses.map(() => anchoMes)], [encabezadoCronograma, ...filasCronograma]) +
            parrafo(corrida('Verde: realizado (con registros aprobados) · Azul: planificado, aún sin registros aprobados.', { tamano: 16 }))
        : parrafo(corrida('No hay tareas planificadas cargadas para este periodo en el plan del proyecto.', { tamano: 18 }))
    );
  }

  // Actividades ejecutadas / resultados.
  const tablaActividades = tablaQueEmpieza('Actividades ejecutadas');
  if (tablaActividades) {
    const tareasEjecutadas = datos.tareas.filter(tarea => (tarea.realizado ?? 0) > 0 || tarea.observaciones);
    const indiceEncabezado = Math.max(indiceFilaQueEmpieza(tablaActividades, 'Objetivo Específico'), 1);
    rellenarFilasVacias(
      tablaActividades,
      indiceEncabezado + 1,
      tareasEjecutadas.map(tarea => [
        tarea.objetivo,
        `${tarea.codigo} ${tarea.nombre}`,
        tarea.metodologia,
        [
          tarea.realizado != null && tarea.meta != null ? `Realizado ${tarea.realizado} de ${tarea.meta} ${tarea.unidad}${tarea.avance != null ? ` (${tarea.avance}%)` : ''}.` : '',
          tarea.productos_sociales,
          tarea.productos_academicos,
        ].filter(Boolean).join(' '),
        [`${tarea.alumnos} estudiante(s) participante(s).`, tarea.observaciones].filter(Boolean).join(' '),
      ])
    );
  }

  // 4. Participantes.
  const tablaParticipantes = tablaQueEmpieza('Participantes');
  if (tablaParticipantes) {
    const tablaAnidadaParticipantes = tablaParticipantes.getElementsByTagName('w:tbl')[0];
    if (tablaAnidadaParticipantes) {
      const porcentaje = (ejecutado: number, planificado: number) => (planificado > 0 ? `${Math.round((ejecutado / planificado) * 100)}%` : '—');
      const filasAnidadas = filasDe(tablaAnidadaParticipantes);
      const filaExacta = (etiqueta: string) => filasAnidadas.find(filaNodo => textoLimpio(celdasDe(filaNodo)[0] || filaNodo) === etiqueta);
      [
        [filaExacta('Docentes'), datos.participacion.docentes],
        [filaExacta('Estudiantes'), datos.participacion.estudiantes],
      ].forEach(([filaNodo, valores]: any) => {
        if (!filaNodo) return;
        const celdas = celdasDe(filaNodo);
        if (celdas.length < 4) return;
        fijarTexto(celdas[1], String(valores.planificados));
        fijarTexto(celdas[2], String(valores.ejecutados));
        fijarTexto(celdas[3], porcentaje(valores.ejecutados, valores.planificados));
      });
    }

    const generoDatos = datos.participacion.genero;
    const rangosEdad = Object.entries(datos.participacion.edad).filter(([, cantidad]) => cantidad > 0).map(([rango, cantidad]) => `${rango} años: ${cantidad}`).join(' · ');
    const indice42 = indiceFilaQueEmpieza(tablaParticipantes, '4.2');
    colocar(
      celdaDestino(tablaParticipantes, indice42 >= 0 ? indice42 + 1 : 4),
      ['Números de beneficiarios'],
      parrafo(corrida(`Beneficiarios directos: ${datos.participacion.beneficiarios_directos} (mujeres ${generoDatos.femenino ?? 0}, hombres ${generoDatos.masculino ?? 0}, otro/sin dato ${(generoDatos.otro ?? 0) + (generoDatos.prefiero_no_decir ?? 0)}). Rangos de edad: ${rangosEdad || 'sin datos'}.`, { tamano: 18 })) +
        parrafo(corrida(`Beneficiarios indirectos: ${datos.participacion.beneficiarios_indirectos} personas (audiencia alcanzada por podcasts y eventos de difusión aprobados).`, { tamano: 18 })) +
        (graficos.genero ? imagenComoParrafo(graficos.genero, 'png', 260) : '') +
        (graficos.edad ? imagenComoParrafo(graficos.edad, 'png', 300) : '')
    );

    const indiceZona = indiceFilaQueContiene(tablaParticipantes, 'Zona donde');
    colocar(
      celdaDestino(tablaParticipantes, indiceZona >= 0 ? indiceZona : 5),
      ['Cantón, Parroquia', 'Zona donde'],
      parrafo(corrida([general.zona, general.parroquia].filter(Boolean).join(' · ') || 'Sin zona registrada en la ficha del proyecto.', { tamano: 18 }))
    );

    const { pretests, postests, meta_participantes: metaParticipantes } = datos.mcer;
    const indiceGrafica = indiceFilaQueContiene(tablaParticipantes, 'Gráfica del avance');
    colocar(
      celdaDestino(tablaParticipantes, indiceGrafica >= 0 ? indiceGrafica : 6),
      ['Graficar mediante', 'Gráfica del avance'],
      (graficos.avance ? imagenComoParrafo(graficos.avance, 'png', 440) : '') +
        parrafo(
          corrida(
            `Propósito del proyecto (avance de nivel MCER): meta de ${metaParticipantes} participantes que mejoran 1 subnivel en 2 años. Pre-Test aplicado a ${pretests} beneficiarios; Post-Test aplicado a ${postests}. ` +
              (postests === 0 ? 'En proceso: aún falta aplicar el Post-Test para medir el avance de subnivel.' : 'El avance se mide comparando Pre-Test y Post-Test.'),
            { tamano: 18 }
          )
        )
    );
  }

  // Problema inicial vs resultados (a partir del árbol de problemas).
  const tablaProblemas = tablaQueEmpieza('Problema Inicial Vs Resultados');
  if (tablaProblemas) {
    const indiceEncabezado = Math.max(indiceFilaQueEmpieza(tablaProblemas, 'Problema Inicial'), 1);
    // Asegura una fila por cada causa directa (clona la última fila de datos si faltan).
    while (filasDe(tablaProblemas).length - (indiceEncabezado + 1) < datos.problemaResultados.length) {
      const filas = filasDe(tablaProblemas);
      tablaProblemas.appendChild(clonarFila(filas[filas.length - 1], true));
    }
    const filasProblemas = filasDe(tablaProblemas);
    const arbol = datos.arbol;
    const listaArbol =
      parrafo(corrida(`Problema central: ${arbol.central}`, { tamano: 16, negrita: true })) +
      arbol.causas.map((causa, indice) => parrafo(corrida(`Causa ${indice + 1}: ${causa.texto}`, { tamano: 16 }))).join('') +
      arbol.efectos.map((efecto, indice) => parrafo(corrida(`Efecto ${indice + 1}: ${efecto}`, { tamano: 16 }))).join('') +
      (arbol.efecto_final ? parrafo(corrida(`Efecto final: ${arbol.efecto_final}`, { tamano: 16 })) : '');
    const primeraCelda = celdasDe(filasProblemas[indiceEncabezado + 1])[0];
    if (primeraCelda) agregarXml(primeraCelda, listaArbol);
    datos.problemaResultados.forEach((problema, indice) => {
      const celdas = celdasDe(filasProblemas[indiceEncabezado + 1 + indice]);
      const valores = [problema.resultados, problema.aporte_ensenanza, problema.aporte_metas];
      // La primera columna (Problema Inicial) está combinada verticalmente; las demás son las últimas 3.
      celdas.slice(Math.max(celdas.length - 3, 0)).forEach((celda, columna) => {
        const primerParrafo = parrafosDe(celda)[0];
        const texto = `${columna === 0 ? `Causa ${indice + 1}: ` : ''}${valores[columna] || ''}`;
        if (primerParrafo && texto.trim()) agregarTextoAParrafo(primerParrafo, texto, { tamano: 16 });
      });
    });
  }

  // Identificación de nuevos problemas y aportes (textos de IA editables).
  const agregarTextoASeccion = (inicio: string, texto: string) => {
    const tablaSeccion = tablaQueEmpieza(inicio);
    if (tablaSeccion && texto) agregarXml(celdaDestino(tablaSeccion, 1), parrafosDeTexto(texto));
  };
  agregarTextoASeccion('Identificación de nuevos problemas', datos.textos.nuevos_problemas);
  agregarTextoASeccion('Contribución a la generación', datos.textos.contribucion_conocimientos);
  agregarTextoASeccion('Propuesta de mejora', datos.textos.mejora_oferta);
  agregarTextoASeccion('Aporte a la elaboración', datos.textos.aporte_proyectos);

  // Ejecución de presupuesto (tabla anidada).
  const tablaPresupuesto = tablaQueEmpieza('Ejecución de Presupuesto');
  const tablaAnidadaPresupuesto = tablaPresupuesto?.getElementsByTagName('w:tbl')[0];
  if (tablaAnidadaPresupuesto && datos.presupuesto.length) {
    const dinero = (valor: number) => `$ ${Number(valor || 0).toFixed(2)}`;
    const indiceSolicitado = indiceFilaQueContiene(tablaAnidadaPresupuesto, 'SOLICITADO');
    rellenarFilasVacias(
      tablaAnidadaPresupuesto,
      (indiceSolicitado >= 0 ? indiceSolicitado : 1) + 1,
      datos.presupuesto.map(item => [item.cedula || '', item.concepto || '', dinero(item.solicitado), dinero(item.ejecutado), `${item.porcentaje}%`, item.responsable || ''])
    );
  }

  // Adjuntos: fotos (una por espacio) y listas de docentes, estudiantes y beneficiarios que participaron.
  const tablaAdjuntos = tablaQueEmpieza('Adjuntos');
  if (tablaAdjuntos) {
    const celdaAdjuntos = celdaDestino(tablaAdjuntos, 1);
    const fotosDescargadas = (await Promise.all(datos.fotos.map(async foto => ({ foto, datosFoto: await descargarFoto(foto.url) })))).filter(elemento => elemento.datosFoto);
    let bloque = '';
    if (fotosDescargadas.length) {
      const celdasFotos = fotosDescargadas.map(({ foto, datosFoto }) =>
        celdaSimple(
          4400,
          imagenComoParrafo(datosFoto!, 'jpeg', 230) +
            parrafo(corrida(pieDeFoto(foto), { tamano: 14 }), 'center')
        )
      );
      const filasFotos: string[] = [];
      for (let indice = 0; indice < celdasFotos.length; indice += 2) {
        const par = celdasFotos.slice(indice, indice + 2);
        if (par.length === 1) par.push(celdaSimple(4400, ''));
        filasFotos.push(fila(par));
      }
      bloque += parrafo(corrida('Evidencias fotográficas (una por espacio de enseñanza):', { negrita: true, tamano: 18 })) + tabla([4400, 4400], filasFotos, false) + parrafo('');
    } else {
      bloque += parrafo(corrida('No hay fotografías de sesiones aprobadas en el periodo.', { tamano: 18 }));
    }

    const listas = datos.participantes;
    const tablaNumerada = (elementos: string[]) => {
      const filasLista: string[] = [];
      for (let indice = 0; indice < elementos.length; indice += 2) {
        const par = elementos.slice(indice, indice + 2).map((texto, desplazamiento) => celdaSimple(4400, parrafo(corrida(`${indice + desplazamiento + 1}. ${texto}`, { tamano: 14 }))));
        if (par.length === 1) par.push(celdaSimple(4400, ''));
        filasLista.push(fila(par));
      }
      return tabla([4400, 4400], filasLista);
    };
    if (listas?.docentes.length) {
      bloque +=
        parrafo(corrida(`Lista de docentes (supervisores y líder): ${listas.docentes.length}`, { negrita: true, tamano: 18 })) +
        tablaNumerada(listas.docentes.map(docente => `${docente.nombre}${docente.rol ? ` — ${docente.rol}` : ''}`)) +
        parrafo('');
    }
    if (listas?.estudiantes.length) {
      bloque += parrafo(corrida(`Lista de estudiantes (pasantes): ${listas.estudiantes.length}`, { negrita: true, tamano: 18 })) + tablaNumerada(listas.estudiantes) + parrafo('');
    }
    if (listas?.beneficiarios.length) {
      bloque +=
        parrafo(corrida(`Lista de beneficiarios: ${listas.beneficiarios.length}`, { negrita: true, tamano: 18 })) +
        tablaNumerada(listas.beneficiarios.map(beneficiario => `${beneficiario.nombre}${beneficiario.espacio ? ` (${beneficiario.espacio})` : ''}`));
    }
    colocar(celdaAdjuntos, ['Lista de Docentes', 'Detallar las Evidencias'], bloque);
  }

  // Firmas: nombres bajo las líneas de la plantilla.
  const parrafoFirma = parrafosCuerpo.find(p => textoLimpio(p).includes('Líder del Proyecto de Vinculación'));
  if (parrafoFirma) {
    insertarDespues(
      parrafoFirma,
      tabla(
        [4400, 4400],
        [fila([
          celdaSimple(4400, parrafo(corrida(general.lider_nombre || '', { tamano: 18 }), 'center')),
          celdaSimple(4400, parrafo(corrida(general.firmante_nombre || '', { tamano: 18 }), 'center')),
        ])],
        false
      )
    );
  }

  zip.file('word/document.xml', new XMLSerializer().serializeToString(documento));

  // Encabezado institucional: código y revisión.
  let encabezado = zip.file('word/header1.xml')!.asText();
  if (general.codigo_documento) encabezado = encabezado.replace(/CÓDIGO: <\/w:t>/, () => `CÓDIGO: ${escaparXml(general.codigo_documento)}</w:t>`);
  if (general.revision_documento) encabezado = encabezado.replace(/REVISIÓN:   <\/w:t>/, () => `REVISIÓN: ${escaparXml(general.revision_documento)}   </w:t>`);
  zip.file('word/header1.xml', encabezado);

  if (imagenes.length) {
    let relaciones = zip.file('word/_rels/document.xml.rels')!.asText();
    let tipos = zip.file('[Content_Types].xml')!.asText();
    imagenes.forEach(imagen => {
      const nombreArchivo = `informe_${imagen.relacion}.${imagen.extension === 'jpeg' ? 'jpg' : 'png'}`;
      zip.file(`word/media/${nombreArchivo}`, imagen.datos);
      relaciones = relaciones.replace('</Relationships>', `<Relationship Id="${imagen.relacion}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${nombreArchivo}"/></Relationships>`);
    });
    if (imagenes.some(imagen => imagen.extension === 'jpeg') && !/Extension="jpg"/i.test(tipos)) {
      tipos = tipos.replace(/<Default Extension="png"/, '<Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="png"');
    }
    zip.file('word/_rels/document.xml.rels', relaciones);
    zip.file('[Content_Types].xml', tipos);
  }

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}
