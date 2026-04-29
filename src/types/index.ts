export type PlaceCategory = 'station' | 'play' | 'food' | 'rainy'
export type Priority = 'start' | 'end' | 'core' | 'backup'
export type RiskTag = '闭园风险' | '评价分歧' | '性价比低' | '偏离主线' | '体验风险' | '定位重复'
export type FinalStatus = '已删除' | '本次不考虑'
export type TravelMode = 'driving' | 'bicycling' | 'transit' | 'walking'

export interface Spot {
  id: string
  name: string
  category: PlaceCategory
  type: string
  priority: Priority
  address: string
  lng: number
  lat: number
  tags: string[]
  bestTime: string
  note: string
  rating: number
  intro?: string
  recommendation?: string
  caution?: string
  keywords?: string[]
  imageUrl?: string
  ratingText?: string
}

export interface Pitfall {
  id: string
  name: string
  reason: string
  risks: RiskTag[]
  status: FinalStatus
  canRetry: boolean
}

export interface RouteInfo {
  distance: number
  duration: number
  steps: RouteStep[]
}

export interface RouteStep {
  label: string
  dist: number
  time: number
}

export interface ChatMessage {
  role: 'user' | 'ai'
  text: string
}

export interface AppSettings {
  showPitfalls: boolean
  useAI: boolean
  useLocation: boolean
}

/** 多日行程中的一天 */
export interface DayPlan {
  id: string
  label: string
  items: DayItem[]
}

/** 一天的某个地点 */
export interface DayItem {
  spotId: string
  arrivalTime?: string
}

/** 每段出行方式 */
export interface SegmentMode {
  fromId: string
  toId: string
  mode: TravelMode
}
