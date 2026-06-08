import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0B",
        panel: "#141416",
        panel2: "#1C1C20",
        line: "#2A2A30",
        ink: "#FFFFFF",
        "ink-2": "#C9C9CF",
        "ink-3": "#8A8A93",
        "ink-4": "#5A5A63",
        accent: "#C6FF3A",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
