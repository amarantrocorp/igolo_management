import React, { useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  withSpring,
  interpolate,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import { COLORS } from "../../../lib/constants";
import { formatShortDate } from "../../../lib/format";
import type { Sprint, SprintStatus } from "../../../types";

const STATUS_CIRCLE_COLORS: Record<SprintStatus, string> = {
  COMPLETED: "#22C55E",
  ACTIVE: "#3B82F6",
  PENDING: "#CBD5E1",
  DELAYED: "#EF4444",
};

interface SprintTimelineProps {
  sprints: Sprint[];
}

// Animated connector line between circles
function ConnectorLine({
  isCompleted,
  index,
}: {
  isCompleted: boolean;
  index: number;
}) {
  const drawProgress = useSharedValue(0);

  useEffect(() => {
    drawProgress.value = withDelay(
      index * 150 + 200,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const lineStyle = useAnimatedStyle(() => ({
    width: interpolate(drawProgress.value, [0, 1], [0, 28]),
    height: 2.5,
    backgroundColor: isCompleted ? "#22C55E" : "#E2E8F0",
    borderRadius: 1.25,
  }));

  return (
    <View style={styles.lineWrapper}>
      <Animated.View style={lineStyle} />
    </View>
  );
}

// Animated sprint node
function SprintNode({
  sprint,
  index,
  isLast,
  prevCompleted,
}: {
  sprint: Sprint;
  index: number;
  isLast: boolean;
  prevCompleted: boolean;
}) {
  const isActive = sprint.status === "ACTIVE";
  const isCompleted = sprint.status === "COMPLETED";
  const circleColor =
    STATUS_CIRCLE_COLORS[sprint.status] ?? "#CBD5E1";

  // Entrance animation
  const nodeScale = useSharedValue(0);
  const nodeOpacity = useSharedValue(0);

  // Active pulse
  const pulseScale = useSharedValue(1);

  // Completed checkmark
  const checkScale = useSharedValue(0);

  useEffect(() => {
    // Stagger entrance
    nodeScale.value = withDelay(
      index * 150,
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    nodeOpacity.value = withDelay(
      index * 150,
      withTiming(1, { duration: 300 })
    );

    // Pulse for active sprint
    if (isActive) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }

    // Checkmark for completed
    if (isCompleted) {
      checkScale.value = withDelay(
        index * 150 + 300,
        withSpring(1, { damping: 10, stiffness: 250 })
      );
    }

    return () => {
      cancelAnimation(pulseScale);
    };
  }, []);

  const nodeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nodeScale.value }],
    opacity: nodeOpacity.value,
  }));

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isActive ? pulseScale.value : 1 }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  // Extract short name
  const shortName =
    sprint.name
      ?.replace(/^Sprint\s*\d+:\s*/i, "")
      .split(/[&,]/)[0]
      ?.trim() ?? `S${sprint.sequence_order}`;

  const circleSize = isActive ? 32 : 24;

  return (
    <Animated.View style={[styles.nodeContainer, nodeStyle]}>
      {/* Circle */}
      <Animated.View
        style={[
          styles.circle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: circleColor,
          },
          isActive && {
            shadowColor: circleColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 6,
          },
          circleStyle,
        ]}
      >
        {isCompleted ? (
          <Animated.View style={checkStyle}>
            <Check size={isActive ? 16 : 12} color="#FFFFFF" strokeWidth={3} />
          </Animated.View>
        ) : (
          <Text
            style={[
              styles.circleText,
              { fontSize: isActive ? 13 : 10 },
            ]}
          >
            {sprint.sequence_order}
          </Text>
        )}
      </Animated.View>

      {/* Sprint Name */}
      <Text
        style={[
          styles.sprintName,
          isActive && styles.sprintNameActive,
        ]}
        numberOfLines={1}
      >
        {shortName}
      </Text>

      {/* Date */}
      <Text style={styles.sprintDate} numberOfLines={1}>
        {formatShortDate(sprint.start_date)}
      </Text>

      {/* Status label for active/delayed */}
      {(isActive || sprint.status === "DELAYED") && (
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor:
                sprint.status === "DELAYED" ? "#FEF2F2" : "#EFF6FF",
            },
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              {
                color:
                  sprint.status === "DELAYED" ? "#EF4444" : "#3B82F6",
              },
            ]}
          >
            {sprint.status === "DELAYED" ? "Delayed" : "Active"}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

export default function SprintTimeline({ sprints }: SprintTimelineProps) {
  const sortedSprints = [...(sprints ?? [])].sort(
    (a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0)
  );

  if (sortedSprints.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No sprints available</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      decelerationRate="fast"
    >
      {sortedSprints.map((sprint, index) => {
        const isLast = index === sortedSprints.length - 1;
        const prevCompleted =
          index > 0 && sortedSprints[index - 1]?.status === "COMPLETED";

        return (
          <View key={sprint.id} style={styles.nodeRow}>
            {index > 0 && (
              <ConnectorLine
                isCompleted={prevCompleted}
                index={index}
              />
            )}
            <SprintNode
              sprint={sprint}
              index={index}
              isLast={isLast}
              prevCompleted={prevCompleted}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "flex-start",
  },
  nodeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  lineWrapper: {
    justifyContent: "center",
    height: 32,
    paddingTop: 2,
  },
  nodeContainer: {
    alignItems: "center",
    width: 72,
  },
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
  circleText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  sprintName: {
    fontSize: 11,
    fontWeight: "500",
    color: "#334155",
    marginTop: 6,
    textAlign: "center",
    maxWidth: 68,
  },
  sprintNameActive: {
    fontWeight: "700",
    color: "#3B82F6",
  },
  sprintDate: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 2,
    textAlign: "center",
  },
  statusPill: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12,
    color: "#94A3B8",
  },
});
