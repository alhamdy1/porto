import type { Metadata } from "next";
import "./globals.css";
import siteConfig from "../site.config";

export const metadata: Metadata = {
  title: `${siteConfig.siteName} - ${siteConfig.personal.title}`,
  description: siteConfig.siteDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={siteConfig.language}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
