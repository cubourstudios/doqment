"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Applies the `.dark` class the token layer in globals.css keys off.
 *
 * Without this mounted, `@custom-variant dark (&:is(.dark *))` never matches
 * and the whole dark palette is dead code — every viewer gets the light theme
 * regardless of their device setting. `useTheme()` in the Toaster depends on it
 * too.
 */
export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
