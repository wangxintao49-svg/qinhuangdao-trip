import { create } from 'zustand'
import type { Spot, Pitfall, TravelMode, AppSettings } from '../types'
import { fetchSpots, fetchPitfalls, fetchWishlist, saveWishlist } from '../services/supabase'
import { spots as fallbackSpots, pitfalls as fallbackPitfalls } from '../data/places'

// 生成或恢复会话 ID（用于标识用户收藏）
function getSessionId(): string {
  let id = localStorage.getItem('qhd_session_id')
  if (!id) {
    id = 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
    localStorage.setItem('qhd_session_id', id)
  }
  return id
}

const CUSTOM_SPOTS_KEY = 'qhd_custom_spots'

interface TripStore {
  selected: Spot | null
  wishlist: string[]
  filter: 'all' | 'station' | 'play' | 'food' | 'rainy'
  search: string
  mode: TravelMode
  settings: AppSettings
  spots: Spot[]
  pitfalls: Pitfall[]
  dataLoaded: boolean
  setSelected: (s: Spot | null) => void
  toggleWish: (id: string) => void
  setWishlist: (ids: string[]) => void
  removeWish: (id: string) => void
  reorderWish: (from: number, to: number) => void
  clearWish: () => void
  setFilter: (f: TripStore['filter']) => void
  setSearch: (s: string) => void
  setMode: (m: TravelMode) => void
  patchSettings: (p: Partial<AppSettings>) => void
  loadData: () => Promise<void>
  persistWishlist: () => Promise<void>
  addCustomSpot: (spot: Spot) => void
}

export const useTripStore = create<TripStore>((set, get) => ({
  selected: null,
  wishlist: [],
  filter: 'all',
  search: '',
  mode: 'driving',
  settings: { showPitfalls: false, useAI: true, useLocation: false },
  spots: fallbackSpots,
  pitfalls: fallbackPitfalls,
  dataLoaded: false,

  setSelected: (s) => set({ selected: s }),

  toggleWish: (id) => {
    const next = get().wishlist.includes(id)
      ? get().wishlist.filter((x) => x !== id)
      : [...get().wishlist, id]
    set({ wishlist: next })
    // 异步持久化
    saveWishlist(getSessionId(), next).catch(() => {})
  },

  removeWish: (id) => {
    const next = get().wishlist.filter((x) => x !== id)
    set({ wishlist: next })
    saveWishlist(getSessionId(), next).catch(() => {})
  },

  setWishlist: (ids) => {
    set({ wishlist: ids })
    saveWishlist(getSessionId(), ids).catch(() => {})
  },
  reorderWish: (from, to) => set((s) => {
    const a = [...s.wishlist]
    const [r] = a.splice(from, 1)
    a.splice(to, 0, r)
    saveWishlist(getSessionId(), a).catch(() => {})
    return { wishlist: a }
  }),

  clearWish: () => {
    set({ wishlist: [] })
    saveWishlist(getSessionId(), []).catch(() => {})
  },

  setFilter: (f) => set({ filter: f }),
  setSearch: (q) => set({ search: q }),
  setMode: (m) => set({ mode: m }),
  patchSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),

  // 从 Supabase 加载数据（Supabase 无数据/缺字段时回退本地数据）
  loadData: async () => {
    try {
      const [supabaseSpots, supabasePitfalls, wishlist] = await Promise.all([
        fetchSpots(),
        fetchPitfalls(),
        fetchWishlist(getSessionId()),
      ])
      let baseSpots: Spot[]
      if (supabaseSpots.length > 0) {
        baseSpots = supabaseSpots.map((s: Spot) => {
          const fb = fallbackSpots.find((f) => f.id === s.id)
          if (!fb) return s
          return { ...fb, ...s, imageUrl: s.imageUrl || fb.imageUrl || '', intro: s.intro || fb.intro || '', recommendation: s.recommendation || fb.recommendation || '', caution: s.caution || fb.caution || '', ratingText: s.ratingText || fb.ratingText || '', keywords: s.keywords?.length ? s.keywords : (fb.keywords ?? []) }
        })
      } else {
        baseSpots = fallbackSpots
      }
      // 合并用户自建地点
      try {
        const custom: Spot[] = JSON.parse(localStorage.getItem(CUSTOM_SPOTS_KEY) || '[]')
        if (custom.length) baseSpots = [...baseSpots, ...custom]
      } catch {}
      set({
        spots: baseSpots,
        pitfalls: supabasePitfalls.length > 0 ? supabasePitfalls : fallbackPitfalls,
        wishlist,
        dataLoaded: true,
      })
    } catch {
      set({ dataLoaded: true })
    }
  },

  persistWishlist: async () => {
    try {
      await saveWishlist(getSessionId(), get().wishlist)
    } catch {}
  },

  addCustomSpot: (spot: Spot) => {
    set((state) => {
      const existing: Spot[] = JSON.parse(localStorage.getItem(CUSTOM_SPOTS_KEY) || '[]')
      existing.push(spot)
      localStorage.setItem(CUSTOM_SPOTS_KEY, JSON.stringify(existing))
      return { spots: [...state.spots, spot] }
    })
  },
}))
