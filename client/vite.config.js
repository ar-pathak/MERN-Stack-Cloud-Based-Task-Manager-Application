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
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/')

          if (!normalized.includes('/node_modules/')) return undefined
          if (normalized.includes('/recharts/') || normalized.includes('/d3-')) return 'vendor-charts'
          if (normalized.includes('/framer-motion/')) return 'vendor-motion'
          if (normalized.includes('/socket.io-client/') || normalized.includes('/engine.io-client/')) return 'vendor-socket'
          if (normalized.includes('/react-router/')) return 'vendor-router'
          if (normalized.includes('/@reduxjs/') || normalized.includes('/redux/') || normalized.includes('/react-redux/')) return 'vendor-state'
          if (normalized.includes('/react-dom/') || normalized.includes('/react/')) return 'vendor-react'

          return 'vendor'
        },
      },
    },
  },
})
