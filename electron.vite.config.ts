import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { loadEnv } from 'vite'

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd())

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
    server: {
      port: Number(env.VITE_DEV_PORT) || 5173
    },
    build: {
      rollupOptions: {
        input: 'src/index.html'
      }
    }
  }
})
