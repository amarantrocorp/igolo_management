"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User } from "@/types"

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: User | null
  login: (token: string, refreshToken: string, user: User) => void
  logout: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,

      login: (token: string, refreshToken: string, user: User) => {
        set({ token, refreshToken, user })
      },

      logout: () => {
        set({ token: null, refreshToken: null, user: null })
      },

      setUser: (user: User) => {
        set({ user })
      },
    }),
    {
      name: "int-design-erp-auth",
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
)
