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
  })

  mainWindow.loadURL(`http://localhost:${PORT}`)
  mainWindow.once('ready-to-show', () => mainWindow.show())

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

app.on('will-quit', () => {
  if (server) server.close()
})
