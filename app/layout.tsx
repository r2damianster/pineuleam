import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import GoatCounter from "@/components/GoatCounter";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Carrera de Pedagogía de los Idiomas Nacionales y Extranjero - ULEAM",
  description: "Carrera de Pedagogía de los Idiomas Nacionales y Extranjeros de la Universidad Laica Eloy Alfaro de Manabí (ULEAM). Proyectos de investigación, redes de cooperación y boletines académicos.",
  keywords: ["ULEAM", "carrera", "pedagogía", "idiomas", "investigación", "innovación pedagógica", "internacionalización"],
  authors: [{ name: "Arturo Rodríguez" }, { name: "Jhonny Villafuerte" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <LanguageProvider>
          <ImpersonationBanner />
          {children}
        </LanguageProvider>
        <GoatCounter />
      </body>
    </html>
  );
}
