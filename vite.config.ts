/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Worker support (ES modules)
  worker: {
    format: 'es',
  },

  build: {
    // Bundle size budget: warn at 350KB gzipped initial
    chunkSizeWarningLimit: 350,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-primer': ['@primer/react', '@primer/octicons-react'],
          'vendor-graph': [
            'sigma',
            'graphology',
            'graphology-layout-forceatlas2',
          ],
          'vendor-data': ['zod', 'zustand', 'comlink', 'minisearch'],
        },
      },
    },
  },

  // Vitest configuration
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: true,
    // Use Vite's transform pipeline for all deps (handles CSS in node_modules)
    server: {
      deps: {
        inline: [/@primer\/react/],
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/main.tsx',
        'src/**/*.d.ts',
      ],
    },
  },
});
