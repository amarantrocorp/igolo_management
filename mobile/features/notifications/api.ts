import api from "../../lib/api";
import type { Notification } from "../../types";

/**
 * Fetch notifications for the current user.
 */
export async function fetchNotifications(
  limit: number = 50
): Promise<Notification[]> {
  const { data } = await api.get("/notifications", {
    params: { limit },
  });
  // Handle both array and {items, total} responses
  if (Array.isArray(data)) return data;
  if (data?.items) return data.items;
  return [];
}

/**
 * Fetch the count of unread notifications.
 */
export async function fetchUnreadCount(): Promise<{ count: number }> {
  const { data } = await api.get<{ count: number }>(
    "/notifications/unread-count"
  );
  return data;
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

/**
 * Mark all notifications as read.
 */
export async function markAllAsRead(): Promise<void> {
  await api.post("/notifications/mark-all-read");
}
