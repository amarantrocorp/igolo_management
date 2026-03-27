import React, { useCallback, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { Badge } from "../../../components/atoms/Badge";
import { COLORS } from "../../../lib/constants";
import { formatDate } from "../../../lib/format";
import type { Sprint, SprintStatus } from "../../../types";

const STATUS_BADGE_VARIANTS: Record<
  SprintStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  PENDING: "secondary",
  ACTIVE: "default",
  COMPLETED: "success",
  DELAYED: "destructive",
};

const STATUS_LABELS: Record<SprintStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  DELAYED: "Delayed",
};

interface SprintCardProps {
  sprint: Sprint;
  onUpdateCompletion?: (sprintId: string, percentage: number) => void;
  /** When true the +/- controls are hidden (e.g. for CLIENT role). */
  readOnly?: boolean;
}

export default function SprintCard({
  sprint,
  onUpdateCompletion,
  readOnly = false,
}: SprintCardProps) {
  const completionPct = sprint.completion_percentage ?? 0;
  const [localPct, setLocalPct] = useState(completionPct);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const isActive = sprint.status === "ACTIVE";
  const variant = STATUS_BADGE_VARIANTS[sprint.status] ?? "secondary";

  const scheduleUpdate = useCallback(
    (newPct: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdateCompletion?.(sprint.id, newPct);
      }, 500);
    },
    [sprint.id, onUpdateCompletion]
  );

  const handleIncrement = useCallback(() => {
    setLocalPct((prev) => {
      const next = Math.min(prev + 5, 100);
      scheduleUpdate(next);
      return next;
    });
  }, [scheduleUpdate]);

  const handleDecrement = useCallback(() => {
    setLocalPct((prev) => {
      const next = Math.max(prev - 5, 0);
      scheduleUpdate(next);
      return next;
    });
  }, [scheduleUpdate]);

  // Progress bar color
  const progressColor =
    sprint.status === "COMPLETED"
      ? "#22C55E"
      : sprint.status === "DELAYED"
        ? "#EF4444"
        : sprint.status === "ACTIVE"
          ? "#3B82F6"
          : "#94A3B8";

  const displayPct = isActive ? localPct : completionPct;

  return (
    <View
      className="bg-white rounded-xl p-4 mb-3"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
        ...(isActive
          ? {
              borderLeftWidth: 3,
              borderLeftColor: "#3B82F6",
            }
          : {}),
      }}
    >
      {/* Header: Name + Badge */}
      <View className="flex-row items-center justify-between mb-2">
        <Text
          className="text-sm font-semibold flex-1 mr-2"
          style={{ color: COLORS.text }}
          numberOfLines={1}
        >
          {sprint.name ?? `Sprint ${sprint.sequence_order}`}
        </Text>
        <Badge variant={variant}>
          {STATUS_LABELS[sprint.status] ?? sprint.status}
        </Badge>
      </View>

      {/* Date Range */}
      <Text className="text-xs mb-2.5" style={{ color: COLORS.mutedForeground }}>
        {formatDate(sprint.start_date)} &mdash; {formatDate(sprint.end_date)}
      </Text>

      {/* Progress Bar */}
      <View className="mb-1">
        <View className="flex-row items-center justify-between mb-1">
          <Text
            className="text-[10px] font-medium"
            style={{ color: COLORS.mutedForeground }}
          >
            Completion
          </Text>
          <Text
            className="text-[10px] font-semibold"
            style={{ color: progressColor }}
          >
            {displayPct}%
          </Text>
        </View>
        <View
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: COLORS.border }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: `${displayPct}%`,
              backgroundColor: progressColor,
            }}
          />
        </View>
      </View>

      {/* Increment/Decrement for Active sprint (hidden in readOnly mode) */}
      {isActive && onUpdateCompletion && !readOnly ? (
        <View className="flex-row items-center justify-center mt-3 gap-4">
          <Pressable
            onPress={handleDecrement}
            hitSlop={8}
            className="w-9 h-9 rounded-full items-center justify-center border"
            style={{
              borderColor: COLORS.border,
              opacity: localPct <= 0 ? 0.4 : 1,
            }}
            disabled={localPct <= 0}
          >
            <Minus size={16} color={COLORS.mutedForeground} />
          </Pressable>
          <Text
            className="text-lg font-bold w-14 text-center"
            style={{ color: "#3B82F6" }}
          >
            {localPct}%
          </Text>
          <Pressable
            onPress={handleIncrement}
            hitSlop={8}
            className="w-9 h-9 rounded-full items-center justify-center border"
            style={{
              borderColor: "#3B82F6",
              backgroundColor: "#EFF6FF",
              opacity: localPct >= 100 ? 0.4 : 1,
            }}
            disabled={localPct >= 100}
          >
            <Plus size={16} color="#3B82F6" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
