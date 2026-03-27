import React, { useCallback } from "react";
import {
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Package } from "lucide-react-native";
import { Text } from "../../../components/atoms/Text";
import { Card } from "../../../components/atoms/Card";
import { Badge } from "../../../components/atoms/Badge";
import { useToast } from "../../../components/molecules/Toast";
import { COLORS } from "../../../lib/constants";
import IndentForm from "../../../features/materials/components/IndentForm";
import {
  useCreateIndent,
  useIndents,
} from "../../../features/materials/hooks";
import type { IndentFormValues } from "../../../features/materials/components/IndentForm";
import type { MaterialRequest, MaterialRequestStatus } from "../../../types";

// ============================================================
// Status badge mapping
// ============================================================

const STATUS_BADGE: Record<
  MaterialRequestStatus,
  { label: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" }
> = {
  PENDING: { label: "Pending", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  PARTIALLY_APPROVED: { label: "Partial", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  FULFILLED: { label: "Fulfilled", variant: "success" },
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: COLORS.mutedForeground,
  MEDIUM: COLORS.gold,
  HIGH: "#F97316",
  URGENT: COLORS.destructive,
};

// ============================================================
// Indent Request Item
// ============================================================

function IndentItem({ item }: { item: MaterialRequest }) {
  const badge = STATUS_BADGE[item.status] || {
    label: item.status,
    variant: "secondary" as const,
  };
  const dateStr = new Date(item.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return (
    <Card padding="sm" className="mb-2">
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-3">
          <Text variant="label" weight="semibold">
            {item.items_count} item{item.items_count !== 1 ? "s" : ""} requested
          </Text>
          <Text
            variant="caption"
            className="mt-0.5"
            style={{ color: COLORS.mutedForeground }}
          >
            {dateStr} | {item.project_name}
          </Text>
          {item.items && item.items.length > 0 ? (
            <Text
              variant="caption"
              className="mt-1"
              style={{ color: COLORS.mutedForeground }}
              numberOfLines={1}
            >
              {item.items
                .map((i) => `${i.item_name} (${i.quantity_requested})`)
                .join(", ")}
            </Text>
          ) : null}
          {item.notes ? (
            <Text
              variant="caption"
              className="mt-0.5"
              style={{ color: COLORS.mutedForeground }}
              numberOfLines={1}
            >
              {item.notes}
            </Text>
          ) : null}
        </View>
        <View className="items-end">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          {item.urgency ? (
            <Text
              variant="caption"
              weight="semibold"
              className="mt-1"
              style={{ color: PRIORITY_COLORS[item.urgency] || COLORS.text }}
            >
              {item.urgency}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

// ============================================================
// Main Screen
// ============================================================

export default function IndentScreen() {
  const router = useRouter();
  const toast = useToast();
  const createIndent = useCreateIndent();
  const {
    data: recentIndents = [],
    isLoading,
    refetch,
    isRefetching,
  } = useIndents({ limit: 20 });

  const handleSubmit = useCallback(
    (data: IndentFormValues) => {
      createIndent.mutate(
        {
          project_id: data.project_id,
          urgency: data.priority,
          notes: data.notes || undefined,
          items: [
            {
              item_id: data.item_id,
              quantity_requested: parseFloat(data.quantity),
              notes: data.notes || undefined,
            },
          ],
        },
        {
          onSuccess: () => {
            toast.show("Material indent submitted successfully", "success");
          },
          onError: (error: any) => {
            const message =
              error?.response?.data?.detail ??
              "Failed to submit indent request";
            toast.show(message, "error");
          },
        }
      );
    },
    [createIndent]
  );

  const renderHeader = useCallback(
    () => (
      <View>
        {/* Header */}
        <View
          className="flex-row items-center px-4 py-3 border-b"
          style={{
            borderBottomColor: COLORS.border,
            backgroundColor: COLORS.background,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={12} className="mr-3">
            <ArrowLeft size={22} color={COLORS.text} />
          </Pressable>
          <Text variant="subtitle" weight="bold" style={{ color: COLORS.text }}>
            Material Indent
          </Text>
        </View>

        {/* Indent Form */}
        <View style={{ maxHeight: 600 }}>
          <IndentForm
            onSubmit={handleSubmit}
            isSubmitting={createIndent.isPending}
          />
        </View>

        {/* Section Header */}
        <View className="flex-row items-center px-4 py-2">
          <Package size={16} color={COLORS.mutedForeground} />
          <Text
            variant="label"
            weight="semibold"
            className="ml-1.5"
            style={{ color: COLORS.mutedForeground }}
          >
            Recent Requests
          </Text>
        </View>
      </View>
    ),
    [handleSubmit, createIndent.isPending, router]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View className="items-center py-8">
          <ActivityIndicator size="small" color={COLORS.gold} />
        </View>
      );
    }
    return (
      <View className="items-center py-8 px-4">
        <Package size={32} color={COLORS.border} />
        <Text
          variant="label"
          className="mt-2"
          style={{ color: COLORS.mutedForeground }}
        >
          No indent requests yet
        </Text>
        <Text
          variant="caption"
          className="mt-1 text-center"
          style={{ color: COLORS.mutedForeground }}
        >
          Submit a material indent above to request supplies
        </Text>
      </View>
    );
  }, [isLoading]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#F8FAFC" }}>
      <FlatList
        data={recentIndents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <IndentItem item={item} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
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
