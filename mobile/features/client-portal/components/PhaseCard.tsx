import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  cancelAnimation,
  Easing,
  interpolate,
  FadeInDown,
} from "react-native-reanimated";
import Svg, { Path, Circle as SvgCircle } from "react-native-svg";
import { Lock } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../../lib/constants";
import { formatDate } from "../../../lib/format";
import { getFriendlyPhaseName } from "../constants";
import { AnimatedProgressBar } from "../../../components/atoms/AnimatedProgressBar";
import type { Sprint, SprintStatus } from "../../../types";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface PhaseCardProps {
  sprint: Sprint;
  index?: number;
}

// Animated checkmark that draws itself
function AnimatedCheckmark({ size = 16 }: { size?: number }) {
  const drawProgress = useSharedValue(0);

  useEffect(() => {
    drawProgress.value = withDelay(
      300,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: drawProgress.value,
    transform: [{ scale: interpolate(drawProgress.value, [0, 0.5, 1], [0.3, 1.1, 1]) }],
  }));

  return (
    <Animated.View
      style={[
        styles.statusIconCircle,
        { backgroundColor: "#22C55E" },
        animatedStyle,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M5 13l4 4L19 7"
          stroke="#FFFFFF"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

// Rotating spinner for active phase
function AnimatedSpinner({ color = COLORS.gold }: { color?: string }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
    return () => {
      cancelAnimation(rotation);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        styles.statusIconCircle,
        {
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 4,
        },
        animatedStyle,
      ]}
    >
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <SvgCircle
          cx={12}
          cy={12}
          r={8}
          stroke="#FFFFFF"
          strokeWidth={2.5}
          fill="none"
          strokeDasharray="25 25"
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

function StatusIcon({ status }: { status: SprintStatus }) {
  switch (status) {
    case "COMPLETED":
      return <AnimatedCheckmark />;
    case "ACTIVE":
      return <AnimatedSpinner />;
    case "DELAYED":
      return <AnimatedSpinner color="#EF4444" />;
    default:
      return (
        <View style={[styles.statusIconCircle, { backgroundColor: COLORS.border }]}>
          <Lock size={14} color={COLORS.mutedForeground} strokeWidth={2.5} />
        </View>
      );
  }
}

const STATUS_LABELS: Record<SprintStatus, string> = {
  COMPLETED: "Completed",
  ACTIVE: "In Progress",
  PENDING: "Upcoming",
  DELAYED: "Delayed",
};

const STATUS_COLORS: Record<SprintStatus, string> = {
  COMPLETED: "#22C55E",
  ACTIVE: COLORS.gold,
  PENDING: COLORS.mutedForeground,
  DELAYED: "#EF4444",
};

const BORDER_COLORS: Record<SprintStatus, string> = {
  COMPLETED: "#22C55E",
  ACTIVE: COLORS.gold,
  PENDING: COLORS.border,
  DELAYED: "#EF4444",
};

export default function PhaseCard({ sprint, index = 0 }: PhaseCardProps) {
  const friendlyName = getFriendlyPhaseName(sprint.name);
  const isActive = sprint.status === "ACTIVE";
  const isCompleted = sprint.status === "COMPLETED";
  const isPending = sprint.status === "PENDING";
  const statusLabel = STATUS_LABELS[sprint.status] ?? "Upcoming";
  const statusColor = STATUS_COLORS[sprint.status] ?? COLORS.mutedForeground;
  const borderColor = BORDER_COLORS[sprint.status] ?? COLORS.border;

  const [expanded, setExpanded] = useState(isActive);

  // Pulsing gold border for active card
  const pulseValue = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      pulseValue.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
    return () => {
      cancelAnimation(pulseValue);
    };
  }, [isActive]);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    if (!isActive) return {};
    const shadowOpacity = interpolate(pulseValue.value, [0, 1], [0.08, 0.2]);
    const borderOpacity = interpolate(pulseValue.value, [0, 1], [0.3, 0.6]);
    return {
      shadowOpacity,
      borderColor: `rgba(203, 178, 130, ${borderOpacity})`,
    };
  });

  const handlePress = () => {
    if (isPending) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const completionPct = sprint.completion_percentage ?? (isCompleted ? 100 : 0);

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        entering={FadeInDown.duration(400).delay(index * 80).springify().damping(18)}
        style={[
          styles.card,
          {
            backgroundColor: isActive ? COLORS.gold + "0A" : COLORS.background,
            borderLeftColor: borderColor,
            borderLeftWidth: 3,
            borderTopWidth: 1,
            borderRightWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: isActive ? COLORS.gold + "20" : COLORS.border,
            borderRightColor: isActive ? COLORS.gold + "20" : COLORS.border,
            borderBottomColor: isActive ? COLORS.gold + "20" : COLORS.border,
            opacity: isPending ? 0.6 : 1,
          },
          isActive && {
            shadowColor: COLORS.gold,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 12,
            elevation: 6,
          },
          cardAnimatedStyle,
        ]}
      >
        {/* Top row */}
        <View style={styles.topRow}>
          <StatusIcon status={sprint.status} />

          <View style={styles.titleSection}>
            <Text
              style={[
                styles.phaseName,
                { color: isActive ? COLORS.gold : COLORS.text },
              ]}
              numberOfLines={1}
            >
              {friendlyName}
            </Text>
            <Text style={styles.dateText}>
              {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
            </Text>
          </View>

          <View style={[styles.badge, { backgroundColor: statusColor + "15" }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Expanded content */}
        {expanded && !isPending && (
          <View style={styles.expandedContent}>
            {/* Progress bar for active/completed */}
            {(isActive || isCompleted) && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Progress</Text>
                  <Text style={[styles.progressValue, { color: statusColor }]}>
                    {completionPct}%
                  </Text>
                </View>
                <AnimatedProgressBar
                  value={completionPct}
                  color={statusColor}
                  height={4}
                  glow={isActive}
                  delay={200}
                />
              </View>
            )}

            {/* Sprint details */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>
                {formatDate(sprint.start_date)} to {formatDate(sprint.end_date)}
              </Text>
            </View>

            {(sprint as any).notes && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue} numberOfLines={3}>
                  {(sprint as any).notes}
                </Text>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  titleSection: {
    flex: 1,
    marginLeft: 12,
  },
  phaseName: {
    fontSize: 14,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border + "60",
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.mutedForeground,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.mutedForeground,
    width: 70,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.text,
    flex: 1,
    textAlign: "right",
  },
});
