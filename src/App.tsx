import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from './hooks/useAuth'
import TestimoniesPage from './pages/TestimoniesPage'
import ResourcesPage from './pages/ResourcesPage'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
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
import { useAuthStore } from './stores/authStore'
import { supabase } from './lib/supabase'

function App() {
  const { user, loading } = useAuth()

  // ✅ Garante que o tema seja aplicado ao carregar a aplicação
  useEffect(() => {
    const applyInitialTheme = async () => {
      let themeMode: 'light' | 'dark' | 'system' = 'system'
      
      // Tenta obter do usuário logado
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('theme_mode')
          .eq('id', session.user.id)
          .single()
        
        if (profile?.theme_mode) {
          themeMode = profile.theme_mode as 'light' | 'dark' | 'system'
        }
      } else {
        // Sem usuário, usa localStorage ou padrão
        const stored = localStorage.getItem('theme')
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
          themeMode = stored as 'light' | 'dark' | 'system'
        }
      }

      // Aplica o tema no DOM
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      
      if (themeMode === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.classList.add(prefersDark ? 'dark' : 'light')
      } else {
        root.classList.add(themeMode)
      }
      
      localStorage.setItem('theme', themeMode)
    }

    applyInitialTheme()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6">
          <div className="inline-flex p-5 bg-gradient-to-br from-primary to-accent rounded-3xl shadow-2xl animate-pulse">
            <img
              src="https://cdn-ai.onspace.ai/onspace/files/XApskyyhcaqpHfkzKVPzqb/kairoslogo.png"
              alt="KAIRÓS Logo"
              className="w-20 h-20 object-contain"
            />
          </div>
          <p className="text-lg text-muted-foreground font-medium">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/home" /> : <AuthPage />} />
        <Route path="/auth" element={user ? <Navigate to="/home" /> : <AuthPage />} />
        <Route path="/home" element={user ? <HomePage /> : <Navigate to="/auth" />} />
        <Route path="/dashboard" element={user?.role === 'admin' ? <DashboardPage /> : <Navigate to="/home" />} />
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
        <Route path="/testimonies" element={user ? <TestimoniesPage /> : <Navigate to="/auth" />} />
        <Route path="/resources" element={user ? <ResourcesPage /> : <Navigate to="/auth" />} />
      </Routes>
      <Toaster position="top-center" richColors closeButton />
    </BrowserRouter>
  )
}

export default App
