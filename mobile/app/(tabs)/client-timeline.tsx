import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  FadeInDown,
  FadeIn as ReanimatedFadeIn,
} from "react-native-reanimated";
import { Check, Lock, Loader, Clock } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../lib/constants";
import {
  useClientProjects,
  useClientUpdates,
} from "../../features/client-portal/hooks";
import { getFriendlyPhaseName } from "../../features/client-portal/constants";
import { formatDate } from "../../lib/format";
import SprintTimeline from "../../features/projects/components/SprintTimeline";
import UpdateFeed from "../../features/client-portal/components/UpdateFeed";
import type { Sprint, SprintStatus } from "../../types";
import { Platform } from "react-native";

type TabMode = "timeline" | "updates";

export default function ClientTimelineScreen() {
  const { data: projects, isLoading: projectsLoading } = useClientProjects();
  const [activeTab, setActiveTab] = useState<TabMode>("timeline");

  const project = projects?.[0];
  const projectId = project?.id;
  const sprints = useMemo(
    () =>
      [...(project?.sprints ?? [])].sort(
        (a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0)
      ),
    [project?.sprints]
  );

  const {
    data: updates,
    isLoading: updatesLoading,
    isRefetching: updatesRefetching,
    refetch: refetchUpdates,
  } = useClientUpdates(projectId);

  const handleRefreshUpdates = useCallback(() => {
    refetchUpdates();
  }, [refetchUpdates]);

  if (projectsLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Animated.View
          entering={ReanimatedFadeIn.duration(600)}
          style={styles.emptyContent}
        >
          <View style={styles.emptyIcon}>
            <Clock size={32} color={COLORS.gold} />
          </View>
          <Text style={styles.emptyTitle}>No project found</Text>
          <Text style={styles.emptyDesc}>
            Your project timeline will appear here once set up.
          </Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(100)}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Project Timeline</Text>
      </Animated.View>

      {/* Sprint Timeline (horizontal) */}
      <SprintTimeline sprints={sprints} />

      {/* Tab Switcher */}
      <AnimatedTabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      {activeTab === "timeline" ? (
        <VerticalTimeline sprints={sprints} />
      ) : (
        <UpdateFeed
          logs={updates ?? []}
          sprints={sprints}
          isLoading={updatesLoading}
          isRefetching={updatesRefetching}
          onRefresh={handleRefreshUpdates}
        />
      )}
    </SafeAreaView>
  );
}

// ---------- Animated Tab Switcher ----------

function AnimatedTabSwitcher({
  activeTab,
  onTabChange,
}: {
  activeTab: TabMode;
  onTabChange: (tab: TabMode) => void;
}) {
  const indicatorX = useSharedValue(activeTab === "timeline" ? 0 : 1);

  useEffect(() => {
    indicatorX.value = withSpring(activeTab === "timeline" ? 0 : 1, {
      damping: 18,
      stiffness: 200,
    });
  }, [activeTab]);

  const indicatorStyle = useAnimatedStyle(() => ({
    left: `${indicatorX.value * 50}%` as any,
    width: "50%",
  }));

  const handleTabPress = (tab: TabMode) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onTabChange(tab);
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(200)}
      style={styles.tabContainer}
    >
      <View style={styles.tabTrack}>
        {/* Sliding indicator */}
        <Animated.View style={[styles.tabIndicator, indicatorStyle]} />

        <Pressable
          onPress={() => handleTabPress("timeline")}
          style={styles.tabBtn}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "timeline" ? styles.tabTextActive : styles.tabTextInactive,
            ]}
          >
            Timeline
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleTabPress("updates")}
          style={styles.tabBtn}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "updates" ? styles.tabTextActive : styles.tabTextInactive,
            ]}
          >
            Updates
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ---------- Vertical Timeline with animated line ----------

function VerticalTimeline({ sprints }: { sprints: Sprint[] }) {
  const lineHeight = useSharedValue(0);

  useEffect(() => {
    lineHeight.value = withDelay(
      300,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: lineHeight.value }],
  }));

  if (sprints.length === 0) {
    return (
      <View style={styles.timelineEmpty}>
        <Text style={styles.timelineEmptyText}>
          Timeline phases will appear here once your project begins.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.timelineContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.timelineContainer}>
        {/* Animated vertical line */}
        <Animated.View
          style={[
            styles.verticalLine,
            lineStyle,
            { transformOrigin: "top" },
          ]}
        />

        {sprints.map((sprint, index) => (
          <TimelineNode
            key={sprint.id}
            sprint={sprint}
            index={index}
            isLast={index === sprints.length - 1}
          />
        ))}
      </View>
    </ScrollView>
  );
}

// ---------- Timeline Node ----------

