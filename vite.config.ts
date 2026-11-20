/// <reference types="vitest/config" />
import mdx from '@mdx-js/rollup'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import remarkGfm from 'remark-gfm'
import { defineConfig } from 'vite'

// GitHub Pages serves the app under /PCEP101/; the deploy workflow sets BASE_PATH.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [{ enforce: 'pre', ...mdx({ remarkPlugins: [remarkGfm] }) }, react({ include: /\.(mdx|tsx?)$/ }), tailwindcss()],
  build: {
    // The lessons are one ~670 kB chunk (~125 kB gzipped), loaded only on Learn
    // pages, because the lesson index needs every lesson's meta.
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
})
