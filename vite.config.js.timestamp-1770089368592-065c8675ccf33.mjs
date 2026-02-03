// vite.config.js
import { defineConfig } from "file:///sessions/pensive-cool-hawking/mnt/contributor-network/node_modules/vite/dist/node/index.js";
import { resolve } from "path";
var __vite_injected_original_dirname = "/sessions/pensive-cool-hawking/mnt/contributor-network";
var vite_config_default = defineConfig({
  root: ".",
  publicDir: "lib",
  build: {
    outDir: "build",
    emptyOutDir: true,
    lib: {
      // Bundle the main visualization as a library
      entry: resolve(__vite_injected_original_dirname, "index.js"),
      name: "ContributorNetwork",
      fileName: (format) => `contributor-network.${format}.js`,
      formats: ["es", "iife"]
    },
    rollupOptions: {
      // D3 is loaded externally via script tag
      external: ["d3"],
      output: {
        globals: {
          d3: "d3"
        }
      }
    }
  },
  server: {
    open: "/dist/index.html"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvcGVuc2l2ZS1jb29sLWhhd2tpbmcvbW50L2NvbnRyaWJ1dG9yLW5ldHdvcmtcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9zZXNzaW9ucy9wZW5zaXZlLWNvb2wtaGF3a2luZy9tbnQvY29udHJpYnV0b3ItbmV0d29yay92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vc2Vzc2lvbnMvcGVuc2l2ZS1jb29sLWhhd2tpbmcvbW50L2NvbnRyaWJ1dG9yLW5ldHdvcmsvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcm9vdDogJy4nLFxuICBwdWJsaWNEaXI6ICdsaWInLFxuICBidWlsZDoge1xuICAgIG91dERpcjogJ2J1aWxkJyxcbiAgICBlbXB0eU91dERpcjogdHJ1ZSxcbiAgICBsaWI6IHtcbiAgICAgIC8vIEJ1bmRsZSB0aGUgbWFpbiB2aXN1YWxpemF0aW9uIGFzIGEgbGlicmFyeVxuICAgICAgZW50cnk6IHJlc29sdmUoX19kaXJuYW1lLCAnaW5kZXguanMnKSxcbiAgICAgIG5hbWU6ICdDb250cmlidXRvck5ldHdvcmsnLFxuICAgICAgZmlsZU5hbWU6IChmb3JtYXQpID0+IGBjb250cmlidXRvci1uZXR3b3JrLiR7Zm9ybWF0fS5qc2AsXG4gICAgICBmb3JtYXRzOiBbJ2VzJywgJ2lpZmUnXVxuICAgIH0sXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgLy8gRDMgaXMgbG9hZGVkIGV4dGVybmFsbHkgdmlhIHNjcmlwdCB0YWdcbiAgICAgIGV4dGVybmFsOiBbJ2QzJ10sXG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgZ2xvYmFsczoge1xuICAgICAgICAgIGQzOiAnZDMnXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIG9wZW46ICcvZGlzdC9pbmRleC5odG1sJ1xuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBb1YsU0FBUyxvQkFBb0I7QUFDalgsU0FBUyxlQUFlO0FBRHhCLElBQU0sbUNBQW1DO0FBR3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQSxFQUNOLFdBQVc7QUFBQSxFQUNYLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLGFBQWE7QUFBQSxJQUNiLEtBQUs7QUFBQTtBQUFBLE1BRUgsT0FBTyxRQUFRLGtDQUFXLFVBQVU7QUFBQSxNQUNwQyxNQUFNO0FBQUEsTUFDTixVQUFVLENBQUMsV0FBVyx1QkFBdUIsTUFBTTtBQUFBLE1BQ25ELFNBQVMsQ0FBQyxNQUFNLE1BQU07QUFBQSxJQUN4QjtBQUFBLElBQ0EsZUFBZTtBQUFBO0FBQUEsTUFFYixVQUFVLENBQUMsSUFBSTtBQUFBLE1BQ2YsUUFBUTtBQUFBLFFBQ04sU0FBUztBQUFBLFVBQ1AsSUFBSTtBQUFBLFFBQ047QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
