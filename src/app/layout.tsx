import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Doqment — know which documents you need, then create them",
    template: "%s · Doqment",
  },
  description:
    "Guided contracts, proposals and compliant invoices for freelancers. Tells you which documents a project needs, and why, then generates them.",
  applicationName: "Doqment",
  appleWebApp: {
    capable: true,
    title: "Doqment",
    statusBarStyle: "default",
  },
};

/**
 * `viewportFit: "cover"` lets the layout extend under the notch and home
 * indicator; the `safe-top` / `safe-bottom` utilities in globals.css then pad
 * back the parts that must stay tappable.
 *
 * `maximumScale` is deliberately left alone — capping zoom blocks users who
 * need to magnify text, and it isn't needed to stop iOS input zoom (a 16px
 * base font size does that).
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // One colour, because the app is pinned to its light theme (see
  // components/theme-provider.tsx). Handing the browser a dark chrome colour
  // on a dark-mode device would frame a white page in near-black.
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning is required by next-themes: it writes the theme
    // class on <html> before React hydrates, so server and client markup
    // legitimately differ on this one element.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/*
         * Google Sans, served from Google's API rather than self-hosted.
         * next/font cannot fetch it — this Next version's Google font manifest
         * predates it — and the file is Google's proprietary brand font rather
         * than an OFL release like the Noto used for PDFs, so vendoring the
         * binaries into the repo is not ours to do.
         *
         * Geist stays loaded as the fallback in --font-sans: it is self-hosted
         * by next/font, so a blocked or slow CDN degrades to a real typeface
         * instead of to Times New Roman.
         */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font --
            the rule is about pages/_document.js in the Pages Router. This is
            the App Router root layout, so the stylesheet is on every page,
            which is exactly what the rule asks for. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght,GRAD@0,17..18,400..700,-50..200;1,17..18,400..700,-50..200&display=swap"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
