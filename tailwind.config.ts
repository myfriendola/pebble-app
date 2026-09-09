import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm paper + panels
        paper: "#F5F1EA",
        panel: "#F1EFE8",
        // Ink
        ink: {
          DEFAULT: "#2C2C2A",
          secondary: "#5F5E5A",
          muted: "#888780",
        },
        // Muted sage accent
        sage: {
          DEFAULT: "#0F6E56",
          tint: "#E1F5EE",
          ring: "#9FE1CB",
          ring2: "#5DCAA5",
        },
        // A warm, low-contrast hairline derived from the paper
        hairline: "#E4DED2",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Newsreader", "Lora", "Georgia", "serif"],
      },
      borderRadius: {
        card: "12px",
        control: "8px",
        pill: "999px",
      },
      letterSpacing: {
        label: "0.06em",
      },
      maxWidth: {
        reading: "40rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-still": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.7s ease both",
        "fade-in-slow": "fade-in 1.1s ease both",
        "fade-in-still": "fade-in-still 0.9s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
