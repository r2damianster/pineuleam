'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import PhotoPicker, { CAREER_PROJECT_ID, type CarretePhoto, type ProyectoOpcion } from '@/components/rollup/PhotoPicker';
import { translations } from '@/lib/i18n';
import { FONT_PAIRS, fetchPhotoAsDataUrl, loadFontPair, loadLogo } from '@/lib/poster/assets';
import { buildQrMatrix } from '@/lib/poster/qr';
import { composeForSize } from '@/lib/poster/compose';
import { buildSvgElement, exportPdf, exportPng, exportSvg } from '@/lib/poster/render';
import { POSTER_SIZES, POSTER_THEMES, TEMA_POR_PROYECTO, themeById } from '@/lib/poster/themes';
import type { Composition, PosterContent, PosterDensity, PosterFonts, PosterImage } from '@/lib/poster/types';

interface ProyectoRollup extends ProyectoOpcion {
  slug: string;
  lider_nombre: string | null;
  hero_subtitle_es: string | null;
  hero_description_es: string | null;
  info_text_es: string | null;
  equipo: { name: string; role: string; is_leader: boolean }[];
  // Datos ya existentes del proyecto: se ofrecen con una casilla, nunca se agregan solos.
  cifras_disponibles: { key: string; n: string; l: string }[];
  objetivos: { id: number; tipo: string; texto: string }[];
  detalles: { key: string; label: string; value: string }[];
  // Valores propios de un proyecto que no sale de la tabla (hoy: el roll up general de la carrera).
  plantilla?: ProjectTemplate;
}

interface ProjectTemplate {
  kicker: string;
  itemsTitle: string;
  items: string[];
  contact: string;
  urlPath: string;
  leaderRole: string;
  teamTitle: string;
  scanLabel: string;
  objectivesTitle: string;
  /** Marca de antemano todos los datos existentes (objetivos, ficha) y las primeras cifras. */
  preselectAll: boolean;
}

interface EditableFields {
  kicker: string;
  title: string;
  subtitle: string;
  description: string;
  itemsTitle: string;
  itemsText: string;
  stats: { n: string; l: string }[];
  teamTitle: string;
  leader: string;
  teamText: string;
  scanLabel: string;
  url: string;
  contact: string;
}

const MAX_STATS = 5;
const DENSITY_OPTIONS: { id: PosterDensity; nombre: string; descripcion: string }[] = [
  { id: 'texto', nombre: 'Más texto', descripcion: 'Portada baja y pocas fotos; prioriza lo escrito' },
  { id: 'equilibrado', nombre: 'Equilibrado', descripcion: 'Mezcla de texto y fotos' },
  { id: 'imagenes', nombre: 'Más imágenes', descripcion: 'Portada grande y hasta 6 fotos de galería' },
];
const MAX_CARRETE_PHOTOS = 7; // 1 de portada (cabecera) + 6 de galería
const INITIAL_RANDOM_PHOTOS = 5;

// Ruta pública de cada proyecto (la página de cada uno vive en una ruta distinta).
const RUTA_PUBLICA_POR_PROYECTO: Record<string, string> = {
  internacionalizacion: '/investigacion/proyecto-innovacion',
  vinculacion: '/vinculacion/dinamicas-linguisticas',
  desarrollo_habilidades: '/investigacion/desarrollo-habilidades',
  mentoring: '/investigacion/mentoring',
  docencia_innovadora: '/docencia/docencia-innovadora',
  redlea: '/docencia/redlea',
};

const LOGO_ESPECIFICO_POR_PROYECTO: Record<string, string> = {
  redlea: '/images/logos/logo-red-lea.jpeg',
  internacionalizacion: '/images/logos/logo-proyecto.png',
};

function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

// Roll up general de la carrera: los textos oficiales (misión, visión, objetivo general, ficha) ya viven en
// lib/i18n.tsx para la web pública; se reutilizan aquí en vez de copiarlos.
function enrichCareerProject(project: ProyectoRollup): ProyectoRollup {
  const info = translations.es.careerInfo;
  const degree = info.datasheet.find((item) => item.label === 'Título que otorga')?.value ?? null;
  return {
    ...project,
    lider_nombre: info.contact.coordinatorName,
    hero_subtitle_es: degree,
    hero_description_es: info.occupational.text,
    objetivos: [
      { id: -1, tipo: 'mision', texto: info.mision.text },
      { id: -2, tipo: 'vision', texto: info.vision.text },
      { id: -3, tipo: 'general', texto: info.objective },
    ],
    detalles: info.datasheet.map((item, index) => ({ key: `datos_${index}`, label: item.label, value: item.value })),
    plantilla: {
      kicker: 'Facultad de Educación, Turismo, Artes y Humanidades',
      itemsTitle: info.graduation.modalitiesTitle,
      items: info.graduation.modalities,
      contact: `${info.contact.scheduleLabel} ${info.contact.schedule}`,
      urlPath: '/',
      leaderRole: info.contact.coordinatorRole,
      teamTitle: 'Coordinación',
      scanLabel: 'Escanea y conoce la carrera',
      objectivesTitle: 'Quiénes somos',
      preselectAll: true,
    },
  };
}

