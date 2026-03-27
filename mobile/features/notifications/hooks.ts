import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
} from "./api";
import type { Notification } from "../../types";
import { useOrgId } from "../../lib/use-org-id";

/**
 * Fetch notifications with 60-second polling.
 */
export function useNotifications() {
  const orgId = useOrgId();
  const key = ["notifications", orgId];

  return useQuery({
    queryKey: key,
    queryFn: () => fetchNotifications(50),
    refetchInterval: 60_000,
  });
}

/**
 * Fetch unread notification count with 60-second polling (for badge).
 */
export function useUnreadCount() {
  const orgId = useOrgId();
  const key = ["notifications", "unread-count", orgId];

  return useQuery({
    queryKey: key,
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
    select: (data) => data.count,
  });
}

/**
 * Mark a single notification as read, with optimistic update.
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const NOTIFICATIONS_KEY = ["notifications", orgId];
  const UNREAD_COUNT_KEY = ["notifications", "unread-count", orgId];

  return useMutation({
    mutationFn: markAsRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      await queryClient.cancelQueries({ queryKey: UNREAD_COUNT_KEY });

      const previousNotifications =
        queryClient.getQueryData<Notification[]>(NOTIFICATIONS_KEY);
      const previousCount =
        queryClient.getQueryData<{ count: number }>(UNREAD_COUNT_KEY);

      // Optimistically mark as read
      if (previousNotifications) {
        queryClient.setQueryData<Notification[]>(
          NOTIFICATIONS_KEY,
          previousNotifications.map((n) =>
            n.id === id ? { ...n, is_read: true } : n
          )
        );
      }

      if (previousCount && previousCount.count > 0) {
        queryClient.setQueryData<{ count: number }>(UNREAD_COUNT_KEY, {
          count: previousCount.count - 1,
        });
      }

      return { previousNotifications, previousCount };
    },
    onError: (_err, _id, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          NOTIFICATIONS_KEY,
          context.previousNotifications
        );
      }
      if (context?.previousCount) {
        queryClient.setQueryData(UNREAD_COUNT_KEY, context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}

/**
 * Mark all notifications as read, with optimistic update.
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const NOTIFICATIONS_KEY = ["notifications", orgId];
  const UNREAD_COUNT_KEY = ["notifications", "unread-count", orgId];

  return useMutation({
    mutationFn: markAllAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      await queryClient.cancelQueries({ queryKey: UNREAD_COUNT_KEY });

      const previousNotifications =
        queryClient.getQueryData<Notification[]>(NOTIFICATIONS_KEY);
      const previousCount =
        queryClient.getQueryData<{ count: number }>(UNREAD_COUNT_KEY);

      if (previousNotifications) {
        queryClient.setQueryData<Notification[]>(
          NOTIFICATIONS_KEY,
          previousNotifications.map((n) => ({ ...n, is_read: true }))
        );
      }

      queryClient.setQueryData<{ count: number }>(UNREAD_COUNT_KEY, {
        count: 0,
      });

      return { previousNotifications, previousCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          NOTIFICATIONS_KEY,
          context.previousNotifications
        );
      }
      if (context?.previousCount) {
        queryClient.setQueryData(UNREAD_COUNT_KEY, context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}
