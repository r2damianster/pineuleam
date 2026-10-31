'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface CarretePhoto {
  key: string;
  thumb: string;
  /** URL remota (Cloudinary) o blob: de una foto importada del equipo. */
  url: string;
  titulo: string;
  origen: 'proyecto' | 'banco' | 'importada';
}

export interface ProyectoOpcion {
  id: string;
  nombre_oficial: string;
}

interface PhotoPickerProps {
  mode: 'add' | 'replace';
  currentProjectId: string;
  projects: ProyectoOpcion[];
  alreadyUsedKeys: string[];
  onPick: (photo: CarretePhoto) => void;
  onClose: () => void;
}

type PickerTab = 'proyecto' | 'otros' | 'banco' | 'importar';

const TAB_LABELS: Record<PickerTab, string> = {
  proyecto: 'Fotos de mi proyecto',
  otros: 'Otros proyectos',
  banco: 'Toda la web',
  importar: 'Importar desde mi equipo',
};

const PAGE_SIZE = 24;

export default function PhotoPicker({ mode, currentProjectId, projects, alreadyUsedKeys, onPick, onClose }: PhotoPickerProps) {
  const [activeTab, setActiveTab] = useState<PickerTab>('proyecto');
  const [otherProjectId, setOtherProjectId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [photos, setPhotos] = useState<CarretePhoto[]>([]);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pickedCount, setPickedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const otherProjects = projects.filter((project) => project.id !== currentProjectId);

  const loadPhotos = useCallback(async () => {
    if (activeTab === 'importar') return;
    const projectFilter = activeTab === 'proyecto' ? currentProjectId : activeTab === 'otros' ? otherProjectId : '';
    if (activeTab === 'otros' && !projectFilter) { setPhotos([]); setTotalPhotos(0); return; }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (projectFilter) params.set('proyecto', projectFilter);
      if (searchText.trim()) params.set('q', searchText.trim());
      const response = await fetch(`/api/rollup/fotos?${params.toString()}`);
      if (!response.ok) throw new Error('No se pudieron cargar las fotos');
      const data = await response.json();
      setPhotos((data.items ?? []).map((item: any): CarretePhoto => ({
        key: `foto-${item.id}`, thumb: item.thumb, url: item.url, titulo: item.titulo, origen: activeTab === 'banco' ? 'banco' : 'proyecto',
      })));
      setTotalPhotos(data.total ?? 0);
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentProjectId, otherProjectId, page, searchText]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  const handleChangeTab = (tab: PickerTab) => { setActiveTab(tab); setPage(1); setSearchText(''); setPhotos([]); setTotalPhotos(0); };

  const handlePick = (photo: CarretePhoto) => {
    onPick(photo);
    if (mode === 'replace') onClose(); else setPickedCount((count) => count + 1);
  };

  const handleImportFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).filter((file) => file.type.startsWith('image/')).forEach((file, fileIndex) => {
      const blobUrl = URL.createObjectURL(file);
      handlePick({ key: `importada-${Date.now()}-${fileIndex}`, thumb: blobUrl, url: blobUrl, titulo: file.name, origen: 'importada' });
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalPages = Math.max(1, Math.ceil(totalPhotos / PAGE_SIZE));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-lg font-bold text-gray-800">{mode === 'replace' ? 'Cambiar foto' : 'Agregar fotos al carrete'}</h2>
          <button type="button" onClick={onClose} className="rounded bg-gray-800 px-3 py-1 text-sm font-semibold text-white hover:bg-gray-700">
            {mode === 'add' && pickedCount > 0 ? `Listo (${pickedCount} agregadas)` : 'Cerrar'}
          </button>
        </div>

        <div className="flex flex-wrap gap-1 border-b bg-gray-50 px-3 pt-2">
          {(Object.keys(TAB_LABELS) as PickerTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleChangeTab(tab)}
              className={`rounded-t-md px-3 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-white text-blue-700 shadow-[0_-2px_0_0_#1d4ed8_inset]' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'importar' ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <p className="mb-1 text-sm font-semibold text-gray-700">Elige fotos de tu computador o teléfono</p>
              <p className="mb-4 text-xs text-gray-500">Se usan solo en este roll up. No se suben al sistema ni quedan guardadas en el banco de fotos.</p>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(event) => handleImportFiles(event.target.files)} className="mx-auto block text-sm" />
              <p className="mt-4 text-xs text-amber-700">Usa solo fotos sobre las que tengas permiso de publicación. Evita fotos con menores de edad sin autorización.</p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {activeTab === 'otros' && (
                  <select value={otherProjectId} onChange={(event) => { setOtherProjectId(event.target.value); setPage(1); }} className="rounded border px-2 py-1 text-sm">
                    <option value="">Elige un proyecto…</option>
                    {otherProjects.map((project) => <option key={project.id} value={project.id}>{project.nombre_oficial}</option>)}
                  </select>
                )}
                <input
                  value={searchText}
                  onChange={(event) => { setSearchText(event.target.value); setPage(1); }}
                  placeholder="Buscar por título o descripción…"
                  className="min-w-[200px] flex-1 rounded border px-2 py-1 text-sm"
                />
                <span className="text-xs text-gray-500">{totalPhotos} foto{totalPhotos === 1 ? '' : 's'}</span>
              </div>
              {errorMessage && <p className="mb-2 text-sm text-red-600">{errorMessage}</p>}
              {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
              {!isLoading && photos.length === 0 && !errorMessage && (
                <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  {activeTab === 'proyecto'
                    ? 'Este proyecto aún no tiene fotos publicadas. Usa “Otros proyectos” o “Toda la web” para elegir de las demás, o importa las tuyas.'
                    : activeTab === 'otros' && !otherProjectId ? 'Elige un proyecto para ver sus fotos.' : 'No hay fotos que coincidan.'}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {photos.map((photo) => {
                  const isUsed = alreadyUsedKeys.includes(photo.key);
                  return (
                    <button
                      key={photo.key}
                      type="button"
                      onClick={() => handlePick(photo)}
                      className={`group relative aspect-[4/3] overflow-hidden rounded-lg border bg-gray-100 ${isUsed ? 'border-blue-500 ring-2 ring-blue-300' : 'hover:border-blue-400'}`}
                      title={photo.titulo}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.thumb} alt={photo.titulo} loading="lazy" className="h-full w-full object-cover" />
                      {isUsed && <span className="absolute left-1 top-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">En el carrete</span>}
                    </button>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                  <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-1 disabled:opacity-40">← Anterior</button>
                  <span>Página {page} de {totalPages}</span>
                  <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Siguiente →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
