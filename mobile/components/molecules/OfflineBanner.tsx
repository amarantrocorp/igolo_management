import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { WifiOff } from "lucide-react-native";
import { useNetworkStatus } from "../../lib/network-status";
import { getQueueCount } from "../../lib/offline-queue";
import { COLORS } from "../../lib/constants";

export function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const [queueCount, setQueueCount] = useState(0);
  const isOffline = !isConnected || !isInternetReachable;
  const slideAnim = useSharedValue(0);

  // Poll queue count while offline
  useEffect(() => {
    if (!isOffline) {
      setQueueCount(0);
      return;
    }

    const fetchCount = async () => {
      const count = await getQueueCount();
      setQueueCount(count);
    };

    fetchCount();
    const interval = setInterval(fetchCount, 5000);
    return () => clearInterval(interval);
  }, [isOffline]);

  // Animate in/out
  useEffect(() => {
    slideAnim.value = withTiming(isOffline ? 1 : 0, { duration: 300 });
  }, [isOffline]);

  const animatedStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(slideAnim.value, [0, 1], [0, 60]),
    opacity: slideAnim.value,
    overflow: "hidden" as const,
  }));

  return (
    <Animated.View style={[animatedStyle, styles.wrapper]}>
      <View style={styles.banner}>
        <WifiOff size={16} color="#FFFFFF" strokeWidth={2.5} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>You're offline</Text>
          <Text style={styles.subtitle}>
            Changes will sync when connected
            {queueCount > 0 ? ` (${queueCount} pending)` : ""}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // Ensure the banner renders above modals, bottom sheets, and tab bars
    zIndex: 9999,
    elevation: 9999,
    position: "relative",
  },
  banner: {
    backgroundColor: COLORS.destructive,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    marginTop: 1,
  },
});
