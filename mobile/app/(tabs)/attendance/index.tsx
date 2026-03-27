import React, { useCallback, useMemo } from "react";
import {
  View,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { ClipboardList, Package, Users, Clock, IndianRupee } from "lucide-react-native";
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeIn as ReanimatedFadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Text } from "../../../components/atoms/Text";
import { Card } from "../../../components/atoms/Card";
import { Badge } from "../../../components/atoms/Badge";
import { useToast } from "../../../components/molecules/Toast";
import { COLORS } from "../../../lib/constants";
import AttendanceForm from "../../../features/attendance/components/AttendanceForm";
import CheckInCard from "../../../features/checkin/components/CheckInCard";
import {
  useLogAttendance,
  useAttendanceLogs,
} from "../../../features/attendance/hooks";
import { AnimatedNumber } from "../../../components/animations/AnimatedNumber";
import { PressScale } from "../../../components/animations/PressScale";
import type { AttendanceFormValues } from "../../../features/attendance/components/AttendanceForm";
import type { AttendanceLog, AttendanceStatus } from "../../../types";
import { Platform } from "react-native";

// ============================================================
// Status badge mapping
// ============================================================

const STATUS_BADGE: Record<AttendanceStatus, { label: string; variant: "default" | "success" | "warning" | "secondary" }> = {
  PENDING: { label: "Pending", variant: "warning" },
  APPROVED_BY_MANAGER: { label: "Approved", variant: "success" },
  PAID: { label: "Paid", variant: "default" },
};

// ============================================================
// Attendance Log Item with animations
// ============================================================

