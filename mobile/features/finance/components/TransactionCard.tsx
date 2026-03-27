import React, { useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { Text } from "../../../components/atoms/Text";
import { Badge } from "../../../components/atoms/Badge";
import { Button } from "../../../components/atoms/Button";
import { COLORS } from "../../../lib/constants";
import { formatINR, formatDate, formatDateTime } from "../../../lib/format";
import type {
  Transaction,
  TransactionCategory,
  TransactionSource,
  TransactionStatus,
  UserRole,
} from "../../../types";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================
// Helpers
// ============================================================

const SOURCE_LABELS: Record<TransactionSource, string> = {
  CLIENT: "Client Payment",
  VENDOR: "Vendor Payment",
  LABOR: "Labor Payout",
  PETTY_CASH: "Petty Cash",
};

const STATUS_CONFIG: Record<
  TransactionStatus,
  { label: string; variant: "warning" | "success" | "destructive"; icon: typeof Clock }
> = {
  PENDING: { label: "Pending", variant: "warning", icon: Clock },
  CLEARED: { label: "Cleared", variant: "success", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
};

// ============================================================
// Component
// ============================================================

interface TransactionCardProps {
  transaction: Transaction;
  userRole?: UserRole | null;
  onVerify?: (id: string) => void;
  isVerifying?: boolean;
  index?: number;
}

export default function TransactionCard({
  transaction,
  userRole,
  onVerify,
  isVerifying = false,
  index = 0,
}: TransactionCardProps) {
  const isInflow = transaction.category === "INFLOW";
  const canVerify =
    transaction.status === "PENDING" &&
    (userRole === "SUPER_ADMIN" || userRole === "MANAGER") &&
    !!onVerify;

  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_CONFIG[transaction.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;

  const accentColor = isInflow ? "#22C55E" : "#EF4444";

  // Swipe-to-verify
  const translateX = useSharedValue(0);
  const SWIPE_THRESHOLD = 100;

  const triggerVerify = () => {
    if (onVerify) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onVerify(transaction.id);
    }
  };

  const panGesture = Gesture.Pan()
    .enabled(canVerify)
    .onUpdate((event) => {
      // Only allow right swipe
      translateX.value = Math.max(0, Math.min(event.translationX, SWIPE_THRESHOLD + 20));
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SWIPE_THRESHOLD);
        runOnJS(triggerVerify)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const cardSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleToggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const cardContent = (
    <Animated.View
      entering={index < 10 ? FadeInDown.duration(350).delay(index * 50).springify().damping(18) : undefined}
    >
      <View style={styles.outerWrap}>
        {/* Swipe background (verify action) */}
        {canVerify && (
          <View style={styles.swipeBg}>
            <CheckCircle2 size={22} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.swipeText}>Verify</Text>
          </View>
        )}

        <Animated.View style={[styles.card, cardSlideStyle]}>
          {/* Left accent bar */}
          <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

          <Pressable style={styles.cardContent} onPress={handleToggleExpand}>
            {/* Icon */}
            <View style={styles.iconWrap}>
              {isInflow ? (
                <ArrowDownCircle size={26} color="#22C55E" strokeWidth={2} />
              ) : (
                <ArrowUpCircle size={26} color="#EF4444" strokeWidth={2} />
              )}
            </View>

            {/* Main content */}
            <View style={styles.body}>
              {/* Source + Amount */}
              <View style={styles.topRow}>
                <Text variant="body" weight="semibold" style={{ color: COLORS.text, flex: 1 }}>
                  {SOURCE_LABELS[transaction.source] ?? transaction.source}
                </Text>
                <Text
                  variant="body"
                  weight="bold"
                  style={{ color: accentColor, fontSize: 16 }}
                >
                  {isInflow ? "+" : "-"}
                  {formatINR(transaction.amount)}
                </Text>
              </View>

              {/* Description */}
              <Text
                variant="caption"
                style={styles.description}
                numberOfLines={expanded ? undefined : 1}
              >
                {transaction.description || "No description"}
              </Text>

              {/* Status row */}
              <View style={styles.statusRow}>
                <Text variant="caption" style={{ color: COLORS.mutedForeground }}>
                  {formatDate(transaction.created_at)}
                </Text>
                <View style={styles.badgeRow}>
                  <StatusIcon size={12} color={
                    statusConfig.variant === "success" ? "#22C55E"
                    : statusConfig.variant === "destructive" ? "#EF4444"
                    : COLORS.warning
                  } />
                  <Badge variant={statusConfig.variant}>
                    {statusConfig.label}
                  </Badge>
                </View>
              </View>

              {/* Expanded details */}
              {expanded && (
                <View style={styles.expandedSection}>
                  {(transaction as any).reference_id ? (
                    <DetailRow label="Reference" value={(transaction as any).reference_id} />
                  ) : null}
                  <DetailRow
                    label="Date"
                    value={formatDateTime(transaction.created_at)}
                  />
                  {transaction.recorded_by ? (
                    <DetailRow label="Recorded by" value={transaction.recorded_by.slice(0, 8)} />
                  ) : null}
                  {transaction.proof_doc_url && (
                    <DetailRow label="Proof" value="Document attached" />
                  )}
                </View>
              )}

              {/* Verify button (inline fallback if swipe unavailable) */}
              {canVerify && expanded ? (
                <View style={styles.verifyRow}>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => onVerify(transaction.id)}
                    loading={isVerifying}
                    disabled={isVerifying}
                  >
                    Verify Payment
                  </Button>
                </View>
              ) : null}
            </View>

            {/* Expand indicator */}
            <View style={styles.expandIcon}>
              {expanded ? (
                <ChevronUp size={14} color={COLORS.mutedForeground} />
              ) : (
                <ChevronDown size={14} color={COLORS.mutedForeground} />
              )}
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );

  if (canVerify) {
    return (
      <GestureDetector gesture={panGesture}>
        {cardContent}
      </GestureDetector>
    );
  }

  return cardContent;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text variant="caption" style={{ color: COLORS.mutedForeground, width: 80 }}>
        {label}
      </Text>
      <Text
        variant="caption"
        weight="medium"
        style={{ color: COLORS.text, flex: 1, textAlign: "right" }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    marginBottom: 10,
    position: "relative",
  },
  swipeBg: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: "#22C55E",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingLeft: 8,
  },
  swipeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  accentBar: {
    width: 4,
    alignSelf: "stretch",
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    padding: 12,
  },
  iconWrap: {
    marginRight: 10,
    marginTop: 2,
  },
  body: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  description: {
    color: COLORS.mutedForeground,
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  expandedSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  verifyRow: {
    marginTop: 10,
  },
  expandIcon: {
    justifyContent: "center",
    paddingLeft: 6,
  },
});
