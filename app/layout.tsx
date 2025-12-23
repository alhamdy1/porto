import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portfolio - Full Stack Developer & Designer",
  description: "Professional portfolio showcasing web development projects, skills, certifications, testimonials, and technical articles. Specialized in React, Next.js, TypeScript, and modern web technologies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
