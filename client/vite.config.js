import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: ['src/__tests__/**'],
      all: true,
    },
    css: true,
    restoreMocks: true,
  },
  build: {
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'esbuild',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  // Optimize dev server
  server: {
    hmr: {
      overlay: false
    }
  },
  // Pre-bundle less frequently used dependencies
  optimizeDeps: {
    exclude: ['quill'],
    include: [
      'react',
      'react-dom',
      'react-router',
      '@reduxjs/toolkit',
      'react-redux',
      'axios',
      'clsx'
    ]
  }
})
