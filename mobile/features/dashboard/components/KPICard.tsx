import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  FadeIn,
  SlideInDown,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { LucideIcon } from "lucide-react-native";
import { COLORS } from "../../../lib/constants";

// ─── Types ──────────────────────────────────────────────
type KPIType = "leads" | "projects" | "payments" | "notifications";

interface KPICardProps {
  type: KPIType;
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  /** Stagger index for entrance animation (0, 1, 2, 3) */
  index?: number;
  /** Show loading skeleton */
  loading?: boolean;
  onPress?: () => void;
}

// ─── Theme Config ───────────────────────────────────────
const CARD_THEMES: Record<
  KPIType,
  {
    iconBg: string;
    iconColor: string;
    gradientColors: [string, string];
    accentGlow: string;
  }
> = {
  leads: {
    iconBg: "rgba(59, 130, 246, 0.15)",
    iconColor: "#3B82F6",
    gradientColors: ["rgba(59, 130, 246, 0.06)", "rgba(59, 130, 246, 0.02)"],
    accentGlow: "rgba(59, 130, 246, 0.08)",
  },
  projects: {
    iconBg: "rgba(34, 197, 94, 0.15)",
    iconColor: "#22C55E",
    gradientColors: ["rgba(34, 197, 94, 0.06)", "rgba(34, 197, 94, 0.02)"],
    accentGlow: "rgba(34, 197, 94, 0.08)",
  },
  payments: {
    iconBg: "rgba(203, 178, 130, 0.18)",
    iconColor: COLORS.gold,
    gradientColors: ["rgba(203, 178, 130, 0.08)", "rgba(203, 178, 130, 0.02)"],
    accentGlow: "rgba(203, 178, 130, 0.08)",
  },
  notifications: {
    iconBg: "rgba(239, 68, 68, 0.12)",
    iconColor: "#EF4444",
    gradientColors: ["rgba(239, 68, 68, 0.06)", "rgba(239, 68, 68, 0.02)"],
    accentGlow: "rgba(239, 68, 68, 0.08)",
  },
};

// ─── Animated Number ────────────────────────────────────
const AnimatedText = Animated.createAnimatedComponent(
  require("react-native").Text
);

function AnimatedNumber({
  value,
  prefix = "",
  delay = 0,
}: {
  value: number;
  prefix?: string;
  delay?: number;
}) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withDelay(
      delay,
      withTiming(value, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [value, delay]);

  const animatedProps = useAnimatedProps(() => {
    const v = Math.round(animatedValue.value);
    // Format with commas for Indian numbering
    const formatted =
      v >= 100000
        ? (v / 100000).toFixed(1) + "L"
        : v >= 1000
        ? (v / 1000).toFixed(1) + "K"
        : String(v);
    return {
      text: prefix + formatted,
      defaultValue: prefix + formatted,
    } as any;
  });

  return (
    <AnimatedText
      animatedProps={animatedProps}
      style={styles.valueText}
      numberOfLines={1}
    />
  );
}

// ─── Shimmer Skeleton ───────────────────────────────────
const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

function ShimmerSkeleton() {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.4, 0.8]),
  }));

  return (
    <View style={styles.skeletonContainer}>
      <Animated.View
        style={[styles.skeletonCircle, shimmerStyle]}
      />
      <Animated.View
        style={[styles.skeletonLabel, shimmerStyle]}
      />
      <Animated.View
        style={[styles.skeletonValue, shimmerStyle]}
      />
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────
const KPICard = React.memo(function KPICard({
  type,
  icon: Icon,
  label,
  value,
  subtitle,
  index = 0,
  loading = false,
  onPress,
}: KPICardProps) {
  const theme = CARD_THEMES[type];
  const scale = useSharedValue(1);
  const entranceDelay = index * 100;

  // Parse numeric value for animation
  const numericValue =
    typeof value === "number"
      ? value
      : parseFloat(String(value).replace(/[^0-9.-]/g, "")) || 0;
  const isNumeric = typeof value === "number" || /^\d/.test(String(value));
  const prefix = typeof value === "string" ? value.replace(/[\d.,KLkl]+$/, "") : "";

  // Press gesture
  const gesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    })
    .onEnd(() => {
      if (onPress) onPress();
    })
    .enabled(!!onPress);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (loading) {
    return (
      <Animated.View
        entering={FadeIn.delay(entranceDelay).duration(400)}
        style={[styles.cardOuter, { flex: 1 }]}
      >
        <View style={[styles.card, { backgroundColor: "#F8FAFC" }]}>
          <ShimmerSkeleton />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={SlideInDown.delay(entranceDelay)
        .duration(500)
        .springify()
        .damping(18)
        .stiffness(140)}
      style={[styles.cardOuter, { flex: 1 }]}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.card, pressStyle]}>
          <LinearGradient
            colors={theme.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Top-right glow accent */}
          <View
            style={[
              styles.glowAccent,
              { backgroundColor: theme.accentGlow },
            ]}
          />

          {/* Icon circle */}
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: theme.iconBg },
            ]}
          >
            <Icon size={18} color={theme.iconColor} strokeWidth={2.2} />
          </View>

          {/* Label */}
          <Animated.Text
            entering={FadeIn.delay(entranceDelay + 200).duration(400)}
            style={styles.labelText}
            numberOfLines={1}
          >
            {label}
          </Animated.Text>

          {/* Value */}
          {isNumeric ? (
            <AnimatedNumber
              value={numericValue}
              prefix={prefix}
              delay={entranceDelay + 300}
            />
          ) : (
            <Animated.Text
              entering={FadeIn.delay(entranceDelay + 300).duration(400)}
              style={styles.valueText}
              numberOfLines={1}
            >
              {value}
            </Animated.Text>
          )}

          {/* Subtitle */}
          {subtitle ? (
            <Animated.Text
              entering={FadeIn.delay(entranceDelay + 400).duration(300)}
              style={styles.subtitleText}
              numberOfLines={1}
            >
              {subtitle}
            </Animated.Text>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
});

export default KPICard;

// ─── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  cardOuter: {
    minWidth: 0,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.6)",
    overflow: "hidden",
    // Subtle shadow
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  glowAccent: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.mutedForeground,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  valueText: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: "400",
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  // Skeleton
  skeletonContainer: {
    padding: 14,
  },
  skeletonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
    marginBottom: 10,
  },
  skeletonLabel: {
    width: 64,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
    marginBottom: 6,
  },
  skeletonValue: {
    width: 48,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
  },
});
