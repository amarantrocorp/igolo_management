import React, { useCallback, useState } from "react";
import { View, ScrollView, Linking, Pressable, StyleSheet, Platform } from "react-native";
import {
  Share2,
  Send,
  Phone,
  User,
  Calendar,
  MapPin,
  ChevronDown,
  Check,
} from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Text } from "../../../components/atoms/Text";
import { Badge } from "../../../components/atoms/Badge";
import { Button } from "../../../components/atoms/Button";
import { formatINR, formatDate } from "../../../lib/format";
import { useToast } from "../../../components/molecules/Toast";
import { COLORS } from "../../../lib/constants";
import { useShareQuotePDF } from "../hooks";
import type { Quotation, QuoteStatus, QuoteRoom, QuoteItem } from "../../../types";

interface QuoteDetailProps {
  quote: Quotation;
}

const STATUS_VARIANT: Record<
  QuoteStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  DRAFT: "secondary",
  SENT: "default",
  APPROVED: "success",
  REJECTED: "destructive",
  ARCHIVED: "secondary",
};

const STATUS_LABEL: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

// Collapsible room section
function CollapsibleRoomSection({ room, index }: { room: QuoteRoom; index: number }) {
  const [isOpen, setIsOpen] = useState(index === 0); // First room open by default
  const rotateAnim = useSharedValue(index === 0 ? 1 : 0);
  const heightAnim = useSharedValue(index === 0 ? 1 : 0);

  const roomTotal =
    room.items?.reduce((sum, item) => sum + item.final_price, 0) ?? 0;

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    rotateAnim.value = withSpring(next ? 1 : 0, { damping: 15, stiffness: 200 });
    heightAnim.value = withTiming(next ? 1 : 0, { duration: 300 });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(rotateAnim.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: heightAnim.value,
    maxHeight: interpolate(heightAnim.value, [0, 1], [0, 2000]),
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(400)}
      style={styles.roomCard}
    >
      {/* Room header - tap to collapse */}
      <Pressable onPress={toggle} style={styles.roomHeader}>
        <View style={styles.roomHeaderLeft}>
          <Text variant="label" weight="semibold" style={{ color: "#0F172A" }}>
            {room.name}
          </Text>
          {room.area_sqft > 0 && (
            <View style={styles.areaPill}>
              <Text style={styles.areaText}>{room.area_sqft} sqft</Text>
            </View>
          )}
        </View>
        <View style={styles.roomHeaderRight}>
          <Text variant="label" weight="bold" style={{ color: COLORS.gold }}>
            {formatINR(roomTotal)}
          </Text>
          <Animated.View style={chevronStyle}>
            <ChevronDown size={16} color={COLORS.mutedForeground} />
          </Animated.View>
        </View>
      </Pressable>

      {/* Collapsible content */}
      <Animated.View style={contentStyle}>
        {isOpen && (
          <View style={styles.roomContent}>
            {/* Table header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1 }]}>Item</Text>
              <Text style={[styles.th, { width: 40, textAlign: "right" }]}>Qty</Text>
              <Text style={[styles.th, { width: 70, textAlign: "right" }]}>Rate</Text>
              <Text style={[styles.th, { width: 75, textAlign: "right" }]}>Total</Text>
            </View>

            {/* Item rows with alternating colors */}
            {room.items?.map((item, idx) => (
              <View
                key={item.id}
                style={[
                  styles.tableRow,
                  idx % 2 === 0 && styles.tableRowAlt,
                ]}
              >
                <Text style={[styles.td, { flex: 1 }]} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text style={[styles.td, { width: 40, textAlign: "right" }]}>
                  {item.quantity}
                </Text>
                <Text style={[styles.td, { width: 70, textAlign: "right" }]}>
                  {formatINR(item.unit_price)}
                </Text>
                <Text
                  style={[
                    styles.td,
                    styles.tdBold,
                    { width: 75, textAlign: "right" },
                  ]}
                >
                  {formatINR(item.final_price)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

export function QuoteDetail({ quote }: QuoteDetailProps) {
  const { share } = useShareQuotePDF();
  const toast = useToast();
  const shareScale = useSharedValue(1);

  const handleSharePDF = useCallback(async () => {
    shareScale.value = withSequence(
      withSpring(0.9, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    share(quote.id);
  }, [share, quote.id]);

  const handleCallClient = useCallback(() => {
    const phone = quote.lead?.contact_number;
    if (!phone) {
      toast.show("This lead has no phone number on file.", "warning");
      return;
    }
    Linking.openURL(`tel:${phone}`);
  }, [quote.lead?.contact_number]);

  const truncatedId = quote.id.slice(0, 8).toUpperCase();
  const leadName = quote.lead?.name ?? "Unknown";
  const leadEmail = quote.lead?.email;
  const leadPhone = quote.lead?.contact_number;
  const leadLocation = quote.lead?.location;

  const subtotal = quote.total_amount;
  const gstRate = 18;
  const gstAmount = subtotal * (gstRate / (100 + gstRate));
  const preGstAmount = subtotal - gstAmount;

  const shareAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareScale.value }],
  }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.headerSection}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerIdRow}>
            <Text style={styles.headerId}>#{truncatedId}</Text>
            <View style={styles.headerVersion}>
              <Text style={styles.headerVersionText}>v{quote.version}</Text>
            </View>
          </View>
          <Badge variant={STATUS_VARIANT[quote.status]}>
            {STATUS_LABEL[quote.status]}
          </Badge>
        </View>
        <Text style={styles.headerAmount}>
          {formatINR(quote.total_amount)}
        </Text>
        {quote.valid_until && (
          <Text variant="caption" className="text-muted-foreground" style={{ marginTop: 4 }}>
            Valid until {formatDate(quote.valid_until)}
          </Text>
        )}
      </Animated.View>

      {/* Client Info */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
        <View style={styles.clientCard}>
          <Text variant="label" weight="semibold" style={styles.sectionLabel}>
            Client Information
          </Text>
          <View style={styles.clientRow}>
            <View style={styles.clientIconBox}>
              <User size={14} color={COLORS.gold} />
            </View>
            <Text variant="label">{leadName}</Text>
          </View>
          {leadEmail && (
            <View style={styles.clientRow}>
              <View style={styles.clientIconBox}>
                <Send size={12} color={COLORS.mutedForeground} />
              </View>
              <Text variant="caption" className="text-muted-foreground">
                {leadEmail}
              </Text>
            </View>
          )}
          {leadPhone && (
            <View style={styles.clientRow}>
              <View style={styles.clientIconBox}>
                <Phone size={12} color={COLORS.mutedForeground} />
              </View>
              <Text variant="caption" className="text-muted-foreground">
                {leadPhone}
              </Text>
            </View>
          )}
          {leadLocation && (
            <View style={styles.clientRow}>
              <View style={styles.clientIconBox}>
                <MapPin size={12} color={COLORS.mutedForeground} />
              </View>
              <Text variant="caption" className="text-muted-foreground">
                {leadLocation}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Room-by-Room Breakdown */}
      <View style={styles.section}>
        <Text variant="label" weight="semibold" style={styles.sectionLabel}>
          Room Breakdown
        </Text>
        {quote.rooms?.map((room, idx) => (
          <CollapsibleRoomSection key={room.id} room={room} index={idx} />
        ))}
      </View>

      {/* Grand Total with GST */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal (excl. GST)</Text>
            <Text style={styles.totalValue}>{formatINR(preGstAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST ({gstRate}%)</Text>
            <Text style={styles.totalValue}>{formatINR(gstAmount)}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>
              {formatINR(quote.total_amount)}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Action Buttons */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.actionsSection}>
        <Animated.View style={shareAnimStyle}>
          <Button
            variant="primary"
            onPress={handleSharePDF}
            leftIcon={<Share2 size={18} color={COLORS.primary} />}
            accessibilityLabel="Share quotation PDF"
          >
            Share PDF
          </Button>
        </Animated.View>
        {leadPhone && (
          <View style={{ marginTop: 12 }}>
            <Button
              variant="outline"
              onPress={handleCallClient}
              leftIcon={<Phone size={18} color={COLORS.primary} />}
              accessibilityLabel={`Call ${leadName}`}
            >
              Call Client
            </Button>
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerId: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  headerVersion: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerVersionText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  headerAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionLabel: {
    marginBottom: 12,
    color: "#0F172A",
  },
  clientCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  clientIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  roomCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
  },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  roomHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  roomHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  areaPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
  },
  areaText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#94A3B8",
  },
  roomContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 4,
  },
  th: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  tableRowAlt: {
    backgroundColor: "#FAFBFC",
  },
  td: {
    fontSize: 12,
    color: "#334155",
  },
  tdBold: {
    fontWeight: "600",
    color: "#0F172A",
  },
  totalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gold + "30",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  totalValue: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },
  totalDivider: {
    height: 1,
    backgroundColor: COLORS.gold + "30",
    marginVertical: 10,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.gold,
    letterSpacing: -0.5,
  },
  actionsSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
});
