import { create } from 'zustand'
import type { Spot, TravelMode, AppSettings } from '../types'

interface TripStore {
  selected: Spot | null
  wishlist: string[]
  filter: 'all' | 'station' | 'play' | 'food' | 'rainy'
  search: string
  mode: TravelMode
  settings: AppSettings
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
}

export const useTripStore = create<TripStore>((set) => ({
  selected: null,
  wishlist: [],
  filter: 'all',
  search: '',
  mode: 'driving',
  settings: { showPitfalls: false, useAI: true, useLocation: false },
  setSelected: (s) => set({ selected: s }),
  toggleWish: (id) => set((s) => ({
    wishlist: s.wishlist.includes(id) ? s.wishlist.filter((x) => x !== id) : [...s.wishlist, id],
  })),
  removeWish: (id) => set((s) => ({ wishlist: s.wishlist.filter((x) => x !== id) })),
  setWishlist: (ids) => set({ wishlist: ids }),
  reorderWish: (from, to) => set((s) => {
    const a = [...s.wishlist]; const [r] = a.splice(from, 1); a.splice(to, 0, r); return { wishlist: a }
  }),
  clearWish: () => set({ wishlist: [] }),
  setFilter: (f) => set({ filter: f }),
  setSearch: (q) => set({ search: q }),
  setMode: (m) => set({ mode: m }),
  patchSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
}))
