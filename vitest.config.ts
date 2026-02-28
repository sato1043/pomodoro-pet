import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __APP_ID__: JSON.stringify(''),
    __HEARTBEAT_URL__: JSON.stringify(''),
    __STORE_URL__: JSON.stringify(''),
    __DEBUG_LICENSE__: JSON.stringify(''),
  },
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
