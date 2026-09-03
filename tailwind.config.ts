import type { Config } from "tailwindcss";

// Design tokens sourced from docs/design-system.md (Razorpay-derived visual language).
// NOTE: "TASA Orbiter Display" (design-system.md §2, display/H1-H2 font) is a
// proprietary/licensed typeface and is not bundled here. `font-display` falls back
// to Inter Tight until a licensed font file is supplied — swap it in globals.css
// and here once available.
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    // Pinned explicitly per CLAUDE.md §2.1 so they can't drift on a Tailwind bump.
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#305EFF",
          hover: "#4D7FFF",
          tint: "rgba(48,94,255,0.09)",
          "tint-2": "#D0E0FF",
          pale: "#BBDDFF",
          "pale-2": "#CCEEFF",
        },
        ink: "#000000",
        heading: "#192839",
        "navy-deep": "#0D1A48",
        "teal-deep": "#1F3D3A",
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F0F4F6",
          faint: "#F8FAFC",
          "faint-2": "#F1F5FA",
        },
        "overlay-dark": "rgba(11,10,13,0.2)",
        success: "#009E5C",
        error: {
          DEFAULT: "#ED2939",
          deep: "#D52B1E",
          tint: "#FFBFBF",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        ui: ["var(--font-ui)", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "16px",
        pill: "40px",
      },
      boxShadow: {
        card: "0 2px 16px 0 rgba(25,40,57,0.09)",
        "card-alt": "0 2px 16px 0 rgba(49,49,51,0.1)",
        panel:
          "0 2px 4px -2px rgba(19,38,68,0.06), 0 4px 8px -2px rgba(19,38,68,0.1)",
        "sticky-bar": "0 -2px 4px 0 rgba(0,0,0,0.04)",
        drawer: "0 -4px 16px -4px rgba(8,13,41,0.08)",
      },
      maxWidth: {
        page: "1440px",
        content: "1184px",
        grid: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
