// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,          // This allows access from any network interface
    port: 5173,          // Optional: set a fixed port (default is 5173)
    allowedHosts: ['opq.jaitken.co.nz'],
  },
})
