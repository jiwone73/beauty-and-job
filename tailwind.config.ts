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
        primary: {
          DEFAULT: "#5f0080",
          hover: "#4a0066",
          soft: "#f3e8f7",
          light: "#b48dc7",
          pale: "#faf5fc",
        },
        kakao: {
          DEFAULT: "#fee500",
          text: "#191919",
        },
        warn: "#e8a317",
        error: "#d4537e",
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "Noto Sans KR",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        modal: "0 20px 60px rgba(95, 0, 128, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
