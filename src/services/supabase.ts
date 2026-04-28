import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mzfeqmaaqpllgehishai.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16ZmVxbWFhcXBsbGdlaGlzaGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNjQxNjMsImV4cCI6MjA5Mjk0MDE2M30.T8fNfeK2bgqy67bmcUoCkvl6ZXPwlY-SfwNKCEQXN0E'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 获取所有景点
export async function fetchSpots() {
  const { data, error } = await supabase.from('spots').select('*').order('name')
  if (error) throw error
  return data.map((s: any) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    type: s.type,
    priority: s.priority,
    address: s.address,
    lng: s.lng,
    lat: s.lat,
    tags: s.tags ?? [],
    bestTime: s.best_time ?? '',
    note: s.note ?? '',
    rating: s.rating ?? 3,
  }))
}

// 获取所有避坑数据
export async function fetchPitfalls() {
  const { data, error } = await supabase.from('pitfalls').select('*').order('name')
  if (error) throw error
  return data.map((p: any) => ({
    id: p.id,
    name: p.name,
    reason: p.reason,
    risks: p.risks ?? [],
    status: p.status,
    canRetry: p.can_retry ?? false,
  }))
}

// 获取收藏（按 session_id）
export async function fetchWishlist(sessionId: string) {
  const { data, error } = await supabase
    .from('wishlists')
    .select('spot_ids')
    .eq('session_id', sessionId)
    .single()
  if (error && error.code !== 'PGRST116') throw error // PGRST116 = 无记录
  return data?.spot_ids ?? []
}

// 保存收藏
export async function saveWishlist(sessionId: string, spotIds: string[]) {
  const { error } = await supabase
    .from('wishlists')
    .upsert({ session_id: sessionId, spot_ids: spotIds, updated_at: new Date().toISOString() })
  if (error) throw error
}
