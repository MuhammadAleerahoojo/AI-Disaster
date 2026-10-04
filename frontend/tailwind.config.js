/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#070A10",
          900: "#0B0F17",
          800: "#111826",
          700: "#182233",
          600: "#243044",
        },
        cyan: {
          accent: "#2DD4E8",
        },
        severity: {
          low: "#22C55E",
          moderate: "#EAB308",
          high: "#F97316",
          critical: "#EF4444",
        },
        ink: {
          100: "#EEF1F6",
          300: "#B7C0D1",
          500: "#7C879C",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      boxShadow: {
        glass: "0 1px 0 0 rgba(255,255,255,0.04) inset",
      },
      backgroundImage: {
        "grid-fade": "radial-gradient(circle at 20% 0%, rgba(45,212,232,0.10), transparent 40%)",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.8)", opacity: "0" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        "pulse-ring": "pulseRing 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
        scan: "scan 3s linear infinite",
      },
    },
  },
  plugins: [],
};
