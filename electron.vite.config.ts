import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: 'desktop/main/index.ts'
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: 'desktop/preload/index.ts'
      }
    }
  },
  renderer: {
    root: 'src',
    publicDir: '../assets',
    build: {
      rollupOptions: {
        input: 'src/index.html'
      }
    }
  }
})
