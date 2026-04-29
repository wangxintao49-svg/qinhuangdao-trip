// 腾讯地图 SDK 类型声明
declare namespace TMap {
  class Map {
    constructor(el: HTMLElement, opts: {
      center: LatLng
      zoom: number
      mapStyleId?: string
      baseMap?: { type: string; features?: string[] }
    })
    setCenter(center: LatLng): void
    setZoom(zoom: number): void
    fitBounds(bounds: LatLngBounds): void
    project(pos: LatLng): { x: number; y: number }
    on(event: string, fn: () => void): void
    off(event: string, fn: () => void): void
    getCenter(): LatLng
    getZoom(): number
  }
  class LatLng {
    constructor(lat: number, lng: number)
  }
  class DOMOverlay {
    constructor(opts: { map: Map; position: LatLng; content: string | HTMLElement; offset?: { x: number; y: number } })
    destroy(): void
    setMap(map: Map | null): void
    setPosition(pos: LatLng): void
    setContent(content: string | HTMLElement): void
    on(event: string, fn: (e: any) => void): void
  }
  class CircleStyle {
    constructor(opts: { color: string; strokeColor: string; strokeWidth: number; opacity: number })
  }
  class MultiCircle {
    constructor(opts: { map: Map; styles: Record<string, CircleStyle>; geometries: Array<{ styleId: string; center: LatLng; radius: number }> })
    setMap(map: Map | null): void
    setGeometries(geos: Array<{ styleId: string; center: LatLng; radius: number }>): void
  }
  class TrafficLayer {
    constructor(opts: { map: Map })
    setMap(map: Map | null): void
  }
  class LatLngBounds {
    extend(pos: LatLng): void
    getCenter(): LatLng
  }
  class MarkerStyle {
    constructor(opts: { width: number; height: number; anchor: { x: number; y: number }; color: string })
  }
  class MultiMarker {
    constructor(opts: { map: Map; styles: Record<string, MarkerStyle>; geometries: unknown[] })
    on(event: string, fn: (e: { geometry: { id: string } }) => void): void
    setMap(map: Map | null): void
  }
  class LabelStyle {
    constructor(opts: {
      color?: string; size?: number; backgroundColor?: string; borderRadius?: number
      borderColor?: string; borderWidth?: number; padding?: string; opacity?: number
    })
  }
  class MultiLabel {
    constructor(opts: { map: Map; styles: Record<string, LabelStyle>; geometries: unknown[] })
    setMap(map: Map | null): void
  }
  class InfoWindow {
    constructor(opts: { map: Map; position: LatLng; content: string; offset: { x: number; y: number }; closeWhenOtherOpen?: boolean })
    destroy(): void
    close(): void
  }
  class PolylineStyle {
    constructor(opts: { color: string; width: number; borderWidth?: number; borderColor?: string })
  }
  class MultiPolyline {
    constructor(opts: { map: Map; styles: Record<string, PolylineStyle>; geometries: Array<{ id: string; styleId: string; paths: LatLng[][] }> })
    setMap(map: Map | null): void
  }
  namespace services {
    interface DirectionWayPoint { lat: number; lng: number }
    interface DirectionRoute {
      distance: number   // 米
      duration: number   // 秒
      polyline: number[]
      price?: number     // 分（公交/地铁票价）
      steps?: Array<{
        mode: string
        distance: number
        duration: number
        polyline: number[]
        direction?: string
        steps?: Array<{ instruction: string; distance: number }>
        lines?: Array<{
          title: string
          station_count: number
          distance: number
          duration: number
          polyline: number[]
          geton?: { title: string }
          getoff?: { title: string }
          stations?: Array<{ title: string }>
        }>
      }>
    }
    interface DirectionResult {
      status: number
      message?: string
      result?: { routes: DirectionRoute[] }
    }
    class Direction {
      constructor()
      request(opts: {
        from: LatLng | string
        to: LatLng | string
        mode?: 'driving' | 'walking' | 'bicycling' | 'transit'
        policy?: string
        success?: (result: DirectionResult) => void
        fail?: (err: Error) => void
      }): void
    }
  }
}

interface Window {
  TMap: typeof TMap
}
