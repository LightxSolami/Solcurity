/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        solana: {
          purple: "#9945FF",
          blue: "#14F195",
          dark: "#0a0a1a",
          navy: "#0f0f2a",
          card: "#111133",
        },
        risk: {
          low: "#22c55e",
          moderate: "#eab308",
          high: "#f97316",
          critical: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};
