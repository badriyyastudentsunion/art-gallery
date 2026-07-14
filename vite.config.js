import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'os'

function getLocalIp() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if ((iface.family === 'IPv4' || iface.family === 4) && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

const localIp = getLocalIp()

export default defineConfig({
  plugins: [react()],
  server: {
    host: true
  },
  define: {
    __DEV_IP__: JSON.stringify(localIp)
  }
})