function fieldsFromProject(project: ProyectoRollup): EditableFields {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const leaderName = project.lider_nombre ?? project.equipo.find((member) => member.is_leader)?.name ?? '';
  const otherMembers = project.equipo.filter((member) => member.name !== leaderName).map((member) => member.name).slice(0, 8);
  const template = project.plantilla;
  return {
    kicker: template?.kicker ?? 'Carrera de Pedagogía de los Idiomas Nacionales y Extranjeros',
    title: project.nombre_oficial,
    subtitle: project.hero_subtitle_es ?? '',
    description: truncateAtWord(project.hero_description_es ?? project.info_text_es ?? '', template ? 300 : 450),
    itemsTitle: template?.itemsTitle ?? 'Líneas de trabajo',
    itemsText: (template?.items ?? []).join('\n'),
    stats: [{ n: '', l: '' }, { n: '', l: '' }, { n: '', l: '' }, { n: '', l: '' }],
    teamTitle: template?.teamTitle ?? 'Equipo',
    leader: leaderName ? `${leaderName} · ${template?.leaderRole ?? 'Líder del proyecto'}` : '',
    teamText: otherMembers.join('\n'),
    scanLabel: template?.scanLabel ?? 'Escanea y conoce más',
    url: `${origin}${template?.urlPath ?? RUTA_PUBLICA_POR_PROYECTO[project.id] ?? ''}`,
    contact: template?.contact ?? 'Universidad Laica Eloy Alfaro de Manabí',
  };
}

interface SelectedProjectData {
  cifraKeys: string[];
  objectiveIds: number[];
  detailKeys: string[];
}

function contentFromFields(fields: EditableFields, project: ProyectoRollup | null, selected: SelectedProjectData): PosterContent {
  // Cifras: primero las existentes marcadas con casilla, luego las escritas a mano (aparecen solas al llenarlas).
  const checkedFigures = (project?.cifras_disponibles ?? []).filter((figure) => selected.cifraKeys.includes(figure.key)).map((figure) => ({ n: figure.n, l: figure.l }));
  const typedFigures = fields.stats.filter((stat) => stat.n.trim() || stat.l.trim());
  return {
    kicker: fields.kicker,
    title: fields.title || ' ',
    subtitle: fields.subtitle,
    description: fields.description,
    itemsTitle: fields.itemsTitle,
    items: fields.itemsText.split('\n'),
    stats: [...checkedFigures, ...typedFigures].slice(0, MAX_STATS),
    objectivesTitle: project?.plantilla?.objectivesTitle ?? 'Objetivos del proyecto',
    objectives: (project?.objetivos ?? []).filter((objective) => selected.objectiveIds.includes(objective.id)).map((objective) => ({ tipo: objective.tipo, text: objective.texto })),
    detailsTitle: 'Ficha del proyecto',
    details: (project?.detalles ?? []).filter((detail) => selected.detailKeys.includes(detail.key)).map((detail) => ({ label: detail.label, value: detail.value })),
    teamTitle: fields.teamTitle,
    leader: fields.leader,
    team: fields.teamText.split(/\n|,/),
    scanLabel: fields.scanLabel,
    url: fields.url,
    contact: fields.contact,
  };
}

const BLOCK_NAMES: Record<string, string> = { objectives: 'Objetivos', details: 'Ficha del proyecto', stats: 'Cifras', team: 'Equipo', items: 'Lista numerada', description: 'Descripción', gallery: 'Galería', header: 'Cabecera', footer: 'Pie' };

