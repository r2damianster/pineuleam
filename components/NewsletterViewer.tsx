'use client';

import Image from 'next/image';
import { Newsletter, NewsletterItem } from '@/types';
import { useLanguage } from '@/lib/i18n';

type FilterType = 'all' | 'news' | 'activity';

interface NewsletterViewerProps {
  newsletter: Newsletter;
  filter: FilterType;
}

export default function NewsletterViewer({
  newsletter,
  filter,
}: NewsletterViewerProps) {
  const { t } = useLanguage();

  const getBimesterLabel = (bimesterIndex: number): string => {
    return t.boletines.bimesterLabels[bimesterIndex] || '';
  };

  const filteredItems = newsletter.items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'news') return item.type === 'news';
    if (filter === 'activity') return item.type === 'activity';
    return true;
  });

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t.boletines.empty}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-uleam-blue mb-2">
          {t.boletines.bimesterPrefix} {getBimesterLabel(newsletter.bimesterIndex)} {newsletter.year}
        </h2>
        <div className="w-16 h-1 bg-uleam-gold rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => (
          <NewsletterCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function NewsletterCard({ item }: { item: NewsletterItem }) {
  const { t, lang } = useLanguage();

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Image or Placeholder */}
      {item.image ? (
        <div className="relative w-full h-48">
          <Image
            src={item.image}
            alt={item.title}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-uleam-blue/10 to-uleam-gold/10 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-12 h-12 text-uleam-blue/30 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs text-uleam-blue/50">{t.boletines.noImage}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        {/* Badge */}
        <div className="mb-3">
          <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
            item.type === 'news'
              ? 'bg-uleam-blue/10 text-uleam-blue'
              : 'bg-uleam-gold/10 text-uleam-gold'
          }`}>
            {item.type === 'news' ? t.boletines.newsBadge : t.boletines.activityBadge}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-uleam-blue mb-3 line-clamp-2 min-h-14">
          {item.title}
        </h3>

        {/* Date */}
        <p className="text-sm text-gray-500 mb-3">
          {new Date(item.date).toLocaleDateString(lang === 'es' ? 'es-EC' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
          })}
        </p>

        {/* Excerpt */}
        {item.excerpt && (
          <p className="text-sm text-gray-600 line-clamp-3">
            {item.excerpt}
          </p>
        )}
      </div>
    </div>
  );
}
