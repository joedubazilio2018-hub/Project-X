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
          DEFAULT: "#0A0A0B",
          surface: "#16161B",
          border: "#2A2A2D",
        },
        ink: {
          DEFAULT: "#F0F0EE",
          muted: "#9C9CA0",
          faint: "#57575B",
        },
        accent: {
          DEFAULT: "#E8541E",
          dim: "#3A2216",
        },
        warn: {
          DEFAULT: "#D9455F",
          dim: "#3A1620",
        },
        gold: {
          DEFAULT: "#D9A448",
          dim: "#3A2F14",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      borderRadius: {
        xl: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
