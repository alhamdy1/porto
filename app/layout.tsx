import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portfolio - Pengembang Full Stack & Desainer",
  description: "Portfolio profesional yang menampilkan proyek pengembangan web, keahlian, sertifikasi, testimoni, dan artikel teknis. Spesialisasi dalam React, Next.js, TypeScript, dan teknologi web modern.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
