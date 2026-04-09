import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  accessToken: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  setToken: (token: string) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,

  setAuth: (token: string, user: User) =>
    set({ accessToken: token, user, isAuthenticated: true }),

  setToken: (token: string) =>
    set({ accessToken: token }),

  setUser: (user: User) =>
    set({ user }),

  logout: () =>
    set({ accessToken: null, user: null, isAuthenticated: false }),
}))
