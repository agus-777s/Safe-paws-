import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

// La app y el SQL calculan días de calendario en hora de Chile.
process.env.TZ = 'America/Santiago'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 60000,
  },
})
