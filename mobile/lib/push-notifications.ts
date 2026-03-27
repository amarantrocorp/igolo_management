import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import api from "./api";

/**
 * Configure the notification handler so notifications display
 * even when the app is in the foreground.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and return the Expo push token.
 * Returns null if the device doesn't support push or permission is denied.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  // Check existing permission status
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not already granted
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission denied");
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#CBB282",
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn("No EAS project ID found. Push token unavailable.");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return tokenData.data;
  } catch (error) {
    console.error("Failed to get push token:", error);
    return null;
  }
}

/**
 * Save the push token to the backend so the server can send
 * push notifications to this device.
 */
export async function savePushToken(token: string): Promise<void> {
  try {
    await api.post("/users/me/push-token", {
      push_token: token,
      platform: Platform.OS,
    });
  } catch (error) {
    console.error("Failed to save push token to backend:", error);
  }
}

/**
 * Remove the push token from the backend (e.g. on logout).
 */
export async function removePushToken(): Promise<void> {
  try {
    await api.delete("/users/me/push-token");
  } catch (error) {
    console.error("Failed to remove push token from backend:", error);
  }
}

/**
 * Examine a notification and return the in-app navigation path
 * it should deep-link to, or null if there is no action.
 */
export function getNavigationPath(
  notification: Notifications.Notification
): string | null {
  const data = notification.request.content.data;

  if (!data) return null;

  // The backend sends `action_url` matching the Notification model
  const actionUrl = data.action_url as string | undefined;
  if (!actionUrl) return null;

  return mapBackendUrlToRoute(actionUrl);
}

/**
 * Map a backend action_url (e.g. "/projects/123/approvals") to an
 * Expo Router path (e.g. "/(tabs)/projects/123").
 */
function mapBackendUrlToRoute(actionUrl: string): string | null {
  // Strip leading slash for easier matching
  const path = actionUrl.startsWith("/") ? actionUrl.slice(1) : actionUrl;

  // Leads
  const leadMatch = path.match(/^crm\/leads\/([^/]+)/);
  if (leadMatch) return `/(tabs)/leads/${leadMatch[1]}`;

  // Projects (with optional sub-path)
  const projectMatch = path.match(/^projects\/([^/]+)/);
  if (projectMatch) return `/(tabs)/projects/${projectMatch[1]}`;

  // Quotes
  const quoteMatch = path.match(/^quotes\/([^/]+)/);
  if (quoteMatch) return `/(tabs)/quotes/${quoteMatch[1]}`;

  // Notifications list
  if (path.startsWith("notifications")) return "/(tabs)/notifications";

  // Inventory (map to indent tab)
  if (path.startsWith("inventory")) return "/(tabs)/attendance/indent";

  // Finance
  if (path.startsWith("finance")) return "/(tabs)/finance";

  // Labor / Payroll (map to attendance tab)
  if (path.startsWith("labor") || path.startsWith("payroll"))
    return "/(tabs)/attendance";

  return null;
}
