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
  // Build configuration ko default par chhod dein
  build: {
    // Agar recharts jaisi heavy library ko alag karna hi hai, to sirf use karein,
    // baaki state aur router ko default chunk mein rehne dein.
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Recharts & D3 libraries - used for dashboard analytics
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }
          // Framer Motion - used throughout the app for animations
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          // Socket.io - used for real-time chat and presence
          if (id.includes('node_modules/socket.io-client')) {
            return 'vendor-socket';
          }
          // Baaki sab kuch default chunking par chhod dein
        }
      }
    }
  }
})