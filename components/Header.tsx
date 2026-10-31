'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n';

interface HeaderProps {
  siteName?: string;
  logoSrc?: string;
  logoAlt?: string;
}

type NavChild = { href?: string; label: string; isHeader?: boolean };
type NavItem = { href: string; label: string; children?: undefined } | { label: string; children: NavChild[]; href?: undefined };

interface ProyectoNav {
  id: string;
  slug: string;
  tipo: string;
  grupo_nav: string | null;
  nav_label: string | null;
  nombre_oficial: string;
  es_red: boolean;
  order: number;
}

// Proyectos cuya página pública ya existe con código bespoke (no la ruta
// genérica /proyectos/[slug]) — sus URLs no cambian sin que un programador
// mueva el archivo, así que quedan fijas acá. Cualquier proyecto NUEVO
// creado desde /admin/proyectos (tipo='plantilla_simple') no está en este
// mapa y cae al fallback /proyectos/{slug}.
const RUTA_CONOCIDA: Record<string, string> = {
  internacionalizacion: '/investigacion/proyecto-innovacion',
  vinculacion: '/vinculacion/dinamicas-linguisticas',
  docencia_innovadora: '/docencia/docencia-innovadora',
  redlea: '/redlea',
  desarrollo_habilidades: '/investigacion/desarrollo-habilidades',
  mentoring: '/investigacion/mentoring',
};

function hrefDeProyecto(p: ProyectoNav): string {
  return RUTA_CONOCIDA[p.id] || `/proyectos/${p.slug}`;
}

