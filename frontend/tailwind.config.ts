import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — dark gaming aesthetic
        brand: {
          bg: "#0a0a0f",        // near-black app background
          card: "#12121a",      // card surface
          surface: "#1a1a2e",   // elevated surfaces
          accent: "#7c3aed",    // primary purple (XP, actions)
          glow: "#a855f7",      // glow / highlight
          gold: "#f59e0b",      // XP / streak gold
          green: "#10b981",     // "understood" confirm
          red: "#ef4444",       // difficulty hard
          muted: "#6b7280",     // muted text
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "bounce-soft": "bounceSoft 0.4s ease",
        "level-up": "levelUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "streak-pop": "streakPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.85", filter: "brightness(1.3)" },
        },
        bounceSoft: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(0.88)" },
          "70%": { transform: "scale(1.12)" },
          "100%": { transform: "scale(1)" },
        },
        levelUp: {
          "0%": { transform: "scale(0.5) translateY(20px)", opacity: "0" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        streakPop: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.3)" },
          "100%": { transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
