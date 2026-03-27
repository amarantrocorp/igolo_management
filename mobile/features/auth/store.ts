import { create } from "zustand";
import api from "../../lib/api";
import { queryClient } from "../../lib/query-client";
import {
  setToken,
  setRefreshToken,
  clearTokens,
  getToken,
  getRefreshToken,
  setUserData,
  getUserData,
  setActiveOrgId,
  getActiveOrgId,
  setActiveOrgSlug,
  getActiveOrgSlug,
  setOrganizations,
  getOrganizations,
} from "../../lib/storage";
import type { User, UserRole, OrgMembership } from "../../types";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  activeOrgId: string | null;
  activeOrgSlug: string | null;
  activeOrgName: string | null;
  roleInOrg: UserRole | null;
  organizations: OrgMembership[];
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  login: (
    token: string,
    refreshToken: string | null,
    user: User,
    activeOrgId?: string,
    roleInOrg?: UserRole,
    organizations?: OrgMembership[]
  ) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
  selectOrg: (orgId: string) => Promise<void>;
}

/**
 * Derive the org slug for a given orgId from the organizations list.
 */
function findOrgSlug(
  organizations: OrgMembership[],
  orgId: string | undefined | null
): string | null {
  if (!orgId) return null;
  const target = organizations.find((o) => o.org_id === orgId);
  return target?.org_slug ?? null;
}

function findOrgName(
  organizations: OrgMembership[],
  orgId: string | undefined | null
): string | null {
  if (!orgId) return null;
  const target = organizations.find((o) => o.org_id === orgId);
  return target?.org_name ?? null;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  activeOrgId: null,
  activeOrgSlug: null,
  activeOrgName: null,
  roleInOrg: null,
  organizations: [],
  isHydrated: false,

  hydrate: async () => {
    try {
      // Wrap each SecureStore read individually so a single corrupted
      // key doesn't prevent the rest from loading (Fix #4).
      let token: string | null = null;
      let refreshToken: string | null = null;
      let userData: string | null = null;
      let orgId: string | null = null;
      let orgSlug: string | null = null;
      let orgsData: string | null = null;

      try { token = await getToken(); } catch { /* corrupted — ignore */ }
      try { refreshToken = await getRefreshToken(); } catch { /* corrupted — ignore */ }
      try { userData = await getUserData(); } catch { /* corrupted — ignore */ }
      try { orgId = await getActiveOrgId(); } catch { /* corrupted — ignore */ }
      try { orgSlug = await getActiveOrgSlug(); } catch { /* corrupted — ignore */ }
      try { orgsData = await getOrganizations(); } catch { /* corrupted — ignore */ }

      // Parse JSON fields safely — corrupted data falls back to defaults
      let user: User | null = null;
      try {
        user = userData ? JSON.parse(userData) : null;
      } catch {
        // Corrupted user data — clear it
        await setUserData("").catch(() => {});
      }

      let organizations: OrgMembership[] = [];
      try {
        organizations = orgsData ? JSON.parse(orgsData) : [];
      } catch {
        // Corrupted orgs data — clear it
        await setOrganizations("").catch(() => {});
      }

      const target = organizations.find((o) => o.org_id === orgId);

      set({
        token,
        refreshToken,
        user,
        activeOrgId: orgId,
        activeOrgSlug: orgSlug ?? findOrgSlug(organizations, orgId),
        activeOrgName: findOrgName(organizations, orgId),
        roleInOrg: target?.role ?? null,
        organizations,
        isHydrated: true,
      });
    } catch {
      // Total failure — start fresh
      await clearTokens().catch(() => {});
      set({ isHydrated: true });
    }
  },

  login: async (
    token,
    refreshTokenVal,
    user,
    activeOrgIdVal,
    roleInOrg,
    organizations
  ) => {
    const orgs = organizations ?? [];
    const slug = findOrgSlug(orgs, activeOrgIdVal);
    const orgName = findOrgName(orgs, activeOrgIdVal);

    await Promise.all([
      setToken(token),
      refreshTokenVal ? setRefreshToken(refreshTokenVal) : Promise.resolve(),
      setUserData(JSON.stringify(user)),
      activeOrgIdVal ? setActiveOrgId(activeOrgIdVal) : Promise.resolve(),
      slug ? setActiveOrgSlug(slug) : Promise.resolve(),
      setOrganizations(JSON.stringify(orgs)),
    ]);

    set({
      token,
      refreshToken: refreshTokenVal ?? null,
      user,
      activeOrgId: activeOrgIdVal ?? null,
      activeOrgSlug: slug,
      activeOrgName: orgName,
      roleInOrg: roleInOrg ?? null,
      organizations: orgs,
    });
  },

  logout: async () => {
    // Clear ALL persisted credentials and cached server data
    await clearTokens();
    queryClient.clear();

    set({
      token: null,
      refreshToken: null,
      user: null,
      activeOrgId: null,
      activeOrgSlug: null,
      roleInOrg: null,
      organizations: [],
    });
  },

  setUser: async (user: User) => {
    await setUserData(JSON.stringify(user));
    set({ user });
  },

  switchOrg: async (orgId: string) => {
    const { data } = await api.post<{
      access_token: string;
      refresh_token: string;
    }>("/auth/switch-org", { org_id: orgId });

    const orgs = get().organizations;
    const target = orgs.find((o) => o.org_id === orgId);
    const slug = target?.org_slug ?? null;

    await Promise.all([
      setToken(data.access_token),
      setRefreshToken(data.refresh_token),
      setActiveOrgId(orgId),
      slug ? setActiveOrgSlug(slug) : Promise.resolve(),
    ]);

    // Invalidate ALL cached queries so data from the previous org is not displayed
    queryClient.clear();

    set({
      token: data.access_token,
      refreshToken: data.refresh_token,
      activeOrgId: orgId,
      activeOrgSlug: slug,
      roleInOrg: target?.role ?? get().roleInOrg,
    });
  },

  selectOrg: async (orgId: string) => {
    const { data } = await api.post<{
      access_token: string;
      refresh_token: string;
    }>("/auth/select-org", { org_id: orgId });

    const orgs = get().organizations;
    const target = orgs.find((o) => o.org_id === orgId);
    const slug = target?.org_slug ?? null;

    await Promise.all([
      setToken(data.access_token),
      setRefreshToken(data.refresh_token),
      setActiveOrgId(orgId),
      slug ? setActiveOrgSlug(slug) : Promise.resolve(),
    ]);

    // Clear caches for the new org context
    queryClient.clear();

    set({
      token: data.access_token,
      refreshToken: data.refresh_token,
      activeOrgId: orgId,
      activeOrgSlug: slug,
      roleInOrg: target?.role ?? null,
    });
  },
}));
