import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Pretendard", "SUIT", "Noto Sans KR", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Cascadia Code", "Consolas", "ui-monospace", "monospace"]
      },
      colors: {
        workspace: {
          ink: "#172033",
          muted: "#64748b",
          line: "#d7dee8",
          panel: "#ffffff",
          accent: "#2563eb",
          success: "#059669",
          warn: "#b45309",
          danger: "#dc2626"
        }
      }
    }
  },
  plugins: []
};

export default config;
