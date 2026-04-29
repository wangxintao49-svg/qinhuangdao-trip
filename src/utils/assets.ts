// 静态资源路径解析（适配 Vite base 路径）
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export function imgUrl(path: string | undefined): string {
  if (!path || path.startsWith('http') || path.startsWith('data:')) return path || ''
  if (BASE && path.startsWith(BASE)) return path
  return BASE + path
}
