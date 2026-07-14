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
          DEFAULT: "#E5E5E3",
          dim: "#242426",
        },
        warn: {
          DEFAULT: "#B0B0AD",
          dim: "#242422",
        },
        gold: {
          DEFAULT: "#C7C7C5",
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
