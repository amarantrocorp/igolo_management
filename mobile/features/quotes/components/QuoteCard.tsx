import React, { useCallback, useMemo } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import {
  FileText,
  Pencil,
  Send,
  CheckCircle2,
  XCircle,
  Archive,
} from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";
import { Text } from "../../../components/atoms/Text";
import { formatINR, formatDate } from "../../../lib/format";
import { COLORS } from "../../../lib/constants";
import type { Quotation, QuoteStatus } from "../../../types";

interface QuoteCardProps {
  quote: Quotation;
  index?: number;
}

const STATUS_CONFIG: Record<
  QuoteStatus,
  { color: string; bg: string; icon: React.ReactNode; label: string }
> = {
  DRAFT: {
    color: "#64748B",
    bg: "#F1F5F9",
    icon: <Pencil size={11} color="#64748B" strokeWidth={2.5} />,
    label: "Draft",
  },
  SENT: {
    color: "#3B82F6",
    bg: "#EFF6FF",
    icon: <Send size={11} color="#3B82F6" strokeWidth={2.5} />,
    label: "Sent",
  },
  APPROVED: {
    color: "#22C55E",
    bg: "#F0FDF4",
    icon: <CheckCircle2 size={11} color="#22C55E" strokeWidth={2.5} />,
    label: "Approved",
  },
  REJECTED: {
    color: "#EF4444",
    bg: "#FEF2F2",
    icon: <XCircle size={11} color="#EF4444" strokeWidth={2.5} />,
    label: "Rejected",
  },
  ARCHIVED: {
    color: "#94A3B8",
    bg: "#F8FAFC",
    icon: <Archive size={11} color="#94A3B8" strokeWidth={2.5} />,
    label: "Archived",
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function QuoteCardInner({ quote, index = 0 }: QuoteCardProps) {
  const router = useRouter();
  const scale = useSharedValue(1);

  const handlePress = useCallback(() => {
    router.push(`/(tabs)/quotes/${quote.id}`);
  }, [quote.id, router]);

  const roomCount = quote.rooms?.length ?? 0;
  const itemCount = useMemo(
    () =>
      quote.rooms?.reduce((sum, room) => sum + (room.items?.length ?? 0), 0) ??
      0,
    [quote.rooms]
  );

  const truncatedId = quote.id.slice(0, 8).toUpperCase();
  const leadName = quote.lead?.name ?? "Unknown";
  const statusConfig = STATUS_CONFIG[quote.status];

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      entering={index < 10 ? FadeInDown.delay(index * 60).duration(400).springify() : undefined}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPress={handlePress}
      style={[styles.card, cardStyle]}
      accessibilityLabel={`Quotation ${truncatedId} for ${leadName}, ${statusConfig.label}, ${formatINR(quote.total_amount)}`}
    >
      {/* Top Row: Icon + ID + Version + Status */}
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <FileText size={18} color={COLORS.gold} />
        </View>

        <View style={styles.idSection}>
          <View style={styles.idRow}>
            <Text
              style={styles.quoteId}
              variant="label"
              weight="bold"
            >
              #{truncatedId}
            </Text>
            <View style={styles.versionCircle}>
              <Text style={styles.versionText}>v{quote.version}</Text>
            </View>
          </View>
          <Text
            variant="caption"
            className="text-muted-foreground"
            numberOfLines={1}
          >
            {leadName}
          </Text>
        </View>

        {/* Status badge with icon */}
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          {statusConfig.icon}
          <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Amount row */}
      <View style={styles.amountRow}>
        <Text style={styles.amount}>{formatINR(quote.total_amount)}</Text>

        <View style={styles.pillRow}>
          <View style={styles.infoPill}>
            <Text style={styles.pillText}>
              {roomCount} room{roomCount !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.infoPill}>
            <Text style={styles.pillText}>
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      </View>

      {/* Date */}
      <Text variant="caption" className="text-muted-foreground" style={styles.dateText}>
        Created {formatDate(quote.created_at)}
      </Text>
    </AnimatedPressable>
  );
}

export const QuoteCard = React.memo(QuoteCardInner);

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
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.gold + "15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  idSection: {
    flex: 1,
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  quoteId: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  versionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  versionText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  amount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  pillText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#94A3B8",
  },
  dateText: {
    marginTop: 4,
  },
});