export default function Header({ siteName, logoSrc = '/images/logos/logo-carrera-pine.jpg', logoAlt = 'Logo Carrera PINE' }: HeaderProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(null);
  const [proyectosDb, setProyectosDb] = useState<ProyectoNav[] | null>(null);
  const { lang, t, toggle } = useLanguage();
  const navRef = useRef<HTMLUListElement>(null);
  const displaySiteName = siteName || t.nav.siteName;

  useEffect(() => {
    fetch('/api/proyectos')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setProyectosDb(Array.isArray(data) && data.length > 0 ? data : null))
      .catch(() => setProyectosDb(null));
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinksHardcodeados: NavItem[] = [
    { href: '/', label: t.nav.home },
    { label: t.nav.docencia, children: [{ href: '/docencia/docencia-innovadora', label: t.docenciaProject.navLabel }] },
    {
      label: t.nav.investigacion,
      children: [
        { label: t.nav.networksHeader, isHeader: true },
        { href: '/redlea', label: t.nav.redLeaLabel },
        { label: t.nav.projectsHeader, isHeader: true },
        { href: '/investigacion/proyecto-innovacion', label: t.nav.innovacionesLabel },
        { href: '/investigacion/desarrollo-habilidades', label: t.desarrolloProject.navLabel },
        { href: '/investigacion/mentoring', label: t.mentoringProject.navLabel },
        { label: t.nav.productionHeader, isHeader: true },
        { href: '/publicaciones', label: t.nav.publicationsAndContributions },
      ]
    },
    { label: t.nav.vinculacion, children: [{ href: '/vinculacion/dinamicas-linguisticas', label: t.vinculacionProject.navLabel }] },
  ];

  // Si /api/proyectos respondió con filas, el nav se arma desde Neon
  // (permite ocultar/mostrar/reordenar desde /admin/proyectos sin tocar
  // código). Si el fetch falló o la tabla está vacía, se usa el array de
  // arriba tal cual — nunca se deja el nav sin proyectos por un problema de
  // red o de datos.
  const proyectosDeGrupo = (grupo: string, esRed?: boolean) =>
    (proyectosDb || [])
      .filter((p) => p.grupo_nav === grupo && (esRed === undefined || p.es_red === esRed))
      .sort((a, b) => a.order - b.order)
      .map((p): NavChild => ({ href: hrefDeProyecto(p), label: p.nav_label || p.nombre_oficial }));

  const navLinks: NavItem[] = proyectosDb
    ? [
        { href: '/', label: t.nav.home },
            { label: t.nav.docencia, children: proyectosDeGrupo('docencia') },
        {
          label: t.nav.investigacion,
          children: [
            { label: t.nav.networksHeader, isHeader: true },
            ...proyectosDeGrupo('investigacion', true),
            { label: t.nav.projectsHeader, isHeader: true },
            ...proyectosDeGrupo('investigacion', false),
            { label: t.nav.productionHeader, isHeader: true },
            { href: '/publicaciones', label: t.nav.publicationsAndContributions },
          ],
        },
        { label: t.nav.vinculacion, children: proyectosDeGrupo('vinculacion') },
      ]
    : navLinksHardcodeados;

  const toggleDropdown = (label: string) => {
    setOpenDropdown((current) => (current === label ? null : label));
  };

  const toggleMobileDropdown = (label: string) => {
    setOpenMobileDropdown((current) => (current === label ? null : label));
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-lg' : 'bg-gradient-to-b from-uleam-blue/70 via-uleam-blue/30 to-transparent backdrop-blur-sm'
      }`}
    >
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="relative w-12 h-12 shrink-0">
              <Image
                src={logoSrc}
                alt={logoAlt}
                fill
                className="object-contain"
              />
            </div>
            <span className={`font-bold text-lg hidden lg:block leading-tight ${scrolled ? 'text-uleam-blue' : 'text-white'}`}>
              {displaySiteName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <ul ref={navRef} className="hidden md:flex items-center gap-4 lg:gap-6 flex-wrap justify-end">
            {navLinks.map((link) =>
              link.children ? (
                <li key={link.label} className="relative">
                  <button
                    onClick={() => toggleDropdown(link.label)}
                    className={`flex items-center gap-1 font-medium hover:opacity-80 transition whitespace-nowrap ${
                      scrolled ? 'text-uleam-blue' : 'text-white'
                    }`}
                    aria-expanded={openDropdown === link.label}
                  >
                    {link.label}
                    <svg
                      className={`w-4 h-4 transition-transform ${openDropdown === link.label ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openDropdown === link.label && (
                    <ul className="absolute left-0 mt-2 min-w-[260px] bg-white rounded-lg shadow-xl py-2 z-50">
                      {link.children.map((child, i) => (
                        <li key={child.href || i}>
                          {child.isHeader ? (
                            <span className="block px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider mt-1 first:mt-0">
                              {child.label}
                            </span>
                          ) : (
                            <Link
                              href={child.href!}
                              className="block px-4 py-2 text-sm text-uleam-blue hover:bg-gray-100 transition"
                              onClick={() => setOpenDropdown(null)}
                            >
                              {child.label}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ) : (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`font-medium hover:opacity-80 transition whitespace-nowrap ${
                      scrolled ? 'text-uleam-blue' : 'text-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            )}
            <li>
              <button
                onClick={toggle}
                className={`px-3 py-1.5 rounded-md font-bold text-sm border-2 transition ${
                  scrolled
                    ? 'border-uleam-blue text-uleam-blue hover:bg-uleam-blue hover:text-white'
                    : 'border-white text-white hover:bg-white hover:text-uleam-blue'
                }`}
              >
                {lang === 'es' ? 'EN' : 'ES'}
              </button>
            </li>
            <li>
              <Link
                href="/portal/login"
                className={`px-4 py-2 rounded-md font-medium transition ${
                  scrolled
                    ? 'bg-uleam-blue text-white hover:bg-uleam-blue/90'
                    : 'bg-white text-uleam-blue hover:bg-white/90'
                }`}
              >
                {t.nav.portalPine}
              </Link>
            </li>
          </ul>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`md:hidden p-2 rounded-md ${scrolled ? 'text-uleam-blue' : 'text-white'}`}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <ul className="md:hidden mt-4 bg-white rounded-lg shadow-lg p-4">
            {navLinks.map((link) =>
              link.children ? (
                <li key={link.label}>
                  <button
                    onClick={() => toggleMobileDropdown(link.label)}
                    className="w-full flex items-center justify-between py-2 px-4 text-uleam-blue hover:bg-gray-100 rounded font-medium"
                    aria-expanded={openMobileDropdown === link.label}
                  >
                    {link.label}
                    <svg
                      className={`w-4 h-4 transition-transform ${openMobileDropdown === link.label ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openMobileDropdown === link.label && (
                    <ul className="pl-4">
                      {link.children.map((child, i) => (
                        <li key={child.href || i}>
                          {child.isHeader ? (
                            <span className="block py-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mt-1 first:mt-0">
                              {child.label}
                            </span>
                          ) : (
                            <Link
                              href={child.href!}
                              className="block py-2 px-4 text-sm text-uleam-blue hover:bg-gray-100 rounded ml-2"
                              onClick={() => {
                                setIsMenuOpen(false);
                                setOpenMobileDropdown(null);
                              }}
                            >
                              {child.label}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ) : (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block py-2 px-4 text-uleam-blue hover:bg-gray-100 rounded"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            )}
            <li>
              <button
                onClick={toggle}
                className="w-full text-left py-2 px-4 text-uleam-blue hover:bg-gray-100 rounded font-bold"
              >
                {lang === 'es' ? '🌐 English' : '🌐 Español'}
              </button>
            </li>
            <li>
              <Link
                href="/portal/login"
                className="block w-full text-left py-2 px-4 text-uleam-blue hover:bg-gray-100 rounded font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                {t.nav.portalPine}
              </Link>
            </li>
          </ul>
        )}
      </nav>
    </header>
  );
}
