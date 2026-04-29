// Electron 主进程 — 本地 Express 服务 + 浏览器窗口
const { app, BrowserWindow } = require('electron')
const express = require('express')
const path = require('path')
const { readFileSync } = require('fs')

const PORT = 3000
const isDev = process.env.NODE_ENV === 'development'

let mainWindow
let server

function startServer() {
  return new Promise((resolve) => {
    const srv = express()

    // 静态文件
    srv.use(express.static(path.join(__dirname, '..', 'dist')))
    srv.use(express.urlencoded({ extended: true }))

    // 腾讯地图 API 代理
    srv.use('/api/proxy', async (req, res) => {
      const TENCENT_KEY = process.env.VITE_TENCENT_KEY
      if (!TENCENT_KEY) return res.status(500).json({ status: -1, message: '缺少 VITE_TENCENT_KEY' })
      let apiPath = req.url.replace(/^\//, '')
      apiPath = apiPath.replace(/[?&]key=[^&]+/g, '')
      const sep = apiPath.includes('?') ? '&' : '?'
      try {
        const resp = await fetch(`https://apis.map.qq.com/${apiPath}${sep}key=${TENCENT_KEY}`, {
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

    // 百度语音认证代理
    srv.use('/baidu-auth', async (req, res) => {
      const apiPath = req.url.replace(/^\//, '')
      try {
        const resp = await fetch(`https://aip.baidubce.com/${apiPath}`)
        const text = await resp.text()
        res.status(resp.status).send(text)
      } catch (e) {
        res.status(500).json({ status: -1, message: 'baidu auth proxy error', detail: e.message })
      }
    })

    // 百度语音合成代理
    srv.use('/baidu-tts', async (req, res) => {
      const apiPath = req.url.replace(/^\//, '')
      try {
        const body = req.method === 'POST' ? new URLSearchParams(req.body).toString() : undefined
        const resp = await fetch(`https://tsn.baidu.com/${apiPath}`, {
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

    // SPA fallback
    srv.use((req, res) => {
      try {
        const html = readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf-8')
        res.set('Content-Type', 'text/html; charset=utf-8')
        res.send(html)
      } catch {
        res.status(500).send('请先运行 npm run build 构建前端')
      }
    })

    server = srv.listen(PORT, () => {
      console.log(`✅ 本地服务: http://localhost:${PORT}`)
      resolve()
    })
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    show: false,
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
  })

  mainWindow.loadURL(`http://localhost:${PORT}`)
  mainWindow.once('ready-to-show', () => mainWindow.show())

  // 开发模式打开 DevTools
  if (isDev) mainWindow.webContents.openDevTools()

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(async () => {
  await startServer()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (!mainWindow) createWindow()
})

// 退出时关闭服务
app.on('will-quit', () => {
  if (server) server.close()
})
