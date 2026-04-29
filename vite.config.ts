import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api/proxy': {
        target: 'https://apis.map.qq.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/proxy/, ''),
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
