'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n';

interface Foto {
  id: string;
  url: string;
  titulo?: string;
  descripcion?: string;
  posicion?: number; // 0-100: 0 = borde superior de la foto, 100 = borde inferior, 50 = centro
}

const AUTOPLAY_MS = 5000;

export default function PhotoCarousel({ ubicacion }: { ubicacion: string }) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const { t } = useLanguage();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`/api/photos?ubicacion=${encodeURIComponent(ubicacion)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => setFotos(Array.isArray(rows) ? rows : []))
      .catch(() => setFotos([]));
  }, [ubicacion]);

  useEffect(() => {
    if (paused || fotos.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % fotos.length);
    }, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, fotos.length]);

  if (fotos.length === 0) return null;

  const goTo = (nuevoIndex: number) => {
    setIndex((nuevoIndex + fotos.length) % fotos.length);
  };

  return (
    <section
      className="relative w-full overflow-hidden bg-uleam-blue"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative w-full h-[300px] md:h-[480px]">
        <div className="relative h-full">
          {fotos.map((foto, fotoIndex) => (
            <div
              key={foto.id}
              aria-hidden={fotoIndex !== index}
              className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${fotoIndex === index ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            >
              <Image
                src={foto.url}
                alt={foto.titulo || ''}
                fill
                priority={fotoIndex === 0}
                loading="eager"
                className="object-cover"
                style={{ objectPosition: `center ${foto.posicion ?? 50}%` }}
                sizes="100vw"
              />
              {foto.titulo && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 md:p-6">
                  <p className="text-white text-sm md:text-base font-medium">{foto.titulo}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label={t.photoCarousel.prev}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-uleam-blue rounded-full w-9 h-9 md:w-11 md:h-11 flex items-center justify-center shadow-lg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label={t.photoCarousel.next}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-uleam-blue rounded-full w-9 h-9 md:w-11 md:h-11 flex items-center justify-center shadow-lg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {fotos.map((foto, i) => (
                <button
                  key={foto.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`${t.photoCarousel.goTo} ${i + 1}`}
                  className={`w-2.5 h-2.5 rounded-full transition ${i === index ? 'bg-uleam-gold' : 'bg-white/60 hover:bg-white'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
