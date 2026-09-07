/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        desk: {
          bg: "#0b0f17",
          panel: "#121826",
          border: "#1f2937",
          accent: "#3b82f6",
          ok: "#22c55e",
          warn: "#eab308",
          err: "#ef4444",
          muted: "#94a3b8",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
