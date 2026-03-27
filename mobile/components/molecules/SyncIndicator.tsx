import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useNetworkStatus } from "../../lib/network-status";
import { getQueueCount } from "../../lib/offline-queue";
import { COLORS } from "../../lib/constants";

type SyncState = "synced" | "syncing" | "offline";

interface SyncIndicatorProps {
  /** Whether a sync operation is currently in progress */
  isSyncing?: boolean;
  /** Compact mode -- dot only, no text */
  compact?: boolean;
}

export function SyncIndicator({
  isSyncing = false,
  compact = false,
}: SyncIndicatorProps) {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const isOnline = isConnected && isInternetReachable;

  useEffect(() => {
    const fetchCount = async () => {
      const count = await getQueueCount();
      setPendingCount(count);
    };

    fetchCount();
    const interval = setInterval(fetchCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const state: SyncState = !isOnline
    ? "offline"
    : isSyncing || pendingCount > 0
    ? "syncing"
    : "synced";

  const dotColor =
    state === "synced"
      ? COLORS.success
      : state === "syncing"
      ? COLORS.warning
      : COLORS.destructive;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        {state === "syncing" && (
          <ActivityIndicator size="small" color={COLORS.warning} style={styles.spinner} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      {state === "syncing" && (
        <ActivityIndicator size="small" color={COLORS.warning} style={styles.spinner} />
      )}
      <Text style={styles.label}>
        {state === "synced" && "Synced"}
        {state === "syncing" && `${pendingCount} item${pendingCount !== 1 ? "s" : ""} pending`}
        {state === "offline" && "Offline"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  spinner: {
    marginLeft: -2,
    transform: [{ scale: 0.6 }],
  },
  label: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    fontWeight: "500",
  },
});
