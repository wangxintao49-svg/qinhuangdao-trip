// 地图标记图标（Canvas 生成 PNG，兼容腾讯地图 WebGL）

const CAT_CFG: Record<string, { color: string; symbol: string }> = {
  food:    { color: '#F59E0B', symbol: '吃' },
  play:    { color: '#10B981', symbol: '玩' },
  station: { color: '#3B82F6', symbol: '站' },
  rainy:   { color: '#8B5CF6', symbol: '雨' },
}

const cache = new Map<string, string>()

function drawCircle(canvas: HTMLCanvasElement, bg: string, symbol: string) {
  const s = canvas.width, c = s / 2, r = c - 3
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, s, s)
  // 圆形底
  ctx.beginPath()
  ctx.arc(c, c, r, 0, Math.PI * 2)
  ctx.fillStyle = bg
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 3
  ctx.stroke()
  // 阴影
  ctx.shadowColor = 'rgba(0,0,0,0.2)'
  ctx.shadowBlur = 4
  ctx.beginPath()
  ctx.arc(c, c, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  // 文字
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${r * 0.9}px "Microsoft YaHei",Arial,sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(symbol, c, c + 1)
}

function drawHouse(canvas: HTMLCanvasElement) {
  const s = canvas.width, c = s / 2
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, s, s)
  // 蓝色圆形 + 阴影
  ctx.shadowColor = 'rgba(0,0,0,0.2)'
  ctx.shadowBlur = 3
  ctx.beginPath()
  ctx.arc(c, c, c - 2, 0, Math.PI * 2)
  ctx.fillStyle = '#3B82F6'
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.stroke()
  // 白色房子
  ctx.fillStyle = '#fff'
  const hs = s * 0.4 // house size ratio
  const cx = c
  const by = c + hs * 0.55 // bottom y
  const ty = c - hs * 0.65 // top y (roof peak)
  const lx = c - hs
  const rx = c + hs
  ctx.beginPath()
  ctx.moveTo(lx, by)
  ctx.lineTo(lx, c)
  ctx.lineTo(cx, ty)
  ctx.lineTo(rx, c)
  ctx.lineTo(rx, by)
  ctx.lineTo(cx + hs * 0.3, by)
  ctx.lineTo(cx + hs * 0.3, c + hs * 0.05)
  ctx.lineTo(cx - hs * 0.3, c + hs * 0.05)
  ctx.lineTo(cx - hs * 0.3, by)
  ctx.closePath()
  ctx.fill()
}

/** 获取分类标记图标（缓存） */
export function getMarkerIcon(category: string): string {
  if (cache.has(category)) return cache.get(category)!
  const cfg = CAT_CFG[category]
  if (!cfg) return ''
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  drawCircle(canvas, cfg.color, cfg.symbol)
  const url = canvas.toDataURL('image/png')
  cache.set(category, url)
  return url
}

/** 获取分类颜色（回退方案） */
export function getMarkerColor(category: string): string {
  return CAT_CFG[category]?.color ?? '#6B7280'
}

/** 获取房子图标（缓存） */
export function getHouseIcon(): string {
  if (cache.has('_house')) return cache.get('_house')!
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  drawHouse(canvas)
  const url = canvas.toDataURL('image/png')
  cache.set('_house', url)
  return url
}
