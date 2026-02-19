import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/application/**'],
      reporter: ['text']
    }
  }
})
