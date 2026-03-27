import React, { useEffect, useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { MapPin, LogOut, Clock } from "lucide-react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";

import { Text } from "../../../components/atoms/Text";
import { Card } from "../../../components/atoms/Card";
import { Button } from "../../../components/atoms/Button";
import { PressScale } from "../../../components/animations/PressScale";
import { useToast } from "../../../components/molecules/Toast";
import { COLORS } from "../../../lib/constants";
import { useActiveCheckIn, useCheckOut } from "../hooks";
import { formatDuration } from "../utils";
import type { CheckInRecord } from "../api";

// ============================================================
// Pulse animation for the check-in button
// ============================================================

function PulseRing() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 1200, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1200, easing: Easing.out(Easing.ease) }),
        withTiming(0.6, { duration: 0 })
      ),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: COLORS.gold + "40",
        },
        animStyle,
      ]}
    />
  );
}

// ============================================================
// Duration Timer
// ============================================================

function DurationTimer({ checkedInAt }: { checkedInAt: string }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const start = new Date(checkedInAt).getTime();
    const update = () => {
      setSeconds(Math.floor((Date.now() - start) / 1000));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [checkedInAt]);

  return (
    <View style={styles.timerRow}>
      <Clock size={14} color={COLORS.gold} />
      <Text
        variant="body"
        weight="bold"
        style={{ color: COLORS.text, marginLeft: 6, fontVariant: ["tabular-nums"] }}
      >
        {formatDuration(seconds)}
      </Text>
    </View>
  );
}

// ============================================================
// CheckInCard
// ============================================================

export default function CheckInCard() {
  const router = useRouter();
  const toast = useToast();
  const { data: activeCheckIn, isLoading } = useActiveCheckIn();
  const checkOutMutation = useCheckOut();

  const handleCheckOut = async () => {
    if (!activeCheckIn?.id) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        toast.show("Location permission needed for check-out", "error");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      checkOutMutation.mutate(
        {
          checkinId: activeCheckIn.id,
          data: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        },
        {
          onSuccess: () => {
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            }
            toast.show("Checked out successfully", "success");
          },
          onError: (error: any) => {
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
              );
            }
            const msg =
              error?.response?.data?.detail ?? "Failed to check out";
            toast.show(msg, "error");
          },
        }
      );
    } catch {
      toast.show("Could not get location", "error");
    }
  };

  if (isLoading) {
    return (
      <Animated.View entering={FadeInDown.duration(300)}>
        <Card padding="md" className="mb-3">
          <View style={styles.loadingRow}>
            <View style={styles.loadingDot} />
            <Text variant="label" style={{ color: COLORS.mutedForeground }}>
              Checking status...
            </Text>
          </View>
        </Card>
      </Animated.View>
    );
  }

  // ---- Active check-in: show status + check out ----
  if (activeCheckIn) {
    const checkinTime = new Date(activeCheckIn.checked_in_at).toLocaleTimeString(
      "en-IN",
      { hour: "2-digit", minute: "2-digit" }
    );

    return (
      <Animated.View entering={FadeInDown.duration(400).springify().damping(18)}>
        <Card padding="md" className="mb-3">
          <View style={styles.activeHeader}>
            <View style={styles.activeBadge}>
              <View style={styles.liveDot} />
              <Text
                variant="caption"
                weight="bold"
                style={{ color: COLORS.success, marginLeft: 6 }}
              >
                CHECKED IN
              </Text>
            </View>
            <DurationTimer checkedInAt={activeCheckIn.checked_in_at} />
          </View>

          <View style={styles.activeBody}>
            <MapPin size={16} color={COLORS.gold} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text variant="label" weight="semibold" style={{ color: COLORS.text }}>
                {activeCheckIn.project_name || "Project Site"}
              </Text>
              <Text variant="caption" style={{ color: COLORS.mutedForeground, marginTop: 2 }}>
                Since {checkinTime}
              </Text>
            </View>
          </View>

          <Button
            variant="destructive"
            size="md"
            onPress={handleCheckOut}
            loading={checkOutMutation.isPending}
            leftIcon={<LogOut size={16} color="#FFFFFF" />}
            className="mt-3"
          >
            Check Out
          </Button>
        </Card>
      </Animated.View>
    );
  }

  // ---- Not checked in: show check-in button ----
  return (
    <Animated.View entering={FadeInDown.duration(400).springify().damping(18)}>
      <PressScale
        onPress={() => router.push("/(tabs)/attendance/checkin")}
        haptic
      >
        <Card padding="md" className="mb-3">
          <View style={styles.notCheckedInRow}>
            <View style={styles.iconContainer}>
              <PulseRing />
              <View style={styles.iconCircle}>
                <MapPin size={22} color={COLORS.gold} />
              </View>
            </View>

            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text variant="label" weight="bold" style={{ color: COLORS.text }}>
                Check In to Site
              </Text>
              <Text
                variant="caption"
                style={{ color: COLORS.mutedForeground, marginTop: 2 }}
              >
                Tap to mark your attendance at a project site
              </Text>
            </View>

            <View style={styles.arrowCircle}>
              <Text variant="caption" weight="bold" style={{ color: COLORS.gold }}>
                GO
              </Text>
            </View>
          </View>
        </Card>
      </PressScale>
    </Animated.View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gold + "60",
  },

  // Active check-in
  activeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.success + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  activeBody: {
    flexDirection: "row",
    alignItems: "center",
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Not checked in
  notCheckedInRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.gold + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gold + "15",
    alignItems: "center",
    justifyContent: "center",
  },
});
