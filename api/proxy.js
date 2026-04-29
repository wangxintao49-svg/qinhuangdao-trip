// Vercel Serverless Function — 代理腾讯地图 API
const TENCENT_KEY = process.env.VITE_TENCENT_KEY || 'Z7ZBZ-LIIKZ-FAIXT-7FPTG-4EYWS-LDFXH'
const API_BASE = 'https://apis.map.qq.com'

export default async function handler(req, res) {
  // 从 proxyPath 查询参数或 URL 路径中提取目标 API 路径
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  let apiPath = u.searchParams.get('proxyPath') || ''

  if (apiPath) {
    // 重建完整的 query string（包括原始请求的参数和 proxyPath）
    const originalParams = new URLSearchParams()
    for (const [k, v] of u.searchParams) {
      if (k !== 'proxyPath') originalParams.set(k, v)
    }
    const qs = originalParams.toString()
    apiPath = apiPath + (qs ? '?' + qs : '')
  } else {
    apiPath = req.url.replace(/^\/api\/proxy\//, '').replace(/^\/api\/proxy/, '')
  }
  // 去掉开头的 /
  apiPath = apiPath.replace(/^\/+/, '')
  // 去掉客户端传的 key（服务端统一注入）
  const qIdx = apiPath.indexOf('?')
  if (qIdx !== -1) {
    const params = new URLSearchParams(apiPath.slice(qIdx))
    params.delete('key')
    const qs = params.toString()
    apiPath = apiPath.slice(0, qIdx) + (qs ? '?' + qs : '')
  }

  const url = `${API_BASE}/${apiPath}${apiPath.includes('?') ? '&' : '?'}key=${TENCENT_KEY}`
  try {
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Qinhuangdao-Trip/1.0' },
    })
    const text = await resp.text()
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(resp.status).send(text)
  } catch (e) {
    res.status(500).json({ status: -1, message: 'proxy error', detail: e.message })
  }
}
