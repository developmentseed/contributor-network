import { defineConfig } from "vite";
import { templateHtml } from "./vite.plugin-template-html";

export default defineConfig({
  root: ".",
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    target: "es2022",
  },
  server: {
    port: 8000,
  },
  plugins: [templateHtml()],
});
