import { useEffect, useState, useCallback, useRef } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { Platform } from "react-native";
import { processQueue, getQueueCount } from "./offline-queue";
import { useToast } from "../components/molecules/Toast";

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
}

/**
 * Hook that tracks real-time network connectivity.
 * Returns { isConnected, isInternetReachable }.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isConnected: state.isConnected ?? false,
        // Treat null/unknown reachability as false (offline) to avoid false positives
        // when connected to WiFi but without actual internet access
        isInternetReachable: state.isInternetReachable === true,
      });
    });

    // Fetch initial state
    NetInfo.fetch().then((state) => {
      setStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable === true,
      });
    });

    return () => unsubscribe();
  }, []);

  return status;
}

/**
 * Hook that auto-processes the offline queue when the device comes back online.
 * Should be mounted once at the app root level.
 */
export function useOnlineManager() {
  const wasOffline = useRef(false);
  const isSyncing = useRef(false);
  const toast = useToast();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state: NetInfoState) => {
      const isOnline = (state.isConnected ?? false) && state.isInternetReachable === true;

      if (!isOnline) {
        wasOffline.current = true;
        return;
      }

      // Just came back online
      if (wasOffline.current && !isSyncing.current) {
        wasOffline.current = false;
        isSyncing.current = true;

        try {
          const count = await getQueueCount();
          if (count > 0) {
            // Show a non-blocking toast on reconnection
            if (Platform.OS !== "web") {
              toast.show(
                `Syncing ${count} pending item${count !== 1 ? "s" : ""}...`,
                "info"
              );
            }

            const result = await processQueue();

            if (result.processed > 0) {
              const failMsg = result.failed > 0
                ? ` ${result.failed} item${result.failed !== 1 ? "s" : ""} failed.`
                : "";
              toast.show(
                `${result.processed} item${result.processed !== 1 ? "s" : ""} synced successfully.${failMsg}`,
                result.failed > 0 ? "warning" : "success"
              );
            }
          }
        } catch {
          // Silently fail -- will retry next time connectivity changes
        } finally {
          isSyncing.current = false;
        }
      }
    });

    return () => unsubscribe();
  }, []);
}
