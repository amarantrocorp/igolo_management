"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import api from "@/lib/api"
import type { User, UserRole, OrgMembership } from "@/types"

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: User | null
  activeOrgId: string | null
  roleInOrg: UserRole | null
  organizations: OrgMembership[]
  login: (
    token: string,
    refreshToken: string | null,
    user: User,
    activeOrgId?: string,
    roleInOrg?: UserRole,
    organizations?: OrgMembership[],
  ) => void
  logout: () => void
  setUser: (user: User) => void
  switchOrg: (orgId: string) => Promise<void>
  selectOrg: (orgId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      activeOrgId: null,
      roleInOrg: null,
      organizations: [],

      login: (token, refreshToken, user, activeOrgId, roleInOrg, organizations) => {
        set({
          token,
          refreshToken,
          user,
          activeOrgId: activeOrgId ?? null,
          roleInOrg: roleInOrg ?? null,
          organizations: organizations ?? [],
        })
      },

      logout: () => {
        set({
          token: null,
          refreshToken: null,
          user: null,
          activeOrgId: null,
          roleInOrg: null,
          organizations: [],
        })
      },

      setUser: (user: User) => {
        set({ user })
      },

      switchOrg: async (orgId: string) => {
        const { data } = await api.post<{ access_token: string; refresh_token: string }>(
          "/auth/switch-org",
          { org_id: orgId },
        )
        const orgs = get().organizations
        const target = orgs.find((o) => o.org_id === orgId)
        set({
          token: data.access_token,
          refreshToken: data.refresh_token,
          activeOrgId: orgId,
          roleInOrg: target?.role ?? get().roleInOrg,
        })
      },

      selectOrg: async (orgId: string) => {
        const { data } = await api.post<{ access_token: string; refresh_token: string }>(
          "/auth/select-org",
          { org_id: orgId },
        )
        set({
          token: data.access_token,
          refreshToken: data.refresh_token,
          activeOrgId: orgId,
        })
      },
    }),
    {
      name: "int-design-erp-auth",
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        activeOrgId: state.activeOrgId,
        roleInOrg: state.roleInOrg,
        organizations: state.organizations,
      }),
    },
  ),
)
