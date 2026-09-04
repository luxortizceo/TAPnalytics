import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthFragmentRedirect } from "./auth-fragment-redirect";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TAPnalytics — Convierte cada tap en una decisión inteligente",
    template: "%s · TAPnalytics",
  },
  description:
    "Captura la experiencia de tus clientes, detecta problemas antes de que se conviertan en malas reseñas y mejora cada sucursal con datos accionables.",
  // Agregada al inicio de pantalla, esto es lo que hace que abra en modo
  // standalone (sin la barra de Safari) en vez de como una pestaña más.
  appleWebApp: {
    capable: true,
    title: "TAPnalytics",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthFragmentRedirect />
        <a href="#main-content" className="skip-link">
          Saltar al contenido principal
        </a>
        {children}
      </body>
    </html>
  );
}
