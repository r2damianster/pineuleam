import { redirect } from 'next/navigation';

// Esta pantalla ahora es la pestaña "Proyección" de /vinculacion/horas (Administrar horas).
export default function ProyeccionHorasRedirect() {
  redirect('/vinculacion/horas?pestana=proyeccion');
}
