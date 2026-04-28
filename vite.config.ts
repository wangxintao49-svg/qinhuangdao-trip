import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    host: true,
    proxy: {
      '/tencent-api': {
        target: 'https://apis.map.qq.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/tencent-api/, ''),
      },
      '/baidu-auth': {
        target: 'https://aip.baidubce.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/baidu-auth/, ''),
      },
      '/baidu-tts': {
        target: 'https://tsn.baidu.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/baidu-tts/, ''),
      },
    },
  },
})
