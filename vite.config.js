import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'lib',
  build: {
    outDir: 'build',
    emptyOutDir: true,
    lib: {
      // Bundle the main visualization as a library
      entry: resolve(__dirname, 'index.js'),
      name: 'ContributorNetwork',
      fileName: (format) => `contributor-network.${format}.js`,
      formats: ['es', 'iife']
    },
    rollupOptions: {
      // D3 is loaded externally via script tag
      external: ['d3'],
      output: {
        globals: {
          d3: 'd3'
        }
      }
    }
  },
  server: {
    open: '/dist/index.html'
  }
});
