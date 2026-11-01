/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

// BACH_BASE: '/bach/' for GitHub Pages, './' for a future native (Capacitor) build.
export default defineConfig({
  base: process.env.BACH_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
