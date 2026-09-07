import { fileURLToPath } from "node:url";

const frontendRoot = fileURLToPath(new URL(".", import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    `${frontendRoot}/index.html`,
    `${frontendRoot}/src/**/*.{js,jsx}`,
  ],
  theme: {
    extend: {
      colors: {
        maitri: {
          50: "#f0f5ff",
          100: "#dbe6fe",
          500: "#3b5bdb",
          600: "#2f4bc4",
          700: "#263ea3",
          900: "#1a2a6b",
        },
        saffron: "#FF9933",
        indiagreen: "#138808",
      },
    },
  },
  plugins: [],
}
