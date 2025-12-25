import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import LivePage from './pages/LivePage'
import SermonsPage from './pages/SermonsPage'
import AgendaPage from './pages/AgendaPage'
import NotificationsPage from './pages/NotificationsPage'
import MerAIPage from './pages/MerAIPage'
import MinistriesPage from './pages/MinistriesPage'
import AcademyPage from './pages/AcademyPage'
import CommunityPage from './pages/CommunityPage'
import TreasuryPage from './pages/TreasuryPage'
import PrayerPage from './pages/PrayerPage'
import CounselingPage from './pages/CounselingPage'
import AboutPage from './pages/AboutPage'
import SettingsPage from './pages/SettingsPage'
import DashboardPage from './pages/DashboardPage'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'

function App() {
  const { user, loading } = useAuth()

  // ✅ Aplica o tema global no <html> logo no carregamento
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = storedTheme || (prefersDark ? 'dark' : 'light')

    const root = document.documentElement
    root.classList.remove('light', 'dark') // limpa qualquer estado anterior
    root.classList.add(theme)              // aplica 'light' ou 'dark'
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route
          path="/auth"
          element={!user ? <AuthPage /> : <Navigate to={user.role === 'admin' ? '/dashboard' : '/home'} />}
        />
        <Route path="/home" element={user ? <HomePage /> : <Navigate to="/auth" />} />
        <Route path="/live" element={user ? <LivePage /> : <Navigate to="/auth" />} />
        <Route path="/sermons" element={user ? <SermonsPage /> : <Navigate to="/auth" />} />
        <Route path="/agenda" element={user ? <AgendaPage /> : <Navigate to="/auth" />} />
        <Route path="/notifications" element={user ? <NotificationsPage /> : <Navigate to="/auth" />} />
        <Route path="/ai" element={user ? <MerAIPage /> : <Navigate to="/auth" />} />
        <Route path="/ministries" element={user ? <MinistriesPage /> : <Navigate to="/auth" />} />
        <Route path="/academy" element={user ? <AcademyPage /> : <Navigate to="/auth" />} />
        <Route path="/community" element={user ? <CommunityPage /> : <Navigate to="/auth" />} />
        <Route path="/treasury" element={user ? <TreasuryPage /> : <Navigate to="/auth" />} />
        <Route path="/prayer" element={user ? <PrayerPage /> : <Navigate to="/auth" />} />
        <Route path="/counseling" element={user ? <CounselingPage /> : <Navigate to="/auth" />} />
        <Route path="/about" element={user ? <AboutPage /> : <Navigate to="/auth" />} />
        <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/auth" />} />
        <Route path="/dashboard" element={user?.role === 'admin' ? <DashboardPage /> : <Navigate to="/home" />} />
        <Route path="/" element={<Navigate to={user ? (user.role === 'admin' ? '/dashboard' : '/home') : '/auth'} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App