import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../auth/store";

/**
 * Hook that manages push notification registration and
 * notification-tap navigation. Gracefully no-ops in Expo Go
 * where native notification modules aren't available.
 */
export function usePushNotifications() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const listenersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!token) return;

    let mounted = true;

    async function setup() {
      try {
        // Dynamic import to avoid crash in Expo Go
        const Notifications = await import("expo-notifications");
        const { registerForPushNotificationsAsync, savePushToken, getNavigationPath } =
          await import("../../lib/push-notifications");

        if (!mounted) return;

        // Register and save push token
        try {
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken && mounted) {
            savePushToken(pushToken);
          }
        } catch (e) {
          console.log("Push registration skipped:", e);
        }

        // Listen for incoming notifications (foreground)
        try {
          const receivedListener = Notifications.addNotificationReceivedListener(
            (notification) => {
              console.log("Notification received:", notification.request.content.title);
            }
          );
          listenersRef.current.push(receivedListener);
        } catch {}

        // Listen for notification taps
        try {
          const responseListener = Notifications.addNotificationResponseReceivedListener(
            (response) => {
              const path = getNavigationPath(response.notification);
              if (path && mounted) {
                setTimeout(() => router.push(path as any), 100);
              }
            }
          );
          listenersRef.current.push(responseListener);
        } catch {}

        // Cold start deep link
        try {
          const lastResponse = await Notifications.getLastNotificationResponseAsync();
          if (lastResponse && mounted) {
            const path = getNavigationPath(lastResponse.notification);
            if (path) {
              setTimeout(() => router.push(path as any), 500);
            }
          }
        } catch {}
      } catch (e) {
        // expo-notifications not available (Expo Go) — silently skip
        console.log("Push notifications not available in this environment");
      }
    }

    setup();

    return () => {
      mounted = false;
      // Clean up listeners safely
      listenersRef.current.forEach((listener) => {
        try {
          listener?.remove?.();
        } catch {}
      });
      listenersRef.current = [];
    };
  }, [token]);
}
