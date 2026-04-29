/** 工具函数：两点间距离计算与费用估算 */

const R = 6371 // 地球半径（km）

/** Haversine 公式计算两点直线距离（km） */
export function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** 预估驾车时长（分钟），按市区均速 30km/h */
export function estDriveTime(distKm: number): number {
  return Math.round(distKm / 30 * 60)
}

/** 预估打车费用（元）：起步¥8 + ¥2.5/km（超过2km） */
export function estTaxiFare(distKm: number): number {
  if (distKm <= 2) return 8
  return Math.round(8 + (distKm - 2) * 2.5)
}

/** 步行时长（分钟），按 5km/h */
export function estWalkTime(distKm: number): number {
  return Math.round(distKm / 5 * 60)
}

/** 骑行时长（分钟），按 15km/h */
export function estRideTime(distKm: number): number {
  return Math.round(distKm / 15 * 60)
}

/** 公交时长（分钟），按 20km/h + 等车 */
export function estTransitTime(distKm: number): number {
  return Math.round(distKm / 20 * 60 + 15)
}

/** 解码 polyline（支持 REST API 的增量编码 和 TMap SDK 的 {lat,lng}[] 两种格式） */
export function decodeDirectionPolyline(data: number[] | Array<{ lat: number; lng: number }>): Array<{ lat: number; lng: number }> {
  if (!data || !data.length) return []
  // TMap SDK 返回的已解密格式
  if (typeof data[0] === 'object' && data[0] !== null) {
    return (data as Array<any>).map(p => ({ lat: p.lat, lng: p.lng }))
  }
  // flat number[] 增量编码格式
  const nums = data as number[]
  const pts: Array<{ lat: number; lng: number }> = []
  if (nums.length < 2) return pts
  let lat = nums[0], lng = nums[1]
  pts.push({ lat, lng })
  for (let i = 2; i < nums.length - 1; i += 2) {
    lat += nums[i] * 0.000001
    lng += nums[i + 1] * 0.000001
    pts.push({ lat, lng })
  }
  return pts
}

/** 生成弯曲路径（降级方案） */
export function generateCurvedPath(lat1: number, lng1: number, lat2: number, lng2: number): Array<{ lat: number; lng: number }> {
  const pts: Array<{ lat: number; lng: number }> = []
  const dx = lng2 - lng1
  const dy = lat2 - lat1
  const len = Math.sqrt(dx * dx + dy * dy)
  const offset = Math.min(len * 0.15, 0.04)
  const nx = -dy / len * offset
  const ny = dx / len * offset
  const steps = 16
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const t1 = 1 - t
    const curve = Math.sin(t * Math.PI)
    pts.push({
      lat: lat1 * t1 + lat2 * t + nx * curve,
      lng: lng1 * t1 + lng2 * t + ny * curve,
    })
  }
  return pts
}
