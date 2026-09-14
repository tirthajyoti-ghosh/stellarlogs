import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        // the ships-and-drives judging bench (his ask 2026-09-14)
        ships: resolve(__dirname, 'ships.html'),
      },
    },
  },
})
