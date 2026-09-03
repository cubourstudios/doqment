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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
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
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
