'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

// Cuántas tarjetas caben en la fila horizontal (noticias, eventos y podcasts juntos).
const FEED_LIMIT = 20;

interface News {
  id: string;
  title: string;
  content: string;
  featured_image?: string;
  published_date: string;
  external_link?: string;
  // Podcast: se muestra el video incrustado en vez de una imagen.
  video_embed_id?: string;
  is_podcast?: boolean;
  kind: 'podcast' | 'event' | 'news';
  is_featured?: boolean;
}

export default function NewsSection() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const loadNews = async () => {
      try {
        const [newsRes, videosRes] = await Promise.all([
          fetch('/api/actividades-difusion?seccion=noticias'),
          fetch('/api/videos'),
        ]);
        if (!newsRes.ok) throw new Error('Failed to fetch news');
        const rows = await newsRes.json();
        const videoRows = videosRes.ok ? await videosRes.json() : [];

        // Los podcasts salen por su video (incrustado): la fila de difusión de un podcast se omite
        // para no duplicarlo ni mostrarlo sin video.
        const newsItems: News[] = rows
          .filter((r: any) => r.tipo !== 'podcast')
          .map((r: any) => ({
            id: `news-${r.id}`,
            title: r.titulo,
            content: r.descripcion || '',
            featured_image: r.photos?.[0],
            published_date: r.fecha,
            external_link: r.external_link,
            kind: r.origen === 'noticia' ? 'news' : 'event',
            is_featured: !!r.is_featured,
          }));
        const podcastItems: News[] = videoRows
          .filter((v: any) => v.embed_id)
          .map((v: any) => ({
            id: `video-${v.id}`,
            title: v.title,
            content: v.description || '',
            published_date: v.published_date || v.created,
            video_embed_id: v.embed_id,
            is_podcast: true,
            kind: 'podcast',
            is_featured: !!v.is_featured,
          }));

        // Destacados vigentes primero, luego cronológico: lo más reciente a la izquierda.
        const feed = [...newsItems, ...podcastItems]
          .sort((a, b) =>
            Number(!!b.is_featured) - Number(!!a.is_featured) ||
            new Date(b.published_date || 0).getTime() - new Date(a.published_date || 0).getTime()
          )
          .slice(0, FEED_LIMIT);
        setNews(feed);
      } catch (error) {
        // Fallback sample data
        setNews([
          {
            id: '1',
            kind: 'podcast',
            title: 'Nuevo episodio de podcast: Innovación en la era digital',
            content: 'Hemos lanzado nuestro más reciente episodio donde exploramos las tendencias de innovación educativa...',
            featured_image: '/images/activities/Actividad_Podcast.jpeg',
            published_date: '2025-03-20',
          },
          {
            id: '2',
            kind: 'news',
            title: 'Publicación en revista internacional',
            content: 'Nuestro equipo ha publicado un artículo en una revista indexada sobre internacionalización educativa...',
            published_date: '2025-03-10',
          },
          {
            id: '3',
            kind: 'event',
            title: 'Taller de innovaciones pedagógicas',
            content: 'Realizamos exitosamente el taller con la participación de más de 50 docentes de diferentes facultades...',
            featured_image: '/images/activities/actividad_previa_podcast.jpeg',
            published_date: '2025-02-28',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadNews();
  }, []);

  if (loading) {
    return (
      <section id="noticias" className="py-10 md:py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <div className="text-2xl font-bold text-uleam-blue">{t.news.loading}</div>
        </div>
      </section>
    );
  }

  return (
    <section id="noticias" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="relative text-center mb-8 md:mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">
            {t.news.sectionTitle}
          </h2>
          <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t.news.sectionSubtitle}
          </p>
          {/* Extensión de las noticias (no una sección aparte): a la derecha del título en pantallas anchas. */}
          <div className="mt-5 md:mt-0 md:absolute md:right-0 md:bottom-1">
            <Link
              href="/boletines"
              className="inline-flex items-center gap-1 text-sm font-semibold text-uleam-blue border border-uleam-blue/40 rounded-full px-4 py-2 hover:bg-uleam-blue hover:text-white transition-colors"
            >
              {t.news.viewBulletins}
            </Link>
          </div>
        </div>

        {/* News Horizontal Scroll */}
        <div className="flex overflow-x-auto space-x-8 pb-4">
          {news.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-80">
              <NewsCard news={item} />
            </div>
          ))}
        </div>

        {news.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p className="text-gray-600 text-lg">{t.news.empty}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function NewsCard({ news }: { news: News }) {
  const { t, lang } = useLanguage();
  return (
    <article className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 border border-gray-100">
      {/* Podcast: video incrustado */}
      {news.video_embed_id && (
        <div className="relative h-48 bg-gray-900">
          <iframe
            src={`https://www.youtube.com/embed/${news.video_embed_id}`}
            title={news.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      )}

      {/* Featured Image */}
      {!news.video_embed_id && news.featured_image && (
        <div className="relative h-48 bg-gray-200">
          <Image
            src={news.featured_image}
            alt={news.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <span className="px-2.5 py-0.5 bg-uleam-gold text-uleam-blue text-xs font-bold rounded-full">
            {news.kind === 'podcast' ? t.news.podcastBadge : news.kind === 'event' ? t.news.eventBadge : t.news.newsBadge}
          </span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <time>
            {new Date(news.published_date).toLocaleDateString(lang === 'es' ? 'es-EC' : 'en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: 'UTC',
            })}
          </time>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-uleam-blue mb-3 line-clamp-2">
          {news.title}
        </h3>

        {/* Content Preview */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {news.content.replace(/<[^>]*>/g, '').substring(0, 150)}{news.content.length > 150 ? '...' : ''}
        </p>

        {/* Read More */}
        {news.external_link && (
          <a
            href={news.external_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 font-medium text-sm inline-flex items-center gap-1 transition"
          >
            {t.news.readMore}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        )}
      </div>
    </article>
  );
}
