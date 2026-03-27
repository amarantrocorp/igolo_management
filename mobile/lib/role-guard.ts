import { useAuthStore } from "../features/auth/store";
import type { UserRole } from "../types";

/**
 * Centralised permission map.
 * Each key describes a capability; the value lists the roles that have it.
 */
export const ROLE_PERMISSIONS = {
  canCreateLeads: ["BDE", "SALES", "MANAGER", "SUPER_ADMIN"] as UserRole[],
  canViewQuotes: ["SALES", "MANAGER", "SUPER_ADMIN"] as UserRole[],
  canManageFinance: ["MANAGER", "SUPER_ADMIN"] as UserRole[],
  canLogAttendance: ["SUPERVISOR", "MANAGER", "SUPER_ADMIN"] as UserRole[],
  canVerifyTransactions: ["MANAGER", "SUPER_ADMIN"] as UserRole[],
  canRecordPayment: ["MANAGER", "SUPER_ADMIN"] as UserRole[],
  canUpdateSprints: ["MANAGER", "SUPER_ADMIN"] as UserRole[],
  canMakeClientPayment: ["CLIENT"] as UserRole[],
  canConvertLeads: ["MANAGER", "SUPER_ADMIN"] as UserRole[],
  canApproveQuotes: ["MANAGER", "SUPER_ADMIN"] as UserRole[],
  canChangeLeadStatus: [
    "BDE",
    "SALES",
    "MANAGER",
    "SUPER_ADMIN",
  ] as UserRole[],
} as const;

export type Permission = keyof typeof ROLE_PERMISSIONS;

/**
 * Pure function — check whether a role has a given permission.
 */
export function hasPermission(
  role: UserRole | string | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  return (ROLE_PERMISSIONS[permission] as readonly string[]).includes(role);
}

/**
 * React hook — reads the current user's role from the auth store and
 * returns `true` when the role satisfies the requested permission.
 */
export function usePermission(permission: Permission): boolean {
  const roleInOrg = useAuthStore((s) => s.roleInOrg);
  return hasPermission(roleInOrg, permission);
}
