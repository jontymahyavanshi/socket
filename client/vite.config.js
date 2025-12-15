import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// 1. Import the polyfill plugin
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({

  server: {
    host: true,
    port: 5173
  },
  plugins: [
    react(),
    // 2. Add the plugin here
    nodePolyfills({
      // Whether to polyfill `global` variable
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
  ],
})