import { redirect } from 'next/navigation';

// Esta pantalla ahora es la pestaña "Topes" de /vinculacion/horas (Administrar horas).
export default function TopesHorasRedirect() {
  redirect('/vinculacion/horas?pestana=topes');
}
