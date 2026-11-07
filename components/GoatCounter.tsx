'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const GOATCOUNTER_ENDPOINT = 'https://pineuleam.goatcounter.com/count';

// Rutas internas (requieren sesión o son herramientas): no se cuentan como visitas del sitio público.
const INTERNAL_PATH_PREFIXES = [
  '/admin',
  '/portal',
  '/superadmin',
  '/pine-dashboard',
  '/gestion-carrera',
  '/contribuciones',
  '/utilidades',
  '/registro',
  '/investigacion/espacios',
  '/investigacion/informes',
  '/vinculacion',
];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/vinculacion/dinamicas-linguisticas')) return true;
  return !INTERNAL_PATH_PREFIXES.some((internalPrefix) => pathname.startsWith(internalPrefix));
}

declare global {
  interface Window {
    goatcounter?: { count: (options: { path: string }) => void };
  }
}

export default function GoatCounter() {
  const pathname = usePathname();
  const [isScriptReady, setIsScriptReady] = useState(false);

  useEffect(() => {
    if (!isScriptReady || !pathname || !isPublicPath(pathname)) return;
    window.goatcounter?.count({ path: pathname });
  }, [isScriptReady, pathname]);

  return (
    <Script
      src="https://gc.zgo.at/count.js"
      strategy="afterInteractive"
      data-goatcounter={GOATCOUNTER_ENDPOINT}
      data-goatcounter-settings='{"no_onload": true}'
      onReady={() => setIsScriptReady(true)}
    />
  );
}
