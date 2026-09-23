import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ['@genoffice/i18n', '@genoffice/electron-utils', '@genoffice/idml-engine'],
      }),
    ],
  },
  preload: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ['@genoffice/i18n', '@genoffice/electron-utils', '@genoffice/idml-engine'],
      }),
    ],
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        '@genoffice/idml-engine': resolve(__dirname, '../../packages/idml-engine/src/index.ts'),
      },
    },
    server: {
      port: Number(process.env.IDML_DEV_PORT) || 5180,
      strictPort: Boolean(process.env.IDML_DEV_PORT),
    },
  },
})
