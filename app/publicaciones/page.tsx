'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLanguage } from '@/lib/i18n';
import type { ItemProduccion } from '@/lib/produccion';

type TabKey = 'all' | 'articulo' | 'libro' | 'ponencia' | 'propiedad';
type ArticleCategoryFilter = 'all' | 'regional' | 'impacto';

const ALL_PERIODS = 'all';
const ALL_PROJECTS = 'all';
const NO_PROJECT = '__none';
const TAB_KEYS: TabKey[] = ['all', 'articulo', 'libro', 'ponencia', 'propiedad'];
const DASHBOARD_TABS: Exclude<TabKey, 'all'>[] = ['articulo', 'libro', 'ponencia', 'propiedad'];

// Libros y capítulos comparten pestaña.
const tabOfItem = (item: ItemProduccion): Exclude<TabKey, 'all'> =>
  item.tipo === 'capitulo' ? 'libro' : item.tipo;

export default function PublicacionesPage() {
  const [items, setItems] = useState<ItemProduccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(ALL_PERIODS);
  const [selectedProject, setSelectedProject] = useState(ALL_PROJECTS);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [articleCategory, setArticleCategory] = useState<ArticleCategoryFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { t, lang } = useLanguage();

  useEffect(() => {
    fetch('/api/produccion')
      .then((response) => (response.ok ? response.json() : []))
      .then((data: ItemProduccion[]) => setItems(data))
      .finally(() => setLoading(false));
  }, []);

  const periodOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.periodo))).sort().reverse(),
    [items],
  );

  const projectOptions = useMemo(() => {
    const projectsById = new Map<string, string>();
    items.forEach((item) => {
      if (item.proyectoId) projectsById.set(item.proyectoId, item.proyectoNombre ?? item.proyectoId);
    });
    return Array.from(projectsById, ([projectId, projectName]) => ({ projectId, projectName }));
  }, [items]);

  const hasItemsWithoutProject = items.some((item) => !item.proyectoId);

  // Filtros del tablero: periodo y proyecto. Las pestañas y la búsqueda se aplican encima.
  const filteredByDashboard = useMemo(
    () =>
      items.filter((item) => {
        if (selectedPeriod !== ALL_PERIODS && item.periodo !== selectedPeriod) return false;
        if (selectedProject === NO_PROJECT) return !item.proyectoId;
        if (selectedProject !== ALL_PROJECTS && item.proyectoId !== selectedProject) return false;
        return true;
      }),
    [items, selectedPeriod, selectedProject],
  );

  const countByTab = useMemo(() => {
    const counts: Record<Exclude<TabKey, 'all'>, number> = { articulo: 0, libro: 0, ponencia: 0, propiedad: 0 };
    filteredByDashboard.forEach((item) => {
      counts[tabOfItem(item)] += 1;
    });
    return counts;
  }, [filteredByDashboard]);

  const visibleItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return filteredByDashboard.filter((item) => {
      if (activeTab !== 'all' && tabOfItem(item) !== activeTab) return false;
      if (activeTab === 'articulo' && articleCategory !== 'all' && item.categoria !== articleCategory) return false;
      if (!normalizedSearch) return true;
      return item.titulo.toLowerCase().includes(normalizedSearch) || item.autores.toLowerCase().includes(normalizedSearch);
    });
  }, [filteredByDashboard, activeTab, articleCategory, searchTerm]);

  const categoryColor = (category: string | null) =>
    category === 'impacto' ? 'bg-red-100 text-red-700' : category === 'regional' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';

  const itemTypeLabel = (item: ItemProduccion) => t.publications.itemTypes[item.tipo];

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(lang === 'es' ? 'es-EC' : 'en-US', { year: 'numeric', month: 'short', timeZone: 'UTC' });

  const selectClassName =
    'w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-uleam-blue text-sm';

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen py-10 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 md:mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">{t.publications.sectionTitle}</h1>
            <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">{t.publications.sectionSubtitle}</p>
          </div>

          {/* Tablero: filtros por periodo y proyecto + totales por tipo */}
          <section className="bg-white rounded-xl shadow-md p-5 md:p-6 mb-8 max-w-5xl mx-auto">
            <h2 className="text-lg font-bold text-uleam-blue mb-4">{t.publications.dashboardTitle}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <label className="block text-xs font-semibold text-gray-600">
                {t.publications.periodLabel}
                <select
                  value={selectedPeriod}
                  onChange={(event) => setSelectedPeriod(event.target.value)}
                  className={`${selectClassName} mt-1 font-normal`}
                >
                  <option value={ALL_PERIODS}>{t.publications.allPeriods}</option>
                  {periodOptions.map((period) => (
                    <option key={period} value={period}>
                      {period}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-gray-600">
                {t.publications.projectLabel}
                <select
                  value={selectedProject}
                  onChange={(event) => setSelectedProject(event.target.value)}
                  className={`${selectClassName} mt-1 font-normal`}
                >
                  <option value={ALL_PROJECTS}>{t.publications.allProjects}</option>
                  {projectOptions.map(({ projectId, projectName }) => (
                    <option key={projectId} value={projectId}>
                      {projectName}
                    </option>
                  ))}
                  {hasItemsWithoutProject && <option value={NO_PROJECT}>{t.publications.noProject}</option>}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`rounded-lg p-3 text-center transition border ${
                  activeTab === 'all' ? 'border-uleam-blue bg-uleam-blue text-white' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="text-2xl font-bold">{filteredByDashboard.length}</div>
                <div className="text-xs">{t.publications.totalLabel}</div>
              </button>
              {DASHBOARD_TABS.map((tabKey) => (
                <button
                  type="button"
                  key={tabKey}
                  onClick={() => setActiveTab(tabKey)}
                  className={`rounded-lg p-3 text-center transition border ${
                    activeTab === tabKey ? 'border-uleam-blue bg-uleam-blue text-white' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-2xl font-bold">{countByTab[tabKey]}</div>
                  <div className="text-xs">{t.publications.tabs[tabKey]}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Pestañas */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {TAB_KEYS.map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={`px-5 py-2 rounded-full font-medium transition-all ${
                  activeTab === tabKey ? 'bg-uleam-blue text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t.publications.tabs[tabKey]}
              </button>
            ))}
          </div>

          {activeTab === 'articulo' && (
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {(['all', 'regional', 'impacto'] as ArticleCategoryFilter[]).map((categoryKey) => (
                <button
                  key={categoryKey}
                  onClick={() => setArticleCategory(categoryKey)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    articleCategory === categoryKey ? 'bg-uleam-gold text-uleam-blue' : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t.publications.filters[categoryKey]}
                </button>
              ))}
            </div>
          )}

          <div className="max-w-xl mx-auto mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t.publications.searchPlaceholder}
              className="w-full px-5 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-uleam-blue"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-2xl font-bold text-uleam-blue">{t.publications.loading}</div>
          ) : visibleItems.length > 0 ? (
            <>
              <p className="text-center text-sm text-gray-500 mb-6">
                {t.publications.resultsShown.replace('{count}', String(visibleItems.length))}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all border-l-4 border-uleam-gold flex flex-col"
                  >
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${categoryColor(item.categoria ?? 'libros')}`}>
                        {itemTypeLabel(item)}
                      </span>
                      {item.categoria && (
                        <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                          {t.publications.filters[item.categoria]}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-uleam-blue mb-2">{item.titulo}</h3>
                    <p className="text-gray-700 font-medium text-sm mb-2">{item.autores}</p>
                    {item.fuente && <p className="text-gray-500 text-xs italic mb-2">{item.fuente}</p>}
                    {item.descripcion && <p className="text-gray-600 text-sm mb-4">{item.descripcion}</p>}

                    <div className="flex items-center justify-between flex-wrap gap-3 mt-auto">
                      <div className="text-xs text-gray-500">
                        <span>{formatDate(item.fecha)}</span>
                        <span className="mx-1">·</span>
                        <span>{item.periodo}</span>
                      </div>

                      <div className="flex gap-2">
                        {item.enlace && (
                          <a
                            href={item.enlace}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-uleam-blue text-white text-xs font-medium rounded-lg hover:bg-uleam-blue/90 transition"
                          >
                            {t.publications.viewBtn}
                          </a>
                        )}
                        {item.pdf && (
                          <a
                            href={item.pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition"
                          >
                            {t.publications.pdfBtn}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">{t.publications.noResults}</p>
            </div>
          )}
        </div>
      </main>
      <Footer context="general" />
    </>
  );
}
