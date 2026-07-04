import { create } from 'zustand'
import { AuthUser } from '../types'

interface AuthStore {
  user: AuthUser | null
  loading: boolean
  login: (user: AuthUser) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  updateUser: (updates: Partial<AuthUser>) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  login: (user) => set({ user, loading: false }),
  logout: () => set({ user: null, loading: false }),
  setLoading: (loading) => set({ loading }),
  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),
}))
