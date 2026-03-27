import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Linking,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeIn,
  SlideInRight,
} from "react-native-reanimated";
import {
  Users,
  FolderKanban,
  IndianRupee,
  Bell,
  ChevronRight,
  Phone,
  TrendingUp,
} from "lucide-react-native";
import { format } from "date-fns";

import { useAuth } from "../../features/auth/hooks";
import {
  useDashboardStats,
  useRecentLeads,
  useActiveProjects,
} from "../../features/dashboard/hooks";
import KPICard from "../../features/dashboard/components/KPICard";
import { AnimatedProgressBar } from "../../components/atoms/AnimatedProgressBar";
import { Avatar } from "../../components/atoms/Avatar";
import { Badge } from "../../components/atoms/Badge";
import { COLORS } from "../../lib/constants";
import { formatINR, formatRelativeTime } from "../../lib/format";
import type { Lead, Project, LeadStatus, ProjectStatus, SprintStatus } from "../../types";

// ─── Constants ──────────────────────────────────────────
const LEAD_SOURCE_COLORS: Record<string, string> = {
  Website: "#3B82F6",
  Referral: "#22C55E",
  "Social Media": "#8B5CF6",
  "Walk-in": "#F59E0B",
  "Just Dial": "#EC4899",
  default: COLORS.gold,
};

const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: "#3B82F6",
  CONTACTED: "#8B5CF6",
  QUALIFIED: "#F59E0B",
  QUOTATION_SENT: "#06B6D4",
  NEGOTIATION: "#EC4899",
  CONVERTED: "#22C55E",
  LOST: "#EF4444",
};

const PROJECT_STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; color: string }
> = {
  NOT_STARTED: { label: "Not Started", color: "#94A3B8" },
  IN_PROGRESS: { label: "In Progress", color: "#3B82F6" },
  ON_HOLD: { label: "On Hold", color: "#F59E0B" },
  COMPLETED: { label: "Completed", color: "#22C55E" },
};