function TimelineNode({
  sprint,
  index,
  isLast,
}: {
  sprint: Sprint;
  index: number;
  isLast: boolean;
}) {
  const isActive = sprint.status === "ACTIVE";
  const isCompleted = sprint.status === "COMPLETED";
  const isPending = sprint.status === "PENDING";
  const isDelayed = sprint.status === "DELAYED";
  const friendlyName = getFriendlyPhaseName(sprint.name);

  // Pulse animation for active node
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      pulseScale.value = withDelay(
        index * 100 + 500,
        withTiming(1, { duration: 0 }) // just to trigger after delay
      );
    }
  }, [isActive]);

  const nodeColor = isCompleted
    ? "#22C55E"
    : isActive
    ? COLORS.gold
    : isDelayed
    ? "#EF4444"
    : COLORS.border;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(400 + index * 100).springify().damping(18)}
      style={styles.nodeRow}
    >
      {/* Node circle */}
      <View style={styles.nodeColumn}>
        <View
          style={[
            styles.nodeCircle,
            {
              backgroundColor: nodeColor,
              borderWidth: isActive ? 3 : 0,
              borderColor: isActive ? COLORS.gold + "40" : "transparent",
            },
            isActive && {
              shadowColor: COLORS.gold,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
              elevation: 4,
            },
          ]}
        >
          {isCompleted && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
          {(isActive || isDelayed) && <Loader size={12} color="#FFFFFF" strokeWidth={2.5} />}
          {isPending && <Lock size={10} color={COLORS.mutedForeground} strokeWidth={2.5} />}
        </View>
      </View>

      {/* Content card */}
      <View
        style={[
          styles.nodeCard,
          {
            backgroundColor: isActive ? COLORS.gold + "08" : COLORS.background,
            borderColor: isActive ? COLORS.gold + "25" : COLORS.border,
            opacity: isPending ? 0.55 : 1,
          },
          isActive && {
            shadowColor: COLORS.gold,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          },
        ]}
      >
        <Text
          style={[
            styles.nodeName,
            { color: isActive ? COLORS.gold : COLORS.text },
          ]}
          numberOfLines={1}
        >
          {friendlyName}
        </Text>
        <Text style={styles.nodeDates}>
          {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
        </Text>

        {/* Status tag */}
        <View style={styles.nodeStatusRow}>
          <View style={[styles.nodeStatusBadge, { backgroundColor: nodeColor + "15" }]}>
            <Text style={[styles.nodeStatusText, { color: nodeColor }]}>
              {isCompleted ? "Completed" : isActive ? "In Progress" : isDelayed ? "Delayed" : "Upcoming"}
            </Text>
          </View>

          {(isActive || isCompleted) && sprint.completion_percentage != null && (
            <Text style={[styles.nodePct, { color: nodeColor }]}>
              {sprint.completion_percentage}%
            </Text>
          )}
        </View>

        {/* Progress bar for active */}
        {isActive && sprint.completion_percentage != null && (
          <View style={styles.nodeProgressTrack}>
            <View
              style={[
                styles.nodeProgressFill,
                { width: `${sprint.completion_percentage}%` },
              ]}
            />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  // Tab Switcher
  tabContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  tabTrack: {
    flexDirection: "row",
    backgroundColor: COLORS.muted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: "relative",
    overflow: "hidden",
  },
  tabIndicator: {
    position: "absolute",
    top: 3,
    bottom: 3,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: COLORS.gold,
  },
  tabTextInactive: {
    color: COLORS.mutedForeground,
  },
  // Vertical Timeline
  timelineContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  timelineContainer: {
    position: "relative",
    paddingLeft: 28,
  },
  verticalLine: {
    position: "absolute",
    left: 15,
    top: 20,
    bottom: 20,
    width: 2,
    backgroundColor: COLORS.border,
    borderRadius: 1,
  },
  nodeRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  nodeColumn: {
    position: "absolute",
    left: -28,
    top: 14,
    width: 32,
    alignItems: "center",
    zIndex: 2,
  },
  nodeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  nodeName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 3,
  },
  nodeDates: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginBottom: 8,
  },
  nodeStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nodeStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  nodeStatusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  nodePct: {
    fontSize: 12,
    fontWeight: "700",
  },
  nodeProgressTrack: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.gold + "20",
    marginTop: 10,
    overflow: "hidden",
  },
  nodeProgressFill: {
    height: "100%",
    borderRadius: 1.5,
    backgroundColor: COLORS.gold,
  },
  // Empty states
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#F8FAFC",
  },
  emptyContent: {
    alignItems: "center",
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.gold + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    textAlign: "center",
    lineHeight: 21,
  },
  timelineEmpty: {
    alignItems: "center",
    paddingVertical: 48,
  },
  timelineEmptyText: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    textAlign: "center",
  },
});
