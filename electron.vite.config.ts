import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import pkg from './package.json'

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd())

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      __APP_ID__: JSON.stringify(pkg.build?.appId ?? ''),
      __HEARTBEAT_URL__: JSON.stringify(process.env.HEARTBEAT_URL || env.VITE_HEARTBEAT_URL || ''),
      __STORE_URL__: JSON.stringify(process.env.STORE_URL || env.VITE_STORE_URL || 'https://www.updater.cc'),
      __DEBUG_LICENSE__: JSON.stringify(env.VITE_DEBUG_LICENSE || ''),
    },
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
    plugins: [react(), vanillaExtractPlugin()],
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
