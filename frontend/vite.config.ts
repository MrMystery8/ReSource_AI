import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      include: [/shared/, /node_modules/],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@resource-ai/shared': path.resolve(__dirname, '../shared/dist/index.js'),
    },
  },
  optimizeDeps: {
    include: ['@resource-ai/shared'],
  },
  server: {
    port: 5173,
  },
});
