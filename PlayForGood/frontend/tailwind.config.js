/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#070B14",
        panel: "#0D1424",
        ink: "#E6F1FF",
        neon: "#1EA7FF",
        neonSoft: "#8ED8FF",
        success: "#17D692",
        warning: "#FFB020",
        danger: "#FF5C7A"
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(30, 167, 255, 0.3), 0 10px 40px rgba(30, 167, 255, 0.2)"
      }
    }
  },
  plugins: []
};


