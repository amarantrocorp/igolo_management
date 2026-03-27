import React, { useCallback, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { AlertTriangle } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  cancelAnimation,
  Easing,
  FadeInDown,
} from "react-native-reanimated";
import { COLORS } from "../../../lib/constants";
import { formatINR, formatDate } from "../../../lib/format";
import type { Project, ProjectStatus } from "../../../types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const STATUS_COLORS: Record<ProjectStatus, string> = {
  NOT_STARTED: "#64748B",
  IN_PROGRESS: "#3B82F6",
  ON_HOLD: "#F59E0B",
  COMPLETED: "#22C55E",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
};

interface ProjectCardProps {
  project: Project;
  index?: number;
}

const ProjectCard = React.memo(function ProjectCard({
  project,
  index = 0,
}: ProjectCardProps) {
  const router = useRouter();
  const statusColor =
    STATUS_COLORS[project.status] ?? COLORS.mutedForeground;

  const sprints = project.sprints ?? [];
  const completedSprints = sprints.filter(
    (s) => s.status === "COMPLETED"
  ).length;
  const totalSprints = sprints.length || 6;
  const progress = totalSprints > 0 ? completedSprints / totalSprints : 0;

  const wallet = project.wallet;
  const totalReceived = wallet?.total_received ?? 0;
  const totalSpent = wallet?.total_spent ?? 0;
  const projectValue = project.total_project_value ?? 0;
  const remaining = Math.max(0, projectValue - totalSpent);

  const clientName =
    project.client?.user?.full_name ??
    project.client?.lead?.name ??
    "Client";

  // Check overdue
  const isOverdue =
    project.expected_end_date &&
    new Date(project.expected_end_date) < new Date() &&
    project.status !== "COMPLETED";

  // Animated progress bar
  const progressWidth = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const overduePulse = useSharedValue(1);

  useEffect(() => {
    progressWidth.value = withDelay(
      index * 80 + 300,
      withTiming(progress, { duration: 800, easing: Easing.out(Easing.cubic) })
    );
  }, [progress]);

  // Overdue pulse animation
  useEffect(() => {
    if (isOverdue) {
      overduePulse.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    }
    return () => {
      cancelAnimation(overduePulse);
    };
  }, [isOverdue]);

  const handlePress = useCallback(() => {
    router.push(`/(tabs)/projects/${project.id}`);
  }, [router, project.id]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progressWidth.value * 100)}%`,
  }));

  const overdueStyle = useAnimatedStyle(() => ({
    transform: [{ scale: overduePulse.value }],
  }));

  // Financial bar widths
  const receivedPct = projectValue > 0 ? (totalReceived / projectValue) * 100 : 0;
  const spentPct = projectValue > 0 ? (totalSpent / projectValue) * 100 : 0;

  return (
    <AnimatedPressable
      entering={index < 10 ? FadeInDown.delay(index * 60).duration(400).springify() : undefined}
      onPressIn={() => {
        cardScale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        cardScale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPress={handlePress}
      style={[styles.card, cardStyle]}
    >
      {/* Top Row: Name + Status + Overdue */}
      <View style={styles.topRow}>
        <View style={styles.nameSection}>
          <Text style={styles.clientName} numberOfLines={1}>
            {clientName}
          </Text>
          <Text style={styles.dateRange}>
            {formatDate(project.start_date)} - {formatDate(project.expected_end_date)}
          </Text>
        </View>

        <View style={styles.statusRow}>
          {isOverdue && (
            <Animated.View style={[styles.overdueIcon, overdueStyle]}>
              <AlertTriangle size={14} color="#EF4444" strokeWidth={2.5} />
            </Animated.View>
          )}
          <View
            style={[styles.statusBadge, { backgroundColor: statusColor + "14" }]}
          >
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[project.status] ?? project.status}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <View style={styles.sprintBadge}>
            <Text style={styles.sprintBadgeText}>
              {completedSprints}/{totalSprints} sprints
            </Text>
          </View>
          <Text style={styles.progressPct}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: statusColor },
              progressBarStyle,
            ]}
          />
        </View>
      </View>

      {/* Financial Mini-Bar */}
      <View style={styles.financeSection}>
        <Text style={styles.projectValue}>{formatINR(projectValue)}</Text>
        <View style={styles.financeBar}>
          <View
            style={[
              styles.financeSegment,
              styles.financeReceived,
              { width: `${Math.min(receivedPct, 100)}%` },
            ]}
          />
          <View
            style={[
              styles.financeSegment,
              styles.financeSpent,
              { width: `${Math.min(spentPct, 100)}%`, position: "absolute", left: 0 },
            ]}
          />
        </View>
        <View style={styles.financeLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#22C55E" }]} />
            <Text style={styles.legendText}>In: {formatINR(totalReceived)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
            <Text style={styles.legendText}>Out: {formatINR(totalSpent)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#E2E8F0" }]} />
            <Text style={styles.legendText}>Rem: {formatINR(remaining)}</Text>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  nameSection: {
    flex: 1,
    marginRight: 8,
  },
  clientName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  dateRange: {
    fontSize: 11,
    color: "#94A3B8",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  overdueIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sprintBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sprintBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  progressPct: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  financeSection: {
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
    paddingTop: 10,
  },
  projectValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  financeBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 6,
    position: "relative",
  },
  financeSegment: {
    height: "100%",
    borderRadius: 2,
  },
  financeReceived: {
    backgroundColor: "#22C55E40",
  },
  financeSpent: {
    backgroundColor: "#EF4444",
  },
  financeLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
  },
});

export default ProjectCard;
