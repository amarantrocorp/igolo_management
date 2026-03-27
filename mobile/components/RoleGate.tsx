import React from "react";
import { usePermission, type Permission } from "../lib/role-guard";

interface RoleGateProps {
  /** The permission the current user must have for children to render. */
  permission: Permission;
  /** Optional fallback rendered when the user lacks the permission. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Conditionally renders children only when the current user's role
 * satisfies the requested permission.
 *
 * Usage:
 *   <RoleGate permission="canManageFinance">
 *     <VerifyButton />
 *   </RoleGate>
 */
export default function RoleGate({
  permission,
  fallback = null,
  children,
}: RoleGateProps) {
  const allowed = usePermission(permission);
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
