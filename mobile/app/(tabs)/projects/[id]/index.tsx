import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Calendar,
  User,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react-native";
import {
  useProject,
  useUpdateSprint,
  useProjectTransactions,
} from "../../../../features/projects/hooks";
import SprintTimeline from "../../../../features/projects/components/SprintTimeline";
import SprintCard from "../../../../features/projects/components/SprintCard";
import WalletSummary from "../../../../features/projects/components/WalletSummary";
import { Badge } from "../../../../components/atoms/Badge";
import { Button } from "../../../../components/atoms/Button";
import { COLORS } from "../../../../lib/constants";
import { usePermission } from "../../../../lib/role-guard";
import { formatDate, formatINR, formatRelativeTime } from "../../../../lib/format";
import type {
  ProjectStatus,
  SprintStatus,
  Transaction,
  TransactionCategory,
} from "../../../../types";

// ---------------------
// Constants
// ---------------------

const STATUS_BADGE_VARIANTS: Record<
  ProjectStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  NOT_STARTED: "secondary",
  IN_PROGRESS: "default",
  ON_HOLD: "warning",
  COMPLETED: "success",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
};

// ---------------------
// Sub-components
// ---------------------

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <View
      className="flex-row items-start py-2.5 border-b"
      style={{ borderBottomColor: COLORS.border + "60" }}
    >
      <View className="w-8 h-8 rounded-lg bg-gray-50 items-center justify-center mr-3">
        <Icon size={14} color={COLORS.mutedForeground} />
      </View>
      <View className="flex-1">
        <Text
          className="text-[10px] mb-0.5"
          style={{ color: COLORS.mutedForeground }}
        >
          {label}
        </Text>
        <Text className="text-sm" style={{ color: COLORS.text }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const isInflow = transaction.category === "INFLOW";
  return (
    <View
      className="flex-row items-center py-3 border-b"
      style={{ borderBottomColor: COLORS.border + "40" }}
    >
      <View
        className="w-8 h-8 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: isInflow ? "#DCFCE7" : "#FEE2E2" }}
      >
        {isInflow ? (
          <ArrowDownCircle size={14} color={COLORS.success} />
        ) : (
          <ArrowUpCircle size={14} color={COLORS.destructive} />
        )}
      </View>
      <View className="flex-1 mr-2">
        <Text
          className="text-sm"
          style={{ color: COLORS.text }}
          numberOfLines={1}
        >
          {transaction.description || transaction.source}
        </Text>
        <Text className="text-[10px]" style={{ color: COLORS.mutedForeground }}>
          {formatRelativeTime(transaction.created_at)} &middot;{" "}
          {transaction.source}
        </Text>
      </View>
      <Text
        className="text-sm font-semibold"
        style={{ color: isInflow ? COLORS.success : COLORS.destructive }}
      >
        {isInflow ? "+" : "-"}
        {formatINR(transaction.amount ?? 0)}
      </Text>
    </View>
  );
}

// ---------------------
// Main Screen
// ---------------------

