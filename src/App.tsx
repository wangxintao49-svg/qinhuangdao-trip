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
import AIBot from './components/AIBot'

export default function App() {
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
          <AIBot />
        </MainLayout>
      } />
    </Routes>
  )
}
