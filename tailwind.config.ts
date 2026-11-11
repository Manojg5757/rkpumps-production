import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // "Bore water" blue-teal — primary brand colour
        brand: {
          50: "#EAF4F7",
          100: "#CFE6EE",
          200: "#A3CEDD",
          300: "#6FAFC6",
          400: "#3B8DAD",
          500: "#1A7396",
          600: "#0E5A7A",
          700: "#0B4A65",
          800: "#093B50",
          900: "#072D3D",
        },
        ink: {
          DEFAULT: "#14232B",
          2: "#4A5A63",
          3: "#7B8A92",
        },
        line: "#DCE3E6",
        surface: "#F3F6F7",
      },
      fontFamily: {
        sans: ["var(--font-plex, system-ui)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
      },
    },
  },
  plugins: [],
};
export default config;
