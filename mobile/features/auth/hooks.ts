import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuthStore } from "./store";

/**
 * Returns auth state and convenience flags.
 */
export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const activeOrgSlug = useAuthStore((s) => s.activeOrgSlug);
  const activeOrgName = useAuthStore((s) => s.activeOrgName);
  const roleInOrg = useAuthStore((s) => s.roleInOrg);
  const organizations = useAuthStore((s) => s.organizations);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const switchOrg = useAuthStore((s) => s.switchOrg);

  return {
    token,
    user,
    activeOrgId,
    activeOrgSlug,
    activeOrgName,
    roleInOrg,
    organizations,
    isHydrated,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    switchOrg,
  };
}

/**
 * Redirects to /login if the user is not authenticated.
 * Must be used inside a component rendered within an expo-router navigator.
 */
export function useRequireAuth() {
  const { isAuthenticated, isHydrated } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/");
    }
  }, [isAuthenticated, isHydrated, segments]);
}
