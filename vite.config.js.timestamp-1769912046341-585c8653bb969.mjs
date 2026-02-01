// vite.config.js
import { defineConfig } from "file:///sessions/busy-kind-ramanujan/mnt/contributor-network/node_modules/vite/dist/node/index.js";
import { resolve } from "path";
var __vite_injected_original_dirname = "/sessions/busy-kind-ramanujan/mnt/contributor-network";
var vite_config_default = defineConfig({
  root: ".",
  publicDir: "lib",
  build: {
    outDir: "dist",
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvYnVzeS1raW5kLXJhbWFudWphbi9tbnQvY29udHJpYnV0b3ItbmV0d29ya1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL3Nlc3Npb25zL2J1c3kta2luZC1yYW1hbnVqYW4vbW50L2NvbnRyaWJ1dG9yLW5ldHdvcmsvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL3Nlc3Npb25zL2J1c3kta2luZC1yYW1hbnVqYW4vbW50L2NvbnRyaWJ1dG9yLW5ldHdvcmsvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcm9vdDogJy4nLFxuICBwdWJsaWNEaXI6ICdsaWInLFxuICBidWlsZDoge1xuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIGxpYjoge1xuICAgICAgLy8gQnVuZGxlIHRoZSBtYWluIHZpc3VhbGl6YXRpb24gYXMgYSBsaWJyYXJ5XG4gICAgICBlbnRyeTogcmVzb2x2ZShfX2Rpcm5hbWUsICdpbmRleC5qcycpLFxuICAgICAgbmFtZTogJ0NvbnRyaWJ1dG9yTmV0d29yaycsXG4gICAgICBmaWxlTmFtZTogKGZvcm1hdCkgPT4gYGNvbnRyaWJ1dG9yLW5ldHdvcmsuJHtmb3JtYXR9LmpzYCxcbiAgICAgIGZvcm1hdHM6IFsnZXMnLCAnaWlmZSddXG4gICAgfSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAvLyBEMyBpcyBsb2FkZWQgZXh0ZXJuYWxseSB2aWEgc2NyaXB0IHRhZ1xuICAgICAgZXh0ZXJuYWw6IFsnZDMnXSxcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBnbG9iYWxzOiB7XG4gICAgICAgICAgZDM6ICdkMydcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgb3BlbjogJy9kaXN0L2luZGV4Lmh0bWwnXG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFpVixTQUFTLG9CQUFvQjtBQUM5VyxTQUFTLGVBQWU7QUFEeEIsSUFBTSxtQ0FBbUM7QUFHekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsTUFBTTtBQUFBLEVBQ04sV0FBVztBQUFBLEVBQ1gsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsS0FBSztBQUFBO0FBQUEsTUFFSCxPQUFPLFFBQVEsa0NBQVcsVUFBVTtBQUFBLE1BQ3BDLE1BQU07QUFBQSxNQUNOLFVBQVUsQ0FBQyxXQUFXLHVCQUF1QixNQUFNO0FBQUEsTUFDbkQsU0FBUyxDQUFDLE1BQU0sTUFBTTtBQUFBLElBQ3hCO0FBQUEsSUFDQSxlQUFlO0FBQUE7QUFBQSxNQUViLFVBQVUsQ0FBQyxJQUFJO0FBQUEsTUFDZixRQUFRO0FBQUEsUUFDTixTQUFTO0FBQUEsVUFDUCxJQUFJO0FBQUEsUUFDTjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
