import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";

const interUi = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

// Placeholder for "TASA Orbiter Display" (proprietary — see tailwind.config.ts).
const interTightBody = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Doqment — Know what your project needs, before it costs you",
  description:
    "Doqment tells freelancers, agencies, and small businesses exactly which documents a project needs, and why, before it's too late to fix.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${interUi.variable} ${interTightBody.variable}`}>
      <body className="font-ui text-ink antialiased">{children}</body>
    </html>
  );
}
