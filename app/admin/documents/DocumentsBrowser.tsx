'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  documentCategories,
  projectDocuments,
  type DocumentCategory,
  type DocumentCategoryId,
  type ProjectDocument,
} from './documentsData';

type ViewMode = 'category' | 'chronological';
type SortDirection = 'newest' | 'oldest';
type CategoryFilter = 'all' | DocumentCategoryId;

const VIEW_MODE_STORAGE_KEY = 'admin-documents-view-mode';

// "YYYY-MM-DD" → fecha local. new Date('2026-10-22') se interpreta en UTC y en Ecuador
// mostraría el día anterior.
function parseLocalDate(dateText: string): Date {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatFullDate(dateText: string): string {
  return parseLocalDate(dateText).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatMonthHeading(monthKey: string): string {
  const monthLabel = parseLocalDate(`${monthKey}-01`).toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });
  return monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
}

function normalizeSearchText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function sortByDate(documentList: ProjectDocument[], sortDirection: SortDirection): ProjectDocument[] {
  const direction = sortDirection === 'newest' ? -1 : 1;
  return [...documentList].sort((firstDocument, secondDocument) => {
    return direction * firstDocument.date.localeCompare(secondDocument.date);
  });
}

function DocumentCard({
  projectDocument,
  categoryLabel,
}: {
  projectDocument: ProjectDocument;
  categoryLabel?: string;
}) {
  const isExternalUrl = projectDocument.filename.startsWith('http://') || projectDocument.filename.startsWith('https://');
  const fileUrl = isExternalUrl ? projectDocument.filename : `/admin-assets/${projectDocument.filename}`;
  const isPdf = projectDocument.filename.toLowerCase().endsWith('.pdf');
  const openButtonLabel = isExternalUrl ? 'Acceder' : isPdf ? 'Ver PDF' : 'Abrir';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
      <div className="flex items-start gap-3">
        <div className="text-3xl leading-none">{projectDocument.icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-gray-900 leading-snug">{projectDocument.title}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span>📅 {formatFullDate(projectDocument.date)}</span>
            <span className="px-2 py-0.5 font-semibold bg-uleam-blue/10 text-uleam-blue rounded">{projectDocument.period}</span>
            {categoryLabel && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{categoryLabel}</span>}
          </div>
          <p className="mt-2 text-sm text-gray-600 line-clamp-2" title={projectDocument.description}>
            {projectDocument.description}
          </p>
          <div className="mt-3 flex gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 bg-uleam-blue text-white rounded-lg hover:bg-blue-800 transition text-sm"
            >
              {openButtonLabel}
            </a>
            {!isExternalUrl && (
              <a
                href={fileUrl}
                download
                className="inline-flex items-center px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
              >
                Descargar
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocumentsBrowser() {
  const [viewMode, setViewMode] = useState<ViewMode>('category');
  const [sortDirection, setSortDirection] = useState<SortDirection>('newest');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    try {
      const storedViewMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (storedViewMode === 'category' || storedViewMode === 'chronological') setViewMode(storedViewMode);
    } catch {
      // localStorage puede no estar disponible; la vista por defecto funciona igual.
    }
  }, []);

  const handleViewModeChange = (nextViewMode: ViewMode) => {
    setViewMode(nextViewMode);
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, nextViewMode);
    } catch {
      // ignorar
    }
  };

  const categoryById = useMemo(() => {
    const lookup = new Map<DocumentCategoryId, DocumentCategory>();
    documentCategories.forEach((category) => lookup.set(category.id, category));
    return lookup;
  }, []);

  const documentCountByCategory = useMemo(() => {
    const counts = new Map<DocumentCategoryId, number>();
    projectDocuments.forEach((projectDocument) => {
      counts.set(projectDocument.category, (counts.get(projectDocument.category) ?? 0) + 1);
    });
    return counts;
  }, []);

  const visibleDocuments = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchText.trim());
    const matchingDocuments = projectDocuments.filter((projectDocument) => {
      if (categoryFilter !== 'all' && projectDocument.category !== categoryFilter) return false;
      if (!normalizedQuery) return true;
      const searchableText = normalizeSearchText(`${projectDocument.title} ${projectDocument.description} ${projectDocument.filename}`);
      return searchableText.includes(normalizedQuery);
    });
    return sortByDate(matchingDocuments, sortDirection);
  }, [searchText, categoryFilter, sortDirection]);

  const documentsByMonth = useMemo(() => {
    const groups: { monthKey: string; documents: ProjectDocument[] }[] = [];
    visibleDocuments.forEach((projectDocument) => {
      const monthKey = projectDocument.date.slice(0, 7);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.monthKey === monthKey) lastGroup.documents.push(projectDocument);
      else groups.push({ monthKey, documents: [projectDocument] });
    });
    return groups;
  }, [visibleDocuments]);

  const viewButtonClass = (isActive: boolean) =>
    `px-4 py-2 text-sm font-medium transition ${isActive ? 'bg-uleam-blue text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`;

  const filterChipClass = (isActive: boolean) =>
    `px-3 py-1.5 text-sm rounded-full border transition ${
      isActive ? 'bg-uleam-blue text-white border-uleam-blue' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
    }`;

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden" role="group" aria-label="Modo de vista">
            <button type="button" className={viewButtonClass(viewMode === 'category')} onClick={() => handleViewModeChange('category')}>
              🗂️ Por categoría
            </button>
            <button
              type="button"
              className={`${viewButtonClass(viewMode === 'chronological')} border-l border-gray-300`}
              onClick={() => handleViewModeChange('chronological')}
            >
              🕒 Cronológico
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSortDirection(sortDirection === 'newest' ? 'oldest' : 'newest')}
            className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
          >
            {sortDirection === 'newest' ? '↓ Más recientes primero' : '↑ Más antiguos primero'}
          </button>

          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar por título, descripción o archivo…"
            className="flex-1 min-w-[220px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-uleam-blue/40"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className={filterChipClass(categoryFilter === 'all')} onClick={() => setCategoryFilter('all')}>
            Todos ({projectDocuments.length})
          </button>
          {documentCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={filterChipClass(categoryFilter === category.id)}
              onClick={() => setCategoryFilter(categoryFilter === category.id ? 'all' : category.id)}
            >
              {category.icon} {category.label} ({documentCountByCategory.get(category.id) ?? 0})
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500">
          {visibleDocuments.length === projectDocuments.length
            ? `${visibleDocuments.length} documentos`
            : `${visibleDocuments.length} de ${projectDocuments.length} documentos`}
        </p>
      </div>

      {visibleDocuments.length === 0 && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
          Ningún documento coincide con la búsqueda o el filtro.
        </div>
      )}

      {/* Vista por categoría */}
      {viewMode === 'category' &&
        documentCategories.map((category) => {
          const categoryDocuments = visibleDocuments.filter((projectDocument) => projectDocument.category === category.id);
          if (categoryDocuments.length === 0) return null;
          return (
            <section key={category.id}>
              <div className="mb-3">
                <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                  <span>{category.icon}</span> {category.label}
                  <span className="text-sm font-normal text-gray-400">({categoryDocuments.length})</span>
                </h2>
                <p className="text-sm text-gray-500">{category.description}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {categoryDocuments.map((projectDocument) => (
                  <DocumentCard key={projectDocument.id} projectDocument={projectDocument} />
                ))}
              </div>
            </section>
          );
        })}

      {/* Vista cronológica */}
      {viewMode === 'chronological' &&
        documentsByMonth.map((monthGroup) => (
          <section key={monthGroup.monthKey}>
            <h2 className="text-lg font-bold text-gray-700 mb-3 pl-4 border-l-4 border-uleam-blue">
              {formatMonthHeading(monthGroup.monthKey)}
              <span className="ml-2 text-sm font-normal text-gray-400">({monthGroup.documents.length})</span>
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {monthGroup.documents.map((projectDocument) => (
                <DocumentCard
                  key={projectDocument.id}
                  projectDocument={projectDocument}
                  categoryLabel={`${categoryById.get(projectDocument.category)?.icon ?? ''} ${categoryById.get(projectDocument.category)?.label ?? ''}`}
                />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
