import Link from 'next/link';
import DocumentsBrowser from './DocumentsBrowser';

// Los documentos viven en ./documentsData.ts (cada uno con su categoría). Para agregar uno nuevo:
// copiar el archivo a /public/admin-assets/ y añadir su entrada allí.
export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documentos del Proyecto</h1>
          <p className="mt-2 text-sm text-gray-600">
            Acceso exclusivo para administradores - Documentos confidenciales del proyecto
          </p>
        </div>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
        >
          ← Volver al Dashboard
        </Link>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Confidencial:</strong> Estos documentos son exclusivos del equipo administrativo.
              No compartir externamente.
            </p>
          </div>
        </div>
      </div>

      <DocumentsBrowser />

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">ℹ️ Información</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Los archivos PDF se abren en una nueva pestaña para visualización</li>
          <li>• Use el botón "Descargar" para guardar una copia local</li>
          <li>• Estos documentos están protegidos y solo accesibles desde el panel de administración</li>
          <li>• Para agregar nuevos documentos, colóquelos en la carpeta <code className="bg-blue-100 px-2 py-0.5 rounded">/public/admin-assets/</code> y regístrelos en <code className="bg-blue-100 px-2 py-0.5 rounded">app/admin/documents/documentsData.ts</code> con su categoría</li>
        </ul>
      </div>
    </div>
  );
}
