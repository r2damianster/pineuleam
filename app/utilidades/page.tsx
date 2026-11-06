import Link from "next/link";

const HERRAMIENTAS = [
  { href: "/utilidades/acta-tecnica", icon: "📝", nombre: "Acta Técnica", descripcion: "Genera el acta de una reunión con redacción asistida por IA y fotos de evidencia." },
  { href: "/utilidades/oficios", icon: "📄", nombre: "Generador de Oficios", descripcion: "Oficios formales a docentes/autoridades, con redacción asistida por IA." },
  { href: "/utilidades/convocatorias", icon: "📢", nombre: "Convocatorias", descripcion: "Convocatorias a docentes o estudiantes, con hoja de asistencia." },
  { href: "/utilidades/pat-maestria", icon: "🎓", nombre: "PATs Maestría", descripcion: "Genera el paquete PAT-003 a PAT-006 de acompañamiento de tesis de maestría." },
  { href: "/utilidades/pares-lectores", icon: "📋", nombre: "Pares Lectores", descripcion: "Wizard de evaluación de trabajos de titulación (TEFL / Artículo científico)." },
  { href: "/utilidades/revistas", icon: "🔎", nombre: "Buscador de revistas diamante", descripcion: "Ubica revistas de acceso abierto sin costo para tu artículo según su título, resumen, palabras clave y referencias." },
  { href: "/utilidades/directorio", icon: "📇", nombre: "Directorio externo", descripcion: "Agrega personas de otras dependencias o instituciones para elegirlas como destinatario, firmante o CC." },
  { href: "/utilidades/certificados", icon: "🏆", nombre: "Certificados", descripcion: "Genera certificados de participación, exposición, capacitación, voluntariado o reconocimiento, individuales o en lote." },
];

export default function HerramientasMenu() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-4">
        <Link href="/portal/dashboard" className="inline-flex items-center text-[#003366] hover:underline font-medium">
          &larr; Volver al Portal PINE
        </Link>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-[#003366]">Herramientas de Carrera — PINE</h1>
      <p className="mb-8 text-slate-600">Generación de documentos administrativos y académicos de la carrera.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {HERRAMIENTAS.map((h) => (
          <Link key={h.href} href={h.href}
            className="rounded-xl border border-slate-200 p-5 shadow-sm transition hover:border-[#003366] hover:shadow-md">
            <div className="mb-2 text-3xl">{h.icon}</div>
            <div className="font-semibold text-[#003366]">{h.nombre}</div>
            <div className="mt-1 text-sm text-slate-600">{h.descripcion}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
