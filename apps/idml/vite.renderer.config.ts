import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src/renderer',
  plugins: [react()],
  resolve: {
    alias: {
      '@genoffice/idml-engine': resolve(__dirname, '../../packages/idml-engine/src/index.ts'),
    },
  },
  server: {
    port: Number(process.env.IDML_DEV_PORT) || 5180,
    strictPort: true,
  },
})
