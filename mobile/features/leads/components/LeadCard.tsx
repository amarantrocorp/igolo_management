import React, { useCallback } from "react";
import { View, Text, Linking, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import {
  Phone,
  MessageCircle,
  Globe,
  Users,
  PhoneIncoming,
  Megaphone,
  HelpCircle,
  Camera,
  ThumbsUp,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
  runOnJS,
  FadeInDown,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import { COLORS } from "../../../lib/constants";
import { formatRelativeTime } from "../../../lib/format";
import type { Lead, LeadStatus } from "../../../types";

const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: "#94A3B8",
  CONTACTED: "#3B82F6",
  QUALIFIED: "#F59E0B",
  QUOTATION_SENT: "#06B6D4",
  NEGOTIATION: "#EC4899",
  CONVERTED: "#22C55E",
  LOST: "#EF4444",
};

const AVATAR_COLORS = [
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#EF4444",
  "#14B8A6",
];

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  Website: <Globe size={12} color={COLORS.mutedForeground} />,
  Referral: <Users size={12} color={COLORS.mutedForeground} />,
  "Walk-in": <PhoneIncoming size={12} color={COLORS.mutedForeground} />,
  Instagram: <Camera size={12} color={COLORS.mutedForeground} />,
  Facebook: <ThumbsUp size={12} color={COLORS.mutedForeground} />,
  "Google Ads": <Megaphone size={12} color={COLORS.mutedForeground} />,
  "Just Dial": <Phone size={12} color={COLORS.mutedForeground} />,
};

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface LeadCardProps {
  lead: Lead;
  index?: number;
}

const SWIPE_THRESHOLD = 80;

const LeadCard = React.memo(function LeadCard({ lead, index = 0 }: LeadCardProps) {
  const router = useRouter();
  const statusColor = STATUS_COLORS[lead.status] ?? COLORS.mutedForeground;
  const avatarColor = getAvatarColor(lead.name);

  const translateX = useSharedValue(0);
  const cardScale = useSharedValue(1);

  const handlePress = useCallback(() => {
    router.push(`/(tabs)/leads/${lead.id}`);
  }, [router, lead.id]);

  const hasContact = !!lead.contact_number?.trim();

  const handleCall = useCallback(() => {
    if (!lead.contact_number?.trim()) return;
    Linking.openURL(`tel:${lead.contact_number}`);
  }, [lead.contact_number]);

  const handleWhatsApp = useCallback(() => {
    if (!lead.contact_number?.trim()) return;
    const phone = lead.contact_number.replace(/\D/g, "");
    Linking.openURL(`whatsapp://send?phone=${phone}`);
  }, [lead.contact_number]);

  // Tap gesture with scale animation
  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      cardScale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    })
    .onFinalize((_, success) => {
      cardScale.value = withSpring(1, { damping: 15, stiffness: 400 });
      if (success) {
        runOnJS(handlePress)();
      }
    });

  // Pan gesture for swipe actions (disabled when no contact)
  const panGesture = Gesture.Pan()
    .enabled(hasContact)
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD) {
        // Swiped left -> Call
        runOnJS(handleCall)();
      } else if (event.translationX > SWIPE_THRESHOLD) {
        // Swiped right -> WhatsApp
        runOnJS(handleWhatsApp)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  // Animated card style
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: cardScale.value },
    ],
  }));

  // Left swipe background (Call - blue)
  const leftBgStyle = useAnimatedStyle(() => {
    const opacity = Math.min(Math.abs(Math.min(translateX.value, 0)) / SWIPE_THRESHOLD, 1);
    return {
      opacity,
    };
  });

  // Right swipe background (WhatsApp - green)
  const rightBgStyle = useAnimatedStyle(() => {
    const opacity = Math.min(Math.max(translateX.value, 0) / SWIPE_THRESHOLD, 1);
    return {
      opacity,
    };
  });

  const sourceIcon = lead.source
    ? SOURCE_ICONS[lead.source] || <HelpCircle size={12} color={COLORS.mutedForeground} />
    : null;

  return (
    <Animated.View
      entering={index < 10 ? FadeInDown.delay(index * 60).duration(400).springify() : undefined}
      style={styles.wrapper}
    >
      {/* Swipe backgrounds */}
      <Animated.View style={[styles.swipeBgLeft, leftBgStyle]}>
        <Phone size={20} color="#FFFFFF" />
        <Text style={styles.swipeLabel}>Call</Text>
      </Animated.View>
      <Animated.View style={[styles.swipeBgRight, rightBgStyle]}>
        <Text style={styles.swipeLabelGreen}>WhatsApp</Text>
        <MessageCircle size={20} color="#FFFFFF" />
      </Animated.View>

      {/* Main Card */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          {/* Top Row: Avatar + Name + Status */}
          <View style={styles.topRow}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>
                {getInitials(lead.name)}
              </Text>
            </View>

            <View style={styles.nameContainer}>
              <Text style={styles.name} numberOfLines={1}>
                {lead.name}
              </Text>
              {/* Source row */}
              <View style={styles.sourceRow}>
                {sourceIcon}
                {lead.source ? (
                  <Text style={styles.sourceText}>{lead.source}</Text>
                ) : null}
                {lead.location ? (
                  <>
                    <View style={styles.dot} />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {lead.location}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>

            {/* Status Badge with dot */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor + "14" }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {lead.status.replace(/_/g, " ")}
              </Text>
            </View>
          </View>

          {/* Bottom Row: Assigned To + Date + Actions */}
          <View style={styles.bottomRow}>
            <View style={styles.metaRow}>
              {lead.assigned_to ? (
                <View style={styles.assigneeContainer}>
                  <View style={styles.assigneeAvatar}>
                    <Text style={styles.assigneeInitials}>
                      {lead.assigned_to.full_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.assigneeName} numberOfLines={1}>
                    {lead.assigned_to.full_name}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.timeText}>
                {formatRelativeTime(lead.created_at)}
              </Text>
            </View>

            {/* Quick Action Buttons */}
            <View style={[styles.actions, !hasContact && { opacity: 0.3 }]}>
              <Animated.View>
                <View style={styles.callBtn}>
                  <Phone size={13} color="#3B82F6" strokeWidth={2.2} />
                </View>
              </Animated.View>
              <View style={styles.whatsappBtn}>
                <MessageCircle size={13} color="#22C55E" strokeWidth={2.2} />
              </View>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
    position: "relative",
  },
  swipeBgLeft: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: "#3B82F6",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  swipeBgRight: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: "#25D366",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  swipeLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  swipeLabelGreen: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  nameContainer: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sourceText: {
    fontSize: 11,
    color: "#64748B",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CBD5E1",
  },
  locationText: {
    fontSize: 11,
    color: "#64748B",
    flex: 1,
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
    textTransform: "capitalize",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  assigneeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  assigneeAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  assigneeInitials: {
    fontSize: 8,
    fontWeight: "700",
    color: "#475569",
  },
  assigneeName: {
    fontSize: 11,
    color: "#64748B",
    maxWidth: 80,
  },
  timeText: {
    fontSize: 10,
    color: "#94A3B8",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  whatsappBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default LeadCard;
