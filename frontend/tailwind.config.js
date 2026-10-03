/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  // Keep the existing reset in control until each screen has migrated.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F3F7F2",
          100: "#E5EEE2",
          300: "#A8C2A3",
          500: "#52785A",
          700: "#2E573C",
          900: "#173525",
        },
        cream: { 50: "#FFFEFA", 100: "#F8F6F0" },
        earth: { 400: "#77766F", 600: "#54544D", 900: "#242923" },
      },
      fontFamily: {
        display: ["DM Serif Display", "Georgia", "serif"],
        body: ["Outfit", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "1rem" },
      maxWidth: { content: "1200px" },
    },
  },
  plugins: [],
};
