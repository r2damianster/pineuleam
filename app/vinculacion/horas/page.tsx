'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { puedeGestionarVinculacion } from '@/lib/modulos';
import ProyeccionHorasPanel from '@/components/horas/ProyeccionHorasPanel';
import TopesHorasPanel from '@/components/horas/TopesHorasPanel';

type Pestana = 'proyeccion' | 'topes';

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: 'proyeccion', etiqueta: 'Proyección de cumplimiento' },
  { id: 'topes', etiqueta: 'Topes por pasante' },
];

// Administrar horas: reúne la proyección de cumplimiento y los topes por pasante (antes dos páginas sueltas).
// Depende de que ya existan espacios y pasantes asignados. Solo líder de Vinculación / superadmin.
function AdministrarHoras() {
  const router = useRouter();
  const parametros = useSearchParams();
  const [verificando, setVerificando] = useState(true);
  const pestana: Pestana = parametros.get('pestana') === 'topes' ? 'topes' : 'proyeccion';

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!puedeGestionarVinculacion(data.usuario)) { router.push('/portal/dashboard'); return; }
        setVerificando(false);
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/horas'));
  }, [router]);

  if (verificando) return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-baseline gap-4 mb-3">
          <Link href="/portal/dashboard" className="text-blue-600 hover:underline font-medium text-sm">&larr; Volver al Portal PINE</Link>
          <h1 className="text-xl font-bold text-gray-800">Administrar horas</h1>
        </div>
        <div className="flex gap-1 border-b border-gray-200 mb-4" role="tablist">
          {PESTANAS.map(item => (
            <Link
              key={item.id}
              href={`/vinculacion/horas?pestana=${item.id}`}
              role="tab"
              aria-selected={pestana === item.id}
              className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${pestana === item.id ? 'border-uleam-blue text-uleam-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {item.etiqueta}
            </Link>
          ))}
        </div>
        {pestana === 'topes' ? <TopesHorasPanel /> : <ProyeccionHorasPanel />}
      </div>
    </div>
  );
}

export default function AdministrarHorasPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Cargando...</div>}>
      <AdministrarHoras />
    </Suspense>
  );
}
