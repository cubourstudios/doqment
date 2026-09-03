"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Pins the product to its light theme.
 *
 * This followed the device setting, which meant anyone whose OS was in dark
 * mode got the dark palette — the app was only reliably white on a machine
 * that happened to be in light mode. Doqment's surface is documents: an
 * invoice preview, a PDF, a contract, all of which are white pages. A dark
 * chrome around a white page is a worse frame for that than a white one, and
 * "looks like the document you are about to send" is the point.
 *
 * The provider stays mounted rather than being deleted, because the Toaster
 * calls `useTheme()`. `forcedTheme` is the one-line switch back if a dark
 * theme is ever wanted deliberately; the `.dark` tokens in globals.css are
 * kept for that reason.
 */
export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider attribute="class" forcedTheme="light">
      {children}
    </NextThemesProvider>
  );
}
