import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#0B0E14", // fundo principal, quase-preto azulado
          surface: "#12161F", // cards e superfícies elevadas
          border: "#1F2530",
        },
        ink: {
          DEFAULT: "#E7EAF0", // texto principal
          muted: "#8B93A5", // texto secundário
          faint: "#5A6172",
        },
        accent: {
          DEFAULT: "#2DD4BF", // teal — progresso, positivo
          dim: "#134E48",
        },
        warn: {
          DEFAULT: "#FB7185", // coral — alerta, negativo, despesa
          dim: "#4A1D24",
        },
        gold: {
          DEFAULT: "#F2B84B", // metas, destaque secundário
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
