import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import HomePage from './pages/HomePage'
import MapView from './pages/MapView'
import RoutePlanner from './pages/RoutePlanner'
import PlaceGallery from './pages/PlaceGallery'
import AIChat from './pages/AIChat'
import TripPlan from './pages/TripPlan'
import PitfallArchive from './pages/PitfallArchive'
import AppSettings from './pages/AppSettings'
import { useTripStore } from './store/tripStore'

export default function App() {
  const loadData = useTripStore((s) => s.loadData)

  useEffect(() => {
    loadData()
  }, [loadData])

  // 进入网站时主动请求定位权限，让浏览器弹出授权对话框
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {}, // 用户允许
        () => {}, // 用户拒绝或出错，不处理
        { enableHighAccuracy: false, timeout: 5000 },
      )
    }
  }, [])

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/*" element={
        <MainLayout>
          <Routes>
            <Route path="map" element={<MapView />} />
            <Route path="route" element={<RoutePlanner />} />
            <Route path="places" element={<PlaceGallery />} />
            <Route path="ai" element={<AIChat />} />
            <Route path="plan" element={<TripPlan />} />
            <Route path="pitfalls" element={<PitfallArchive />} />
            <Route path="settings" element={<AppSettings />} />
          </Routes>
        </MainLayout>
      } />
    </Routes>
  )
}
