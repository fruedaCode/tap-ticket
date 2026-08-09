import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'], passWithNoTests: true },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // real 'server-only' throws on import outside an RSC — see the stub
      'server-only': path.resolve(__dirname, 'tests/stubs/server-only.ts'),
    },
  },
})
