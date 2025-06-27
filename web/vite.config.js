import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
    },
  },
  build: {
    cssCodeSplit: true,
    minify: "esbuild",
    target: "es2022",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        forest: path.resolve(__dirname, "forest.html"),
      },
    },
  },

  plugins: [tailwindcss()],
});
