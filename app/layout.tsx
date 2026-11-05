import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nanasore — Plateforme Unifiée & Coffre Numérique Sécurisé",
  description: "Bâtissez votre empire, vendez vos produits ou votre savoir en toute sécurité et souveraineté. 0% de commission sur vos encaissements directs.",
  authors: [{ name: "Nanasore" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="theme-dark dark">
      <head>
        {/* Preconnect & DNS-Prefetch haute vitesse pour CDN, Supabase et Cloudflare R2 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://supabase.co" />
        <link rel="dns-prefetch" href="https://cloudflarestorage.com" />
        <link rel="dns-prefetch" href="https://api.brevo.com" />
      </head>
      <body className="min-h-screen bg-[#070b14] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
