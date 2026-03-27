/**
 * Deep linking utilities for mapping backend notification data
 * to Expo Router navigation paths.
 */

/**
 * Given the `data` payload from a push notification, return the
 * Expo Router path the app should navigate to, or null if no
 * matching route exists.
 *
 * The backend Notification model provides `action_url` values like:
 *   /projects/123/approvals
 *   /crm/leads/abc
 *   /quotes/xyz
 *   /notifications
 */
export function getRouteFromNotification(
  data: Record<string, any>
): string | null {
  const actionUrl = data?.action_url as string | undefined;
  if (!actionUrl) return null;

  // Strip leading slash
  const path = actionUrl.startsWith("/") ? actionUrl.slice(1) : actionUrl;

  // --- CRM / Leads ---
  const leadMatch = path.match(/^crm\/leads\/([^/]+)/);
  if (leadMatch) return `/(tabs)/leads/${leadMatch[1]}`;

  // --- Projects (any sub-route maps to project detail) ---
  const projectMatch = path.match(/^projects\/([^/]+)/);
  if (projectMatch) return `/(tabs)/projects/${projectMatch[1]}`;

  // --- Quotations ---
  const quoteMatch = path.match(/^quotes\/([^/]+)/);
  if (quoteMatch) return `/(tabs)/quotes/${quoteMatch[1]}`;

  // --- Notifications list ---
  if (path.startsWith("notifications")) return "/(tabs)/notifications";

  // --- Inventory (no dedicated screen; map to indent) ---
  if (path.startsWith("inventory")) return "/(tabs)/attendance/indent";

  // --- Finance ---
  if (path.startsWith("finance")) return "/(tabs)/finance";

  // --- Labor / Payroll (map to attendance tab) ---
  if (path.startsWith("labor") || path.startsWith("payroll"))
    return "/(tabs)/attendance";

  // No matching route
  return null;
}

/**
 * Notification type constants that match what the backend sends.
 * Used by notification-settings to provide per-type toggles.
 */
export const NOTIFICATION_TYPES = {
  NEW_LEAD: "new_lead",
  QUOTE_APPROVAL: "quote_approval",
  PAYMENT_RECEIVED: "payment_received",
  SPRINT_UPDATE: "sprint_update",
  DAILY_LOG: "daily_log",
} as const;

export type NotificationPreferenceKey =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