function AttendanceLogItem({ item, index }: { item: AttendanceLog; index: number }) {
  const badge = STATUS_BADGE[item.status] || {
    label: item.status,
    variant: "secondary" as const,
  };
  const dateStr = new Date(item.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return (
    <Animated.View
      entering={index < 10 ? FadeInDown.duration(350).delay(index * 60).springify().damping(18) : undefined}
    >
      <Card padding="sm" className="mb-2">
        <View style={logStyles.row}>
          {/* Left color accent */}
          <View
            style={[
              logStyles.accent,
              {
                backgroundColor:
                  item.status === "PAID"
                    ? "#22C55E"
                    : item.status === "APPROVED_BY_MANAGER"
                    ? COLORS.gold
                    : COLORS.warning,
              },
            ]}
          />

          <View style={logStyles.content}>
            <View style={logStyles.topRow}>
              <Text variant="label" weight="semibold" style={{ flex: 1 }}>
                {item.team?.name || "Team"}
              </Text>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </View>

            <View style={logStyles.detailRow}>
              <View style={logStyles.detailItem}>
                <Users size={11} color={COLORS.mutedForeground} />
                <Text variant="caption" style={logStyles.detailText}>
                  {item.workers_present}
                </Text>
              </View>
              <View style={logStyles.detailItem}>
                <Clock size={11} color={COLORS.mutedForeground} />
                <Text variant="caption" style={logStyles.detailText}>
                  {item.total_hours}h
                </Text>
              </View>
              <Text variant="caption" style={{ color: COLORS.mutedForeground }}>
                {dateStr}
              </Text>
            </View>

            {item.notes ? (
              <Text
                variant="caption"
                style={logStyles.notes}
                numberOfLines={2}
              >
                {item.notes}
              </Text>
            ) : null}

            <Text
              variant="caption"
              weight="bold"
              style={logStyles.cost}
            >
              {"\u20B9"}{item.calculated_cost?.toLocaleString("en-IN") || "0"}
            </Text>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

const logStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    overflow: "hidden",
  },
  accent: {
    width: 3,
    borderRadius: 2,
    marginRight: 10,
    alignSelf: "stretch",
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  detailText: {
    color: COLORS.mutedForeground,
  },
  notes: {
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  cost: {
    color: COLORS.text,
    marginTop: 4,
    fontSize: 14,
  },
});

// ============================================================
// Main Screen
// ============================================================

export default function AttendanceScreen() {
  const router = useRouter();
  const toast = useToast();
  const logAttendance = useLogAttendance();
  const {
    data: recentLogs = [],
    isLoading,
    refetch,
    isRefetching,
  } = useAttendanceLogs({ limit: 20 });

  // Weekly cost summary
  const weeklySummary = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().split("T")[0];

    const thisWeek = recentLogs.filter((l) => l.date >= weekStr);
    const totalCost = thisWeek.reduce(
      (sum, l) => sum + (l.calculated_cost || 0),
      0
    );
    const totalWorkers = thisWeek.reduce(
      (sum, l) => sum + (l.workers_present || 0),
      0
    );
    const totalHours = thisWeek.reduce(
      (sum, l) => sum + (l.total_hours || 0),
      0
    );
    return { totalCost, totalWorkers, totalHours, count: thisWeek.length };
  }, [recentLogs]);

  const handleSubmit = useCallback(
    (data: AttendanceFormValues) => {
      logAttendance.mutate(
        {
          project_id: data.project_id,
          sprint_id: data.sprint_id,
          team_id: data.team_id,
          date: data.date,
          workers_present: parseInt(data.workers_present, 10),
          total_hours: parseFloat(data.total_hours),
          notes: data.notes || undefined,
        },
        {
          onSuccess: () => {
            toast.show("Attendance logged successfully", "success");
          },
          onError: (error: any) => {
            const message =
              error?.response?.data?.detail ?? "Failed to log attendance";
            toast.show(message, "error");
          },
        }
      );
    },
    [logAttendance]
  );

  const renderHeader = useCallback(
    () => (
      <View>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={headerStyles.container}
        >
          <Text variant="subtitle" weight="bold" style={{ color: COLORS.text }}>
            Site Attendance
          </Text>
          <PressScale
            onPress={() => router.push("/(tabs)/attendance/indent")}
            haptic
          >
            <View style={headerStyles.indentBtn}>
              <Package size={16} color={COLORS.gold} />
              <Text
                variant="caption"
                weight="semibold"
                style={{ color: COLORS.gold, marginLeft: 6 }}
              >
                Indent
              </Text>
            </View>
          </PressScale>
        </Animated.View>

        {/* GPS Check-In Card */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <CheckInCard />
        </View>

        {/* Attendance Form */}
        <View style={{ maxHeight: 600 }}>
          <AttendanceForm
            onSubmit={handleSubmit}
            isSubmitting={logAttendance.isPending}
          />
        </View>

        {/* Weekly Summary Card */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200).springify().damping(18)}
          style={{ paddingHorizontal: 16, paddingBottom: 12 }}
        >
          <View style={summaryStyles.card}>
            <Text style={summaryStyles.label}>THIS WEEK</Text>
            <View style={summaryStyles.row}>
              <SummaryItem
                icon={ClipboardList}
                value={weeklySummary.count}
                label="Entries"
                index={0}
              />
              <SummaryItem
                icon={Users}
                value={weeklySummary.totalWorkers}
                label="Workers"
                index={1}
              />
              <SummaryItem
                icon={IndianRupee}
                value={weeklySummary.totalCost}
                label="Cost"
                prefix={"\u20B9"}
                index={2}
              />
            </View>
          </View>
        </Animated.View>

        {/* Section Header */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(300)}
          style={headerStyles.sectionHeader}
        >
          <ClipboardList size={14} color={COLORS.mutedForeground} />
          <Text
            variant="label"
            weight="semibold"
            style={{ color: COLORS.mutedForeground, marginLeft: 6 }}
          >
            Recent Logs
          </Text>
        </Animated.View>
      </View>
    ),
    [handleSubmit, logAttendance.isPending, weeklySummary, router]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={emptyStyles.container}>
          <ActivityIndicator size="small" color={COLORS.gold} />
        </View>
      );
    }
    return (
      <Animated.View
        entering={ReanimatedFadeIn.duration(500)}
        style={emptyStyles.container}
      >
        <View style={emptyStyles.iconWrap}>
          <ClipboardList size={32} color={COLORS.gold} />
        </View>
        <Text variant="label" style={{ color: COLORS.text, marginTop: 10 }}>
          No attendance logs yet
        </Text>
        <Text
          variant="caption"
          style={{ color: COLORS.mutedForeground, marginTop: 4, textAlign: "center" }}
        >
          Mark attendance above to start tracking labor costs
        </Text>
      </Animated.View>
    );
  }, [isLoading]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <FlashList
        data={recentLogs}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <AttendanceLogItem item={item} index={index} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        // @ts-ignore - estimatedItemSize may vary by FlashList version
        estimatedItemSize={90}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={COLORS.gold}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ============================================================
// Summary Item
// ============================================================

function SummaryItem({
  icon: Icon,
  value,
  label,
  prefix = "",
  index,
}: {
  icon: typeof ClipboardList;
  value: number;
  label: string;
  prefix?: string;
  index: number;
}) {
  return (
    <Animated.View
      entering={FadeInRight.duration(300).delay(250 + index * 80)}
      style={summaryStyles.item}
    >
      <AnimatedNumber
        value={value}
        prefix={prefix}
        duration={600}
        style={summaryStyles.itemValue}
      />
      <Text style={summaryStyles.itemLabel}>{label}</Text>
    </Animated.View>
  );
}

// ============================================================
// Extra Styles
// ============================================================

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  indentBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.gold + "15",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});

const summaryStyles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.muted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.mutedForeground,
    letterSpacing: 1,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  item: {
    alignItems: "center",
    flex: 1,
  },
  itemValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    padding: 0,
  },
  itemLabel: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.gold + "15",
    alignItems: "center",
    justifyContent: "center",
  },
});