export default function RollUpPage() {
  const [projects, setProjects] = useState<ProyectoRollup[]>([]);
  const [projectId, setProjectId] = useState('');
  const [fields, setFields] = useState<EditableFields | null>(null);
  const [themeId, setThemeId] = useState('uleam');
  const [fontPairId, setFontPairId] = useState(FONT_PAIRS[0].id);
  const [density, setDensity] = useState<PosterDensity>('equilibrado');
  const [selectedData, setSelectedData] = useState<SelectedProjectData>({ cifraKeys: [], objectiveIds: [], detailKeys: [] });
  const [sizeId, setSizeId] = useState('rollup-85x200');
  const [customWidthCm, setCustomWidthCm] = useState(90);
  const [customHeightCm, setCustomHeightCm] = useState(120);
  const [carrete, setCarrete] = useState<CarretePhoto[]>([]);
  const [preparedImages, setPreparedImages] = useState<Record<string, PosterImage>>({});
  const [failedKeys, setFailedKeys] = useState<string[]>([]);
  const [fonts, setFonts] = useState<PosterFonts | null>(null);
  const [logos, setLogos] = useState<PosterImage[]>([]);
  const [qrMatrix, setQrMatrix] = useState<boolean[][] | null>(null);
  const [composition, setComposition] = useState<Composition | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [pickerMode, setPickerMode] = useState<{ mode: 'add' | 'replace'; replaceIndex?: number } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [downloadedFormats, setDownloadedFormats] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const currentProject = projects.find((project) => project.id === projectId) ?? null;
  const selectedSize = POSTER_SIZES.find((size) => size.id === sizeId) ?? POSTER_SIZES[0];
  const widthCm = sizeId === 'custom' ? Math.min(300, Math.max(20, customWidthCm)) : selectedSize.widthCm;
  const heightCm = sizeId === 'custom' ? Math.min(400, Math.max(20, customHeightCm)) : selectedSize.heightCm;
  const theme = themeById(themeId);
  const content = useMemo(() => (fields ? contentFromFields(fields, currentProject, selectedData) : null), [fields, currentProject, selectedData]);

  const markDirty = useCallback(() => { setIsDirty(true); setDownloadedFormats([]); }, []);

  // ── Aviso al salir: el roll up no se guarda en ningún lado ──
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // ── Carga de proyectos ──
  useEffect(() => {
    fetch('/api/rollup/proyectos')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('No se pudieron cargar los proyectos'))))
      .then((rawProjects: ProyectoRollup[]) => {
        const data = rawProjects.map((project) => (project.id === CAREER_PROJECT_ID ? enrichCareerProject(project) : project));
        setProjects(data);
        // Por defecto: el roll up general de la carrera (viene primero).
        if (data.length > 0) selectProject(data[0], data, false);
      })
      .catch((error) => setLoadError(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRandomPhotos = useCallback(async (id: string) => {
    setIsLoadingPhotos(true);
    try {
      // La carrera no es una fila de `proyectos`: sin filtro de proyecto salen fotos de todo el banco.
      const projectFilter = id === CAREER_PROJECT_ID ? '' : id;
      const response = await fetch(`/api/rollup/fotos?proyecto=${encodeURIComponent(projectFilter)}&azar=${INITIAL_RANDOM_PHOTOS}`);
      const data = response.ok ? await response.json() : { items: [] };
      setCarrete((data.items ?? []).map((item: any): CarretePhoto => ({ key: `foto-${item.id}`, thumb: item.thumb, url: item.url, titulo: item.titulo, origen: 'proyecto' })));
    } finally {
      setIsLoadingPhotos(false);
    }
  }, []);

  function selectProject(project: ProyectoRollup, _list: ProyectoRollup[], askConfirmation: boolean) {
    if (askConfirmation && isDirty && !window.confirm('Cambiar de proyecto reemplaza lo que ya armaste y NO se puede recuperar (el roll up no se guarda). ¿Continuar?')) return;
    setProjectId(project.id);
    setFields(fieldsFromProject(project));
    setSelectedData(project.plantilla?.preselectAll
      ? { cifraKeys: project.cifras_disponibles.slice(0, 4).map((figure) => figure.key), objectiveIds: project.objetivos.map((objective) => objective.id), detailKeys: project.detalles.map((detail) => detail.key) }
      : { cifraKeys: [], objectiveIds: [], detailKeys: [] });
    setThemeId(TEMA_POR_PROYECTO[project.id] ?? 'uleam');
    setIsDirty(false);
    setDownloadedFormats([]);
    loadRandomPhotos(project.id);
  }

  // ── Fuentes ──
  useEffect(() => {
    let isCancelled = false;
    loadFontPair(fontPairId).then((loaded) => { if (!isCancelled) setFonts(loaded); }).catch((error) => setLoadError(error.message));
    return () => { isCancelled = true; };
  }, [fontPairId]);

  // ── Logos: ULEAM (píldora de cabecera) + carrera + el específico del proyecto (franja inferior) ──
  useEffect(() => {
    if (!projectId) return;
    let isCancelled = false;
    const specificLogoPath = LOGO_ESPECIFICO_POR_PROYECTO[projectId] ?? '/images/logos/logo-grupo-investigacion.png';
    Promise.all(['/images/logos/logo-uleam.png', '/images/logos/logo-carrera-pine.jpg', specificLogoPath].map(loadLogo))
      .then((loaded) => { if (!isCancelled) setLogos(loaded.filter((logo): logo is PosterImage => Boolean(logo))); });
    return () => { isCancelled = true; };
  }, [projectId]);

  // ── QR ──
  useEffect(() => {
    if (!fields?.url.trim()) { setQrMatrix(null); return; }
    let isCancelled = false;
    buildQrMatrix(fields.url.trim()).then((matrix) => { if (!isCancelled) setQrMatrix(matrix); });
    return () => { isCancelled = true; };
  }, [fields?.url]);

  // ── Fotos del carrete: descarga y reducción (se incrustan como data URL) ──
  useEffect(() => {
    carrete.forEach((photo) => {
      if (preparedImages[photo.key] || failedKeys.includes(photo.key)) return;
      fetchPhotoAsDataUrl(photo.url)
        .then((prepared) => setPreparedImages((current) => ({ ...current, [photo.key]: prepared })))
        .catch(() => setFailedKeys((current) => [...current, photo.key]));
    });
  }, [carrete, preparedImages, failedKeys]);

  const preparedPhotos = useMemo(
    () => carrete.map((photo) => preparedImages[photo.key]).filter((image): image is PosterImage => Boolean(image)),
    [carrete, preparedImages],
  );

  // ── Composición (con pequeño retraso: componer recorre varios anchos de diseño) ──
  useEffect(() => {
    if (!fonts || !content || logos.length === 0) return;
    setIsComposing(true);
    const timer = setTimeout(() => {
      try {
        const nextComposition = composeForSize({ fonts, theme, content, photos: preparedPhotos, logos, qrMatrix, density }, widthCm, heightCm);
        setComposition(nextComposition);
        const svg = buildSvgElement(nextComposition, theme.paper);
        svg.setAttribute('style', 'display:block;width:100%;height:100%');
        svgRef.current = svg;
        previewContainerRef.current?.replaceChildren(svg);
      } finally {
        setIsComposing(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [fonts, content, logos, theme, preparedPhotos, qrMatrix, density, widthCm, heightCm]);

  // ── Edición ──
  const updateField = <K extends keyof EditableFields>(fieldName: K, value: EditableFields[K]) => {
    setFields((current) => (current ? { ...current, [fieldName]: value } : current));
    markDirty();
  };
  const updateStat = (statIndex: number, part: 'n' | 'l', value: string) => {
    setFields((current) => (current ? { ...current, stats: current.stats.map((stat, index) => (index === statIndex ? { ...stat, [part]: value } : stat)) } : current));
    markDirty();
  };

  const toggleSelected = (group: keyof SelectedProjectData, value: string | number) => {
    setSelectedData((current) => {
      const list = current[group] as (string | number)[];
      const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
      return { ...current, [group]: next } as SelectedProjectData;
    });
    markDirty();
  };

  const handlePickPhoto = (photo: CarretePhoto) => {
    markDirty();
    if (pickerMode?.mode === 'replace' && pickerMode.replaceIndex !== undefined) {
      setCarrete((current) => current.map((existing, index) => (index === pickerMode.replaceIndex ? photo : existing)));
      return;
    }
    setCarrete((current) => (current.length >= MAX_CARRETE_PHOTOS || current.some((existing) => existing.key === photo.key) ? current : [...current, photo]));
  };
  const handleMovePhoto = (photoIndex: number, direction: -1 | 1) => {
    markDirty();
    setCarrete((current) => {
      const targetIndex = photoIndex + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const reordered = [...current];
      [reordered[photoIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[photoIndex]];
      return reordered;
    });
  };
  const handleRemovePhoto = (photoIndex: number) => { markDirty(); setCarrete((current) => current.filter((_, index) => index !== photoIndex)); };
  const handleReshuffle = () => { if (projectId) { markDirty(); loadRandomPhotos(projectId); } };

  // ── Exportación ──
  const handleExport = async (format: 'pdf' | 'svg' | 'png') => {
    if (!svgRef.current || !composition) return;
    setIsExporting(format);
    try {
      const baseName = `${currentProject?.slug ?? 'proyecto'}_rollup_${widthCm}x${heightCm}cm`;
      if (format === 'pdf') await exportPdf(svgRef.current, widthCm, heightCm, `${baseName}.pdf`);
      if (format === 'svg') exportSvg(svgRef.current, widthCm, heightCm, `${baseName}.svg`);
      if (format === 'png') await exportPng(svgRef.current, widthCm, heightCm, `${baseName}.png`);
      setDownloadedFormats((current) => (current.includes(format) ? current : [...current, format]));
    } catch (error: any) {
      window.alert(`No se pudo exportar: ${error.message}`);
    } finally {
      setIsExporting('');
    }
  };

  const isPortrait = heightCm >= widthCm;
  const droppedNames = composition?.dropped.map((blockId) => BLOCK_NAMES[blockId] ?? blockId) ?? [];

  const saveWarning = (
    <div className="rounded-lg border-2 border-red-600 bg-red-50 p-4 text-red-900" role="alert">
      <p className="text-lg font-extrabold uppercase tracking-wide">⚠ Descargue su roll up</p>
      <p className="mt-1 text-sm">
        Este roll up <strong>NO se guarda</strong> en el sistema. Si cierra o recarga esta página, o cambia de proyecto, <strong>se pierde todo</strong>.
        Descargue el PDF (para imprenta) y, si quiere seguir editándolo en otro programa, también el SVG.
      </p>
    </div>
  );

  return (
    <>
      <Header />
      <main className="mx-auto mt-16 max-w-7xl px-4 py-8">
        <Link href="/portal/dashboard" className="text-xs font-semibold text-blue-600 hover:underline">&larr; Volver al Portal</Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-800">Generador de roll up y pósters</h1>
        <p className="mb-4 text-sm text-gray-600">Arma un cartel imprimible de la carrera o de cualquiera de sus proyectos, en PDF vectorial a tamaño real. Todo ocurre en tu navegador. <Link href="/portal/tutoriales?v=rollup" className="font-semibold text-blue-600 hover:underline">▶ Ver el video tutorial</Link></p>
        {saveWarning}
        {loadError && <p className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}

        {/* Paso 1: elegir para qué es el roll up (es la decisión que cambia todo lo demás) */}
        <section className="mt-6 rounded-xl border-2 border-blue-600 bg-blue-50 p-4">
          <h2 className="text-base font-extrabold text-blue-900"><span className="mr-2 rounded-full bg-blue-600 px-2 py-0.5 text-sm text-white">1</span>¿Qué roll up quieres crear?</h2>
          <p className="mb-3 mt-1 text-xs text-blue-900/80">Elige primero: el título, las fotos, las cifras y los colores se cargan según tu elección. Cambiar de opción reemplaza lo que ya armaste.</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {projects.map((project) => {
              const isSelected = project.id === projectId;
              const isCareerOption = project.id === CAREER_PROJECT_ID;
              const swatch = themeById(TEMA_POR_PROYECTO[project.id] ?? 'uleam');
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => selectProject(project, projects, true)}
                  className={`relative overflow-hidden rounded-lg border-2 bg-white p-3 text-left transition ${isSelected ? 'border-blue-600 ring-2 ring-blue-300 shadow-md' : 'border-gray-200 hover:border-blue-400'}`}
                >
                  <span className="absolute inset-y-0 left-0 w-2" style={{ background: swatch.primary }} />
                  <span className="ml-2 block text-[10px] font-extrabold uppercase tracking-wider" style={{ color: swatch.accent }}>
                    {isCareerOption ? 'General · por defecto' : 'Proyecto'}
                  </span>
                  <span className="ml-2 mt-0.5 block text-sm font-bold leading-snug text-gray-800">{isCareerOption ? 'La Carrera' : project.nombre_oficial}</span>
                  {isCareerOption && <span className="ml-2 block text-xs text-gray-500">Misión, visión, datos y fotos generales</span>}
                  {isSelected && <span className="absolute right-2 top-2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">✓ Elegido</span>}
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* ── Panel de opciones ── */}
          <section className="space-y-4">
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <label className="block text-xs font-bold uppercase text-gray-500">Medida</label>
              <select value={sizeId} onChange={(event) => { setSizeId(event.target.value); markDirty(); }} className="mt-1 w-full rounded border px-2 py-2 text-sm">
                {['Roll up', 'Póster vertical', 'Apaisado', 'Personalizada'].map((group) => (
                  <optgroup key={group} label={group}>
                    {POSTER_SIZES.filter((size) => size.group === group).map((size) => <option key={size.id} value={size.id}>{size.label}</option>)}
                  </optgroup>
                ))}
              </select>
              {sizeId === 'custom' && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <input type="number" min={20} max={300} value={customWidthCm} onChange={(event) => setCustomWidthCm(Number(event.target.value))} className="w-20 rounded border px-2 py-1" />
                  <span>×</span>
                  <input type="number" min={20} max={400} value={customHeightCm} onChange={(event) => setCustomHeightCm(Number(event.target.value))} className="w-20 rounded border px-2 py-1" />
                  <span className="text-gray-500">cm (ancho × alto)</span>
                </div>
              )}

              <label className="mt-3 block text-xs font-bold uppercase text-gray-500">Tipografía</label>
              <div className="mt-1 space-y-2">
                {FONT_PAIRS.map((pair) => (
                  <label key={pair.id} className={`block cursor-pointer rounded border p-2 text-sm ${fontPairId === pair.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'}`}>
                    <input type="radio" name="font-pair" checked={fontPairId === pair.id} onChange={() => { setFontPairId(pair.id); markDirty(); }} className="mr-2" />
                    <strong>{pair.nombre}</strong>
                    <span className="block pl-5 text-xs text-gray-500">{pair.descripcion}</span>
                  </label>
                ))}
              </div>

              <label className="mt-3 block text-xs font-bold uppercase text-gray-500">Colores</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {POSTER_THEMES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    title={option.nombre}
                    onClick={() => { setThemeId(option.id); markDirty(); }}
                    className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${themeId === option.id ? 'border-gray-900 ring-2 ring-gray-300' : ''}`}
                  >
                    <span className="inline-block h-4 w-4 rounded-full" style={{ background: option.primary }} />
                    <span className="inline-block h-4 w-4 rounded-full" style={{ background: option.accent }} />
                    {option.nombre}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase text-gray-500">Más texto o más imágenes</p>
              <div className="mt-1 space-y-2">
                {DENSITY_OPTIONS.map((option) => (
                  <label key={option.id} className={`block cursor-pointer rounded border p-2 text-sm ${density === option.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'}`}>
                    <input type="radio" name="density" checked={density === option.id} onChange={() => { setDensity(option.id); markDirty(); }} className="mr-2" />
                    <strong>{option.nombre}</strong>
                    <span className="block pl-5 text-xs text-gray-500">{option.descripcion}</span>
                  </label>
                ))}
              </div>
            </div>

            {currentProject && (currentProject.cifras_disponibles.length > 0 || currentProject.objetivos.length > 0 || currentProject.detalles.length > 0) && (
              <details className="rounded-lg border bg-white p-4 shadow-sm" open>
                <summary className="cursor-pointer text-sm font-bold text-gray-800">Datos del proyecto (opcionales)</summary>
                <p className="mt-2 text-xs text-gray-500">Datos que el sistema ya tiene de este proyecto. Marca los que quieras incluir en el cartel.</p>

                {currentProject.cifras_disponibles.length > 0 && (
                  <fieldset className="mt-3">
                    <legend className="text-xs font-bold uppercase text-gray-500">Cifras (máx. {MAX_STATS} en el cartel)</legend>
                    {currentProject.cifras_disponibles.map((figure) => (
                      <label key={figure.key} className="mt-1 flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-sm hover:bg-gray-50">
                        <input type="checkbox" checked={selectedData.cifraKeys.includes(figure.key)} onChange={() => toggleSelected('cifraKeys', figure.key)} />
                        <span className="w-16 shrink-0 text-right font-bold text-gray-800">{figure.n}</span>
                        <span className="text-gray-600">{figure.l}</span>
                      </label>
                    ))}
                  </fieldset>
                )}

                {currentProject.objetivos.length > 0 && (
                  <fieldset className="mt-3">
                    <legend className="text-xs font-bold uppercase text-gray-500">Objetivos</legend>
                    {currentProject.objetivos.map((objective) => (
                      <label key={objective.id} className="mt-1 flex cursor-pointer items-start gap-2 rounded border px-2 py-1 text-sm hover:bg-gray-50">
                        <input type="checkbox" className="mt-1" checked={selectedData.objectiveIds.includes(objective.id)} onChange={() => toggleSelected('objectiveIds', objective.id)} />
                        <span>
                          <span className="mr-1 rounded bg-gray-200 px-1 text-[10px] font-bold uppercase text-gray-700">{objective.tipo === 'general' ? 'General' : 'Específico'}</span>
                          <span className="text-gray-600">{objective.texto.length > 150 ? `${objective.texto.slice(0, 150)}…` : objective.texto}</span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                )}

                {currentProject.detalles.length > 0 && (
                  <fieldset className="mt-3">
                    <legend className="text-xs font-bold uppercase text-gray-500">Ficha del proyecto</legend>
                    {currentProject.detalles.map((detail) => (
                      <label key={detail.key} className="mt-1 flex cursor-pointer items-start gap-2 rounded border px-2 py-1 text-sm hover:bg-gray-50">
                        <input type="checkbox" className="mt-1" checked={selectedData.detailKeys.includes(detail.key)} onChange={() => toggleSelected('detailKeys', detail.key)} />
                        <span><strong className="text-gray-700">{detail.label}:</strong> <span className="text-gray-600">{detail.value}</span></span>
                      </label>
                    ))}
                  </fieldset>
                )}
              </details>
            )}

            {fields && (
              <details className="rounded-lg border bg-white p-4 shadow-sm" open>
                <summary className="cursor-pointer text-sm font-bold text-gray-800">Textos del cartel</summary>
                <div className="mt-3 space-y-3 text-sm">
                  <TextField label="Entidad (sobre el título)" value={fields.kicker} onChange={(value) => updateField('kicker', value)} />
                  <TextField label="Título" value={fields.title} onChange={(value) => updateField('title', value)} multiline />
                  <TextField label="Subtítulo / eslogan" value={fields.subtitle} onChange={(value) => updateField('subtitle', value)} />
                  <TextField label="Descripción" value={fields.description} onChange={(value) => updateField('description', value)} multiline rows={5} />
                  <TextField label="Título de la lista" value={fields.itemsTitle} onChange={(value) => updateField('itemsTitle', value)} />
                  <TextField label="Lista numerada (una por línea)" value={fields.itemsText} onChange={(value) => updateField('itemsText', value)} multiline rows={4} />
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase text-gray-500">Tus propias cifras</p>
                    <p className="mb-1 text-xs text-gray-500">Aparecen en el cartel apenas las escribes (sin casilla), después de las marcadas arriba.</p>
                    {fields.stats.map((stat, statIndex) => (
                      <div key={statIndex} className="mb-1 flex gap-1">
                        <input value={stat.n} onChange={(event) => updateStat(statIndex, 'n', event.target.value)} placeholder="160+" className="w-20 rounded border px-2 py-1" />
                        <input value={stat.l} onChange={(event) => updateStat(statIndex, 'l', event.target.value)} placeholder="Beneficiarios" className="flex-1 rounded border px-2 py-1" />
                      </div>
                    ))}
                  </div>
                  <TextField label="Título del equipo" value={fields.teamTitle} onChange={(value) => updateField('teamTitle', value)} />
                  <TextField label="Responsable / líder" value={fields.leader} onChange={(value) => updateField('leader', value)} />
                  <TextField label="Miembros (uno por línea)" value={fields.teamText} onChange={(value) => updateField('teamText', value)} multiline rows={4} />
                  <TextField label="Texto junto al QR" value={fields.scanLabel} onChange={(value) => updateField('scanLabel', value)} />
                  <TextField label="Enlace del QR (vacío = sin QR)" value={fields.url} onChange={(value) => updateField('url', value)} />
                  <TextField label="Contacto" value={fields.contact} onChange={(value) => updateField('contact', value)} multiline rows={3} />
                </div>
              </details>
            )}
          </section>

          {/* ── Vista previa + carrete + descargas ── */}
          <section className="min-w-0 space-y-4">
            <div className="rounded-lg border bg-gray-100 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                <span>{widthCm} × {heightCm} cm · vista previa</span>
                <span>{isComposing || !fonts ? 'Componiendo…' : 'Listo'}</span>
              </div>
              <div
                ref={previewContainerRef}
                className="mx-auto bg-white shadow-lg"
                style={{ aspectRatio: `${widthCm} / ${heightCm}`, ...(isPortrait ? { height: 'min(78vh, 900px)', maxWidth: '100%' } : { width: '100%' }) }}
              />
              {composition?.overflow && (
                <p className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  El contenido no cabe en esta medida. Acorta los textos, quita fotos o elige un formato más grande.
                </p>
              )}
              {droppedNames.length > 0 && !composition?.overflow && (
                <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  Por falta de espacio se omitieron: <strong>{droppedNames.join(', ')}</strong>. Elige una medida más grande o acorta los textos para incluirlos.
                </p>
              )}
              {failedKeys.length > 0 && (
                <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  {failedKeys.length} foto(s) no se pudieron cargar y no aparecen en el cartel. Quítalas del carrete o cámbialas.
                </p>
              )}
            </div>

            {/* Carrete de fotos */}
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-gray-800">Carrete de fotos <span className="font-normal text-gray-500">({carrete.length}/{MAX_CARRETE_PHOTOS} · la primera es la portada)</span></h2>
                <div className="flex gap-2">
                  <button type="button" onClick={handleReshuffle} className="rounded border px-3 py-1 text-xs font-semibold hover:bg-gray-50">🎲 Otras fotos al azar</button>
                  <button
                    type="button"
                    disabled={carrete.length >= MAX_CARRETE_PHOTOS}
                    onClick={() => setPickerMode({ mode: 'add' })}
                    className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                  >
                    + Agregar fotos
                  </button>
                </div>
              </div>
              {isLoadingPhotos && <p className="text-sm text-gray-500">Buscando fotos del proyecto…</p>}
              {!isLoadingPhotos && carrete.length === 0 && (
                <p className="rounded border border-dashed p-4 text-sm text-gray-500">
                  Aquí aún no hay fotos publicadas, así que el carrete está vacío. Usa <strong>+ Agregar fotos</strong> para elegir de otros proyectos, de toda la web o importar las tuyas.
                </p>
              )}
              <div className="flex gap-3 overflow-x-auto pb-2">
                {carrete.map((photo, photoIndex) => (
                  <div key={photo.key} className="w-36 shrink-0">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.thumb} alt={photo.titulo} className="h-full w-full object-cover" />
                      {photoIndex === 0 && <span className="absolute left-1 top-1 rounded bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-gray-900">Portada</span>}
                      {photo.origen === 'importada' && <span className="absolute right-1 top-1 rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-bold text-white">Mía</span>}
                      {failedKeys.includes(photo.key) && <span className="absolute inset-0 flex items-center justify-center bg-red-600/70 text-xs font-bold text-white">Error</span>}
                    </div>
                    <div className="mt-1 flex justify-between text-xs">
                      <button type="button" onClick={() => handleMovePhoto(photoIndex, -1)} disabled={photoIndex === 0} className="px-1 disabled:opacity-30" title="Mover a la izquierda">←</button>
                      <button type="button" onClick={() => setPickerMode({ mode: 'replace', replaceIndex: photoIndex })} className="font-semibold text-blue-600 hover:underline">Cambiar</button>
                      <button type="button" onClick={() => handleRemovePhoto(photoIndex)} className="font-semibold text-red-600 hover:underline">Quitar</button>
                      <button type="button" onClick={() => handleMovePhoto(photoIndex, 1)} disabled={photoIndex === carrete.length - 1} className="px-1 disabled:opacity-30" title="Mover a la derecha">→</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Descargas */}
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              {saveWarning}
              <div className="mt-3 flex flex-wrap gap-3">
                {([
                  { format: 'pdf', label: 'Descargar PDF (imprenta)', primary: true },
                  { format: 'svg', label: 'Descargar SVG (editable)', primary: false },
                  { format: 'png', label: 'Descargar PNG (redes)', primary: false },
                ] as const).map((option) => (
                  <button
                    key={option.format}
                    type="button"
                    disabled={!composition || Boolean(isExporting)}
                    onClick={() => handleExport(option.format)}
                    className={`rounded px-4 py-2 text-sm font-bold disabled:opacity-40 ${option.primary ? 'bg-red-600 text-white hover:bg-red-700' : 'border border-gray-400 text-gray-800 hover:bg-gray-50'}`}
                  >
                    {isExporting === option.format ? 'Generando…' : option.label}
                    {downloadedFormats.includes(option.format) && ' ✓'}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                El PDF y el SVG son vectoriales (el texto va en trazados, no necesita fuentes). El PNG es de máximo 3600 px por lado: sirve para pantalla y redes, no para imprenta.
                Las fotos se reducen a 2000 px; para un roll up grande conviene usar fotos de buena resolución.
              </p>
            </div>
          </section>
        </div>
      </main>

      {pickerMode && (
        <PhotoPicker
          mode={pickerMode.mode}
          currentProjectId={projectId}
          projects={projects}
          alreadyUsedKeys={carrete.map((photo) => photo.key)}
          onPick={handlePickPhoto}
          onClose={() => setPickerMode(null)}
        />
      )}
    </>
  );
}

function TextField({ label, value, onChange, multiline = false, rows = 2 }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; rows?: number }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-gray-500">{label}</span>
      {multiline ? (
        <textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded border px-2 py-1" />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded border px-2 py-1" />
      )}
    </label>
  );
}
