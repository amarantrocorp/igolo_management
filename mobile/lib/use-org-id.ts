import { useAuthStore } from "../features/auth/store";

/**
 * Returns the active org ID for use in query keys.
 * Every query key should include this value so that TanStack Query
 * maintains separate caches per tenant and never shows stale data
 * from a different organization.
 */
export function useOrgId(): string | null {
  return useAuthStore((s) => s.activeOrgId);
}
