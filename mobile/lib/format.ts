import { format, formatDistanceToNow, parseISO } from "date-fns";

/**
 * Format a number as Indian Rupees (INR).
 * Rounds to 2 decimal places before formatting to avoid floating point errors.
 */
export function formatINR(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "\u20B90";
  const rounded = Math.round(amount * 100) / 100;
  return (
    "\u20B9" +
    rounded.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Format an ISO date string into a human-readable date.
 * Example: "26 Mar 2026"
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return "\u2014";
  try {
    return format(parseISO(date), "dd MMM yyyy");
  } catch {
    return "\u2014";
  }
}

/**
 * Format an ISO date string into a short date.
 * Example: "26/03/2026"
 */
export function formatShortDate(date: string | null | undefined): string {
  if (!date) return "\u2014";
  try {
    return format(parseISO(date), "dd/MM/yyyy");
  } catch {
    return "\u2014";
  }
}

/**
 * Format an ISO date string as a relative time.
 * Example: "2h ago", "3d ago"
 */
export function formatRelativeTime(date: string | null | undefined): string {
  if (!date) return "\u2014";
  try {
    return formatDistanceToNow(parseISO(date), { addSuffix: true });
  } catch {
    return "\u2014";
  }
}

/**
 * Format a date string with time.
 * Example: "26 Mar 2026, 14:30"
 */
export function formatDateTime(date: string | null | undefined): string {
  if (!date) return "\u2014";
  try {
    return format(parseISO(date), "dd MMM yyyy, HH:mm");
  } catch {
    return "\u2014";
  }
}

/**
 * Format a percentage value.
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
