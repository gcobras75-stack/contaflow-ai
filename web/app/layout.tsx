import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

/*
  ContaFlow AI — Sistema de Diseño
  Tipografía: Inter — legible, profesional, ideal para datos numéricos
  Variables: --font-sans queda disponible vía globals.css (@theme inline)
*/
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ContaFlow AI — Panel Contable",
  description: "Sistema contable inteligente para despachos mexicanos",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-MX"
      className={`${inter.variable} h-full`}
    >
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
