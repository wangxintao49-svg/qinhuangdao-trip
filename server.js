// Zeabur / Node.js 生产服务
// 提供前端静态文件 + API 代理（腾讯地图/百度TTS）+ SPA fallback

import express from 'express'
import { readFileSync } from 'fs'

const app = express()
const PORT = process.env.PORT || 3000

// 解析 URL-encoded body（百度 TTS POST 需要）
app.use(express.urlencoded({ extended: true }))

// 1. 前端静态文件
app.use(express.static('dist'))

// 2. 腾讯地图 API 代理（隐藏服务端 API Key）
app.use('/api/proxy', async (req, res) => {
  const TENCENT_KEY = process.env.VITE_TENCENT_KEY
  if (!TENCENT_KEY) return res.status(500).json({ status: -1, message: '缺少 VITE_TENCENT_KEY' })

  let apiPath = req.url.replace(/^\//, '').replace(/^\/+/, '')
  // 去除客户端传的 key（防止冲突）
  apiPath = apiPath.replace(/[?&]key=[^&]+/g, '')
  const sep = apiPath.includes('?') ? '&' : '?'
  const url = `https://apis.map.qq.com/${apiPath}${sep}key=${TENCENT_KEY}`

  try {
    const resp = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Qinhuangdao-Trip/1.0' },
    })
    const text = await resp.text()
    res.set('Content-Type', 'application/json')
    res.set('Access-Control-Allow-Origin', '*')
    res.status(resp.status).send(text)
  } catch (e) {
    res.status(500).json({ status: -1, message: 'proxy error', detail: e.message })
  }
})

// 3. 百度语音认证代理（OAuth token）
app.use('/baidu-auth', async (req, res) => {
  const apiPath = req.url.replace(/^\//, '')
  const url = `https://aip.baidubce.com/${apiPath}`
  try {
    const resp = await fetch(url)
    const text = await resp.text()
    res.status(resp.status).send(text)
  } catch (e) {
    res.status(500).json({ status: -1, message: 'baidu auth proxy error', detail: e.message })
  }
})

// 4. 百度语音合成代理（POST → 返回二进制音频）
app.use('/baidu-tts', async (req, res) => {
  const apiPath = req.url.replace(/^\//, '')
  const url = `https://tsn.baidu.com/${apiPath}`

  try {
    const body = req.method === 'POST' ? new URLSearchParams(req.body).toString() : undefined
    const resp = await fetch(url, {
      method: req.method,
      headers: body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {},
      body,
    })

    const contentType = resp.headers.get('Content-Type') || ''
    if (contentType.includes('json')) {
      const text = await resp.text()
      res.status(resp.status).json(JSON.parse(text))
    } else {
      const buf = Buffer.from(await resp.arrayBuffer())
      res.set('Content-Type', contentType)
      res.status(resp.status).send(buf)
    }
  } catch (e) {
    res.status(500).json({ status: -1, message: 'baidu tts proxy error', detail: e.message })
  }
})

// 5. SPA fallback — 所有非 API 路由返回 index.html
app.use((req, res) => {
  try {
    const html = readFileSync('dist/index.html', 'utf-8')
    res.set('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch {
    res.status(500).send('Server error: dist/index.html not found. Run "npm run build" first.')
  }
})

app.listen(PORT, () => {
  console.log(`✅ 服务已启动: http://localhost:${PORT}`)
})
