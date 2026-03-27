import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
} from "react-native-reanimated";
import { TextInput } from "react-native";
import { Text } from "../../../components/atoms/Text";
import { AnimatedNumber } from "../../../components/animations/AnimatedNumber";
import { COLORS } from "../../../lib/constants";
import { formatINR } from "../../../lib/format";
import type { Project } from "../../../types";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// ============================================================
// Mini Animated Progress Arc
// ============================================================

function WalletArc({ percent, size = 56 }: { percent: number; size?: number }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const clamped = Math.min(100, Math.max(0, percent));

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      400,
      withTiming(clamped, {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [clamped]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (progress.value / 100) * circumference,
  }));

  // Animated percentage text
  const textProps = useAnimatedProps(() => ({
    text: `${Math.round(progress.value)}%`,
  } as any));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={COLORS.gold}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <AnimatedTextInput
            underlineColorAndroid="transparent"
            editable={false}
            animatedProps={textProps}
            defaultValue="0%"
            style={styles.arcText}
          />
        </View>
      </View>
    </View>
  );
}

// ============================================================
// Animated Bar
// ============================================================

function WalletBar({
  label,
  value,
  maxValue,
  color,
  delay = 0,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  delay?: number;
}) {
  const width = useSharedValue(0);
  const percent = maxValue > 0 ? (value / maxValue) * 100 : 0;

  useEffect(() => {
    width.value = withDelay(
      delay,
      withTiming(Math.min(percent, 100), {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [percent]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%` as any,
  }));

  return (
    <View style={styles.barRow}>
      <View style={styles.barLabelRow}>
        <Text variant="caption" style={{ color: "rgba(255,255,255,0.5)" }}>
          {label}
        </Text>
        <Text variant="caption" weight="semibold" style={{ color }}>
          {formatINR(value)}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: color },
            barStyle,
          ]}
        />
      </View>
    </View>
  );
}

// ============================================================
// Component
// ============================================================

interface WalletCardProps {
  project: Project;
}

export default function WalletCard({ project }: WalletCardProps) {
  const wallet = project.wallet;

  if (!wallet) {
    return (
      <View style={styles.emptyCard}>
        <Text
          variant="caption"
          style={{ color: COLORS.mutedForeground, textAlign: "center" }}
        >
          No wallet data available
        </Text>
      </View>
    );
  }

  const agreedValue = wallet.total_agreed_value || 0;
  const received = wallet.total_received || 0;
  const spent = wallet.total_spent || 0;
  const balance = wallet.current_balance ?? received - spent;
  const pending = wallet.pending_approvals || 0;
  const effectiveBalance = balance - pending;
  const receivedPercent = agreedValue > 0 ? (received / agreedValue) * 100 : 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(500).delay(100).springify().damping(18)}
    >
      <LinearGradient
        colors={[COLORS.primary, "#1a2744"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientCard}
      >
        {/* Top row: Arc + Balance */}
        <View style={styles.topRow}>
          <WalletArc percent={receivedPercent} />

          <View style={styles.balanceSection}>
            <Text variant="caption" style={{ color: "rgba(255,255,255,0.45)" }}>
              Effective Balance
            </Text>
            <AnimatedNumber
              value={effectiveBalance}
              prefix={"\u20B9"}
              duration={1000}
              style={[
                styles.balanceValue,
                {
                  color: effectiveBalance >= 0 ? "#22C55E" : "#EF4444",
                },
              ]}
            />
            <Text variant="caption" style={{ color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
              Agreed: {formatINR(agreedValue)}
            </Text>
          </View>
        </View>

        {/* Animated bars */}
        <View style={styles.barsSection}>
          <WalletBar
            label="Received"
            value={received}
            maxValue={agreedValue}
            color="#22C55E"
            delay={500}
          />
          <WalletBar
            label="Spent"
            value={spent}
            maxValue={agreedValue}
            color="#EF4444"
            delay={700}
          />
          {pending > 0 && (
            <WalletBar
              label="Pending"
              value={pending}
              maxValue={agreedValue}
              color={COLORS.warning}
              delay={900}
            />
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gradientCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  balanceSection: {
    flex: 1,
    marginLeft: 16,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: "800",
    padding: 0,
    marginTop: 2,
  },
  barsSection: {
    gap: 10,
  },
  barRow: {
    gap: 4,
  },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
  },
  arcText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.gold,
    padding: 0,
    textAlign: "center",
  },
  emptyCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
});
