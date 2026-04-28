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

  setWishlist: (ids) => set({ wishlist: ids }),
  reorderWish: (from, to) => set((s) => {
    const a = [...s.wishlist]
    const [r] = a.splice(from, 1)
    a.splice(to, 0, r)
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

  // 从 Supabase 加载数据
  loadData: async () => {
    try {
      const [spots, pitfalls, wishlist] = await Promise.all([
        fetchSpots(),
        fetchPitfalls(),
        fetchWishlist(getSessionId()),
      ])
      set({ spots, pitfalls, wishlist, dataLoaded: true })
    } catch {
      // 失败则继续使用静态 fallback 数据
      set({ dataLoaded: true })
    }
  },

  persistWishlist: async () => {
    try {
      await saveWishlist(getSessionId(), get().wishlist)
    } catch {}
  },
}))