const SPRINT_STATUS_COLORS: Record<SprintStatus, string> = {
  PENDING: "#94A3B8",
  ACTIVE: "#3B82F6",
  COMPLETED: "#22C55E",
  DELAYED: "#EF4444",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Section Header ─────────────────────────────────────
function SectionHeader({
  title,
  onViewAll,
  index = 0,
}: {
  title: string;
  onViewAll?: () => void;
  index?: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(400 + index * 100).duration(500)}
      style={styles.sectionHeader}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      {onViewAll ? (
        <Pressable
          onPress={onViewAll}
          hitSlop={12}
          style={styles.viewAllButton}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <ChevronRight size={14} color={COLORS.gold} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

// ─── Lead Card (Horizontal Scroll) ──────────────────────
function LeadMiniCard({
  lead,
  onPress,
  index,
}: {
  lead: Lead;
  onPress: () => void;
  index: number;
}) {
  const statusColor = LEAD_STATUS_COLORS[lead.status] ?? COLORS.mutedForeground;
  const sourceColor =
    LEAD_SOURCE_COLORS[lead.source] ?? LEAD_SOURCE_COLORS.default;

  const handleCall = useCallback(() => {
    if (lead.contact_number) {
      Linking.openURL(`tel:${lead.contact_number}`);
    }
  }, [lead.contact_number]);

  return (
    <Animated.View
      entering={SlideInRight.delay(500 + index * 80)
        .duration(400)
        .springify()
        .damping(18)}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.leadCard,
          pressed && styles.cardPressed,
        ]}
      >
        {/* Source gradient left border */}
        <View
          style={[styles.leadSourceBar, { backgroundColor: sourceColor }]}
        />

        <View style={styles.leadCardContent}>
          {/* Header row */}
          <View style={styles.leadCardHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.leadName} numberOfLines={1}>
                {lead.name}
              </Text>
              {lead.location ? (
                <Text style={styles.leadLocation} numberOfLines={1}>
                  {lead.location}
                </Text>
              ) : null}
            </View>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: statusColor + "15" },
              ]}
            >
              <Text style={[styles.statusPillText, { color: statusColor }]}>
                {lead.status.replace(/_/g, " ")}
              </Text>
            </View>
          </View>

          {/* Footer row */}
          <View style={styles.leadCardFooter}>
            <Text style={styles.leadTime}>
              {formatRelativeTime(lead.created_at)}
            </Text>
            {lead.contact_number ? (
              <Pressable
                onPress={handleCall}
                hitSlop={8}
                style={styles.callButton}
                accessibilityLabel="Call"
                accessibilityRole="button"
              >
                <Phone size={12} color={COLORS.gold} />
                <Text style={styles.callText}>Call</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const MemoizedLeadMiniCard = React.memo(LeadMiniCard);

// ─── Project Card (Vertical) ────────────────────────────
function ProjectCard({
  project,
  onPress,
  index,
}: {
  project: Project;
  onPress: () => void;
  index: number;
}) {
  const completedSprints =
    project.sprints?.filter((s) => s.status === "COMPLETED").length ?? 0;
  const totalSprints = project.sprints?.length ?? 6;
  const progress =
    totalSprints > 0
      ? Math.round((completedSprints / totalSprints) * 100)
      : 0;

  const statusCfg = PROJECT_STATUS_CONFIG[project.status];
  const received = project.wallet?.total_received ?? 0;
  const projectValue = project.total_project_value ?? 0;

  // Find the currently active sprint
  const activeSprint = project.sprints?.find((s) => s.status === "ACTIVE");

  return (
    <Animated.View
      entering={FadeInDown.delay(600 + index * 120)
        .duration(500)
        .springify()
        .damping(16)}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.projectCard,
          pressed && styles.cardPressed,
        ]}
      >
        {/* Header */}
        <View style={styles.projectHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.projectName} numberOfLines={1}>
              {project.client?.lead?.name ?? "Project"}
            </Text>
            {project.client?.lead?.location ? (
              <Text style={styles.projectClient} numberOfLines={1}>
                {project.client.lead.location}
              </Text>
            ) : null}
          </View>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: statusCfg.color + "15" },
            ]}
          >
            <Text
              style={[styles.statusPillText, { color: statusCfg.color }]}
            >
              {statusCfg.label}
            </Text>
          </View>
        </View>

        {/* Active Sprint badge */}
        {activeSprint ? (
          <View style={styles.sprintBadgeRow}>
            <View style={styles.sprintDot} />
            <Text style={styles.sprintText} numberOfLines={1}>
              {activeSprint.name}
            </Text>
          </View>
        ) : null}

        {/* Sprint status dots */}
        {project.sprints && project.sprints.length > 0 ? (
          <View style={styles.sprintDotsRow}>
            {project.sprints
              .sort((a, b) => a.sequence_order - b.sequence_order)
              .map((sprint) => (
                <View
                  key={sprint.id}
                  style={[
                    styles.sprintStatusDot,
                    {
                      backgroundColor:
                        SPRINT_STATUS_COLORS[sprint.status] ?? "#94A3B8",
                    },
                  ]}
                />
              ))}
            <Text style={styles.sprintDotsLabel}>
              {completedSprints}/{totalSprints} sprints
            </Text>
          </View>
        ) : null}

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressValue}>{progress}%</Text>
          </View>
          <AnimatedProgressBar
            value={progress}
            color={COLORS.gold}
            height={5}
            delay={700 + index * 120}
            duration={800}
          />
        </View>

        {/* Financial mini summary */}
        <View style={styles.financialRow}>
          <View style={styles.financialItem}>
            <TrendingUp size={12} color="#22C55E" />
            <Text style={styles.financialLabel}> Received</Text>
            <Text style={styles.financialValue}>
              {formatINR(received)}
            </Text>
          </View>
          <View style={styles.financialDivider} />
          <View style={styles.financialItem}>
            <IndianRupee size={12} color={COLORS.mutedForeground} />
            <Text style={styles.financialLabel}> Value</Text>
            <Text style={styles.financialValue}>
              {formatINR(projectValue)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const MemoizedProjectCard = React.memo(ProjectCard);

// ─── Skeleton Loading State ─────────────────────────────
function DashboardSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header skeleton */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <View
            style={{
              width: 200,
              height: 24,
              borderRadius: 8,
              backgroundColor: "#E2E8F0",
              marginBottom: 8,
            }}
          />
          <View
            style={{
              width: 80,
              height: 20,
              borderRadius: 10,
              backgroundColor: "#E2E8F0",
            }}
          />
        </View>
        {/* KPI skeleton */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <KPICard
              type="leads"
              icon={Users}
              label=""
              value={0}
              loading
              index={0}
            />
            <KPICard
              type="projects"
              icon={FolderKanban}
              label=""
              value={0}
              loading
              index={1}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <KPICard
              type="payments"
              icon={IndianRupee}
              label=""
              value={0}
              loading
              index={2}
            />
            <KPICard
              type="notifications"
              icon={Bell}
              label=""
              value={0}
              loading
              index={3}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Main Dashboard ─────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter();
  const { user, roleInOrg, activeOrgName } = useAuth();
  const stats = useDashboardStats();
  const recentLeadsQuery = useRecentLeads();
  const activeProjectsQuery = useActiveProjects();

  const isRefreshing = stats.isRefetching || recentLeadsQuery.isRefetching;

  const handleRefresh = useCallback(() => {
    stats.refetchAll();
    recentLeadsQuery.refetch();
    activeProjectsQuery.refetch();
  }, [stats, recentLeadsQuery, activeProjectsQuery]);

  const handleLeadPress = useCallback(
    (id: string) => {
      router.push(`/(tabs)/leads/${id}`);
    },
    [router]
  );

  const handleProjectPress = useCallback(
    (id: string) => {
      router.push(`/(tabs)/projects/${id}`);
    },
    [router]
  );

  const roleLabel = roleInOrg?.replace(/_/g, " ") ?? "Member";
  const todayFormatted = format(new Date(), "EEEE, d MMM");
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  if (stats.isLoading) {
    return <DashboardSkeleton />;
  }

  if (recentLeadsQuery.isError || activeProjectsQuery.isError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.text, marginBottom: 8 }}>
            Something went wrong
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.mutedForeground, textAlign: "center", marginBottom: 16 }}>
            Could not load dashboard data. Please try again.
          </Text>
          <Pressable
            onPress={handleRefresh}
            style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.gold }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.gold}
            colors={[COLORS.gold]}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        {/* ── Header ────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(500)}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.greetingRow}>
                <Text style={styles.greeting}>
                  {getGreeting()},{" "}
                </Text>
                <Text style={styles.greetingName}>{firstName}</Text>
                <Text style={styles.greeting}> {"\ud83d\udc4b"}</Text>
              </View>
              <Text style={styles.dateText}>{todayFormatted}</Text>
              {activeOrgName ? (
                <Text style={styles.orgNameText}>{activeOrgName}</Text>
              ) : null}
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{roleLabel}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── KPI Grid ──────────────────────────── */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiRow}>
            <KPICard
              type="leads"
              icon={Users}
              label="Total Leads"
              value={stats.leadCount}
              index={0}
            />
            <KPICard
              type="projects"
              icon={FolderKanban}
              label="Active Projects"
              value={stats.activeProjectCount}
              index={1}
            />
          </View>
          <View style={styles.kpiRow}>
            <KPICard
              type="payments"
              icon={IndianRupee}
              label="Pending Payments"
              value={formatINR(stats.pendingPayments)}
              index={2}
            />
            <KPICard
              type="notifications"
              icon={Bell}
              label="Unread Alerts"
              value={stats.notificationCount}
              index={3}
            />
          </View>
        </View>

        {/* ── Recent Leads ──────────────────────── */}
        {recentLeadsQuery.data && recentLeadsQuery.data.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title="Recent Leads"
              onViewAll={() => router.push("/(tabs)/leads")}
              index={0}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              decelerationRate="fast"
              snapToInterval={216}
              snapToAlignment="start"
            >
              {recentLeadsQuery.data.map((lead, idx) => (
                <MemoizedLeadMiniCard
                  key={lead.id}
                  lead={lead}
                  index={idx}
                  onPress={() => handleLeadPress(lead.id)}
                />
              ))}
            </ScrollView>
          </View>
        ) : !recentLeadsQuery.isLoading ? (
          <View style={styles.section}>
            <SectionHeader title="Recent Leads" index={0} />
            <View style={{ paddingHorizontal: 20 }}>
              <Animated.View
                entering={FadeInDown.delay(500).duration(400)}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 14,
                  padding: 20,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "rgba(226, 232, 240, 0.5)",
                  borderStyle: "dashed",
                }}
              >
                <Text style={{ fontSize: 14, color: COLORS.mutedForeground, marginBottom: 12, textAlign: "center" }}>
                  No leads yet — Create your first lead
                </Text>
                <Pressable
                  onPress={() => router.push("/(tabs)/leads/new")}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: COLORS.gold,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>Create Lead</Text>
                </Pressable>
              </Animated.View>
            </View>
          </View>
        ) : null}

        {/* ── Active Projects ───────────────────── */}
        {activeProjectsQuery.data && activeProjectsQuery.data.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Active Projects" index={1} />
            <View style={{ paddingHorizontal: 20 }}>
              {activeProjectsQuery.data.map((project, idx) => (
                <MemoizedProjectCard
                  key={project.id}
                  project={project}
                  index={idx}
                  onPress={() => handleProjectPress(project.id)}
                />
              ))}
            </View>
          </View>
        ) : !activeProjectsQuery.isLoading ? (
          <View style={styles.section}>
            <SectionHeader title="Active Projects" index={1} />
            <View style={{ paddingHorizontal: 20 }}>
              <Animated.View
                entering={FadeInDown.delay(600).duration(400)}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 14,
                  padding: 20,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "rgba(226, 232, 240, 0.5)",
                  borderStyle: "dashed",
                }}
              >
                <Text style={{ fontSize: 14, color: COLORS.mutedForeground, textAlign: "center" }}>
                  No active projects yet.
                </Text>
              </Animated.View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  greeting: {
    fontSize: 20,
    fontWeight: "400",
    color: COLORS.text,
    lineHeight: 28,
  },
  greetingName: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    lineHeight: 28,
  },
  dateText: {
    fontSize: 13,
    fontWeight: "400",
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  orgNameText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.gold,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.gold + "1A",
    marginTop: 2,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.gold,
    textTransform: "capitalize",
    letterSpacing: 0.3,
  },

  // KPI
  kpiGrid: {
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 12,
  },

  // Sections
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.gold,
    marginRight: 2,
  },

  // Lead Cards
  leadCard: {
    width: 204,
    marginRight: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  leadSourceBar: {
    width: 3.5,
  },
  leadCardContent: {
    flex: 1,
    padding: 12,
  },
  leadCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  leadName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  leadLocation: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  leadCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leadTime: {
    fontSize: 10,
    color: COLORS.mutedForeground,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: COLORS.gold + "14",
  },
  callText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.gold,
    marginLeft: 3,
  },

  // Project Cards
  projectCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.5)",
  },
  projectHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  projectName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  projectClient: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },

  // Sprint badges
  sprintBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(59, 130, 246, 0.06)",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  sprintDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3B82F6",
    marginRight: 6,
  },
  sprintText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#3B82F6",
  },

  // Sprint status dots
  sprintDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 4,
  },
  sprintStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sprintDotsLabel: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    marginLeft: 4,
    fontWeight: "500",
  },

  // Progress
  progressSection: {
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    color: COLORS.gold,
  },

  // Financial summary
  financialRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(248, 250, 252, 0.8)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  financialItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  financialLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: COLORS.mutedForeground,
  },
  financialValue: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
    marginLeft: 4,
  },
  financialDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },

  // Pressed state
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
});