type TabName = "overview" | "sprints" | "finance";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabName>("overview");

  const canUpdateSprints = usePermission("canUpdateSprints");
  const projectQuery = useProject(id);
  const updateSprint = useUpdateSprint();
  const transactionsQuery = useProjectTransactions(id);

  const project = projectQuery.data;

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSprintCompletion = useCallback(
    (sprintId: string, percentage: number) => {
      if (!id) return;
      updateSprint.mutate({
        projectId: id,
        sprintId,
        data: { completion_percentage: percentage },
      });
    },
    [id, updateSprint]
  );

  // Loading
  if (projectQuery.isLoading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: "#F8FAFC" }}
      >
        <ActivityIndicator size="large" color={COLORS.gold} />
      </SafeAreaView>
    );
  }

  // Not found
  if (!project) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: "#F8FAFC" }}
      >
        <Text
          className="text-base"
          style={{ color: COLORS.mutedForeground }}
        >
          Project not found
        </Text>
        <Button variant="ghost" onPress={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  const sprints = [...(project.sprints ?? [])].sort(
    (a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0)
  );
  const wallet = project.wallet;
  const statusVariant = STATUS_BADGE_VARIANTS[project.status] ?? "secondary";
  const clientName =
    project.client?.user?.full_name ??
    project.client?.lead?.name ??
    "Client";

  const transactions = transactionsQuery.data ?? [];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#F8FAFC" }}>
      {/* Header */}
      <View
        className="px-4 py-3 border-b"
        style={{
          borderBottomColor: COLORS.border,
          backgroundColor: COLORS.background,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <Pressable onPress={handleGoBack} hitSlop={12} className="mr-3">
              <ArrowLeft size={22} color={COLORS.text} />
            </Pressable>
            <Text
              className="text-lg font-bold flex-1 mr-2"
              style={{ color: COLORS.text }}
              numberOfLines={1}
            >
              {clientName}
            </Text>
          </View>
          <Badge variant={statusVariant}>
            {STATUS_LABELS[project.status] ?? project.status}
          </Badge>
        </View>
      </View>

      {/* Tabs */}
      <View
        className="flex-row border-b"
        style={{ borderBottomColor: COLORS.border }}
      >
        {(["overview", "sprints", "finance"] as TabName[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className="flex-1 py-3 items-center"
            style={
              activeTab === tab
                ? {
                    borderBottomWidth: 2,
                    borderBottomColor: COLORS.gold,
                  }
                : undefined
            }
          >
            <Text
              className="text-sm font-medium capitalize"
              style={{
                color:
                  activeTab === tab ? COLORS.gold : COLORS.mutedForeground,
              }}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={projectQuery.isRefetching}
            onRefresh={() => {
              projectQuery.refetch();
              transactionsQuery.refetch();
            }}
            tintColor={COLORS.gold}
            colors={[COLORS.gold]}
          />
        }
      >
        {activeTab === "overview" ? (
          <View>
            {/* Client Info */}
            <Text
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: COLORS.mutedForeground }}
            >
              Project Details
            </Text>
            <View
              className="bg-white rounded-xl p-3 mb-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <InfoRow icon={User} label="Client" value={clientName} />
              <InfoRow
                icon={Calendar}
                label="Start Date"
                value={formatDate(project.start_date)}
              />
              <InfoRow
                icon={Calendar}
                label="Expected End"
                value={formatDate(project.expected_end_date)}
              />
            </View>

            {/* Project Value */}
            <Text
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: COLORS.mutedForeground }}
            >
              Project Value
            </Text>
            <View
              className="bg-white rounded-xl p-4 mb-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <Text
                className="text-2xl font-bold"
                style={{ color: COLORS.text }}
              >
                {formatINR(project.total_project_value ?? 0)}
              </Text>
            </View>

            {/* Wallet Summary */}
            {wallet ? (
              <>
                <Text
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: COLORS.mutedForeground }}
                >
                  Financial Summary
                </Text>
                <WalletSummary
                  totalAgreedValue={wallet.total_agreed_value ?? 0}
                  totalReceived={wallet.total_received ?? 0}
                  totalSpent={wallet.total_spent ?? 0}
                  currentBalance={wallet.current_balance ?? 0}
                  pendingApprovals={wallet.pending_approvals ?? 0}
                />
              </>
            ) : null}
          </View>
        ) : activeTab === "sprints" ? (
          <View>
            {/* Sprint Timeline */}
            <Text
              className="text-xs font-semibold uppercase tracking-wider mb-1"
              style={{ color: COLORS.mutedForeground }}
            >
              Timeline
            </Text>
            <View className="mb-4 -mx-4">
              <SprintTimeline sprints={sprints} />
            </View>

            {/* Sprint Cards */}
            <Text
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: COLORS.mutedForeground }}
            >
              Sprint Details
            </Text>
            {sprints.length > 0 ? (
              sprints.map((sprint) => (
                <SprintCard
                  key={sprint.id}
                  sprint={sprint}
                  onUpdateCompletion={handleSprintCompletion}
                  readOnly={!canUpdateSprints}
                />
              ))
            ) : (
              <View className="py-12 items-center">
                <Text
                  className="text-sm"
                  style={{ color: COLORS.mutedForeground }}
                >
                  No sprints available
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* Finance Tab */
          <View>
            {/* Wallet Summary */}
            {wallet ? (
              <View className="mb-4">
                <WalletSummary
                  totalAgreedValue={wallet.total_agreed_value ?? 0}
                  totalReceived={wallet.total_received ?? 0}
                  totalSpent={wallet.total_spent ?? 0}
                  currentBalance={wallet.current_balance ?? 0}
                  pendingApprovals={wallet.pending_approvals ?? 0}
                />
              </View>
            ) : null}

            {/* Recent Transactions */}
            <Text
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: COLORS.mutedForeground }}
            >
              Recent Transactions
            </Text>
            {transactionsQuery.isLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="small" color={COLORS.gold} />
              </View>
            ) : transactions.length > 0 ? (
              <View
                className="bg-white rounded-xl px-4"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.03,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                {transactions.map((txn) => (
                  <TransactionItem key={txn.id} transaction={txn} />
                ))}
              </View>
            ) : (
              <View className="py-12 items-center">
                <Text
                  className="text-sm"
                  style={{ color: COLORS.mutedForeground }}
                >
                  No transactions yet
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
