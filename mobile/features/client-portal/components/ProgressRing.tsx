import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { TextInput } from "react-native";
import { COLORS } from "../../../lib/constants";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type RingSize = "sm" | "md" | "lg";

const SIZE_MAP: Record<RingSize, { size: number; stroke: number; fontSize: number; labelSize: number }> = {
  sm: { size: 80, stroke: 6, fontSize: 18, labelSize: 7 },
  md: { size: 120, stroke: 8, fontSize: 26, labelSize: 9 },
  lg: { size: 200, stroke: 12, fontSize: 44, labelSize: 12 },
};

interface ProgressRingProps {
  /** 0-100 */
  percentage: number;
  /** Size variant */
  variant?: RingSize;
  /** Override outer diameter */
  size?: number;
  /** Override stroke width */
  strokeWidth?: number;
  /** Animation delay in ms */
  delay?: number;
  /** Stroke color (defaults to gold) */
  color?: string;
  /** Show glow effect */
  glow?: boolean;
  /** Dark background mode */
  darkBg?: boolean;
}

export default function ProgressRing({
  percentage,
  variant = "lg",
  size: sizeProp,
  strokeWidth: strokeProp,
  delay: delayMs = 200,
  color = COLORS.gold,
  glow = true,
  darkBg = false,
}: ProgressRingProps) {
  const config = SIZE_MAP[variant];
  const size = sizeProp ?? config.size;
  const strokeWidth = strokeProp ?? config.stroke;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const clampedPct = Math.min(Math.max(percentage, 0), 100);

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delayMs,
      withTiming(clampedPct, {
        duration: 1400,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [clampedPct]);

  const animatedCircleProps = useAnimatedProps(() => {
    const offset = circumference - (progress.value / 100) * circumference;
    return {
      strokeDashoffset: offset,
    };
  });

  // Glow circle (slightly larger, blurred via opacity)
  const animatedGlowProps = useAnimatedProps(() => {
    const offset = circumference - (progress.value / 100) * circumference;
    return {
      strokeDashoffset: offset,
      strokeOpacity: progress.value > 0 ? 0.3 : 0,
    };
  });

  // Animated percentage text
  const animatedTextProps = useAnimatedProps(() => {
    const val = Math.round(progress.value);
    return {
      text: `${val}%`,
    } as any;
  });

  // Subtle pulse for the glow
  const glowOpacity = useSharedValue(0.3);
  useEffect(() => {
    if (glow) {
      // A gentle steady glow, no pulsing for 60fps safety
      glowOpacity.value = withDelay(
        delayMs + 1400,
        withTiming(0.25, { duration: 600 })
      );
    }
  }, [glow]);

  const trackColor = darkBg ? "rgba(255,255,255,0.1)" : COLORS.border + "50";
  const textColor = darkBg ? "#FFFFFF" : color;
  const labelColor = darkBg ? "rgba(255,255,255,0.5)" : COLORS.mutedForeground;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Glow layer */}
        {glow && (
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth + 6}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={animatedGlowProps}
            rotation="-90"
            origin={`${center}, ${center}`}
          />
        )}

        {/* Main progress arc */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedCircleProps}
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        <AnimatedTextInput
          underlineColorAndroid="transparent"
          editable={false}
          animatedProps={animatedTextProps}
          defaultValue="0%"
          style={[
            styles.percentText,
            {
              fontSize: config.fontSize,
              color: textColor,
            },
          ]}
        />
        <Animated.Text
          style={[
            styles.label,
            {
              fontSize: config.labelSize,
              color: labelColor,
            },
          ]}
        >
          COMPLETE
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  percentText: {
    fontWeight: "800",
    letterSpacing: -1,
    padding: 0,
  },
  label: {
    fontWeight: "600",
    marginTop: 2,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
