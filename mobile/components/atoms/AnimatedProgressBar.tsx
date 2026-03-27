import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { COLORS } from "../../lib/constants";

interface AnimatedProgressBarProps {
  /** Progress value from 0 to 100 */
  value: number;
  /** Bar color */
  color?: string;
  /** Track (background) color */
  trackColor?: string;
  /** Bar height in pixels */
  height?: number;
  /** Rounded corners (defaults to half the height) */
  borderRadius?: number;
  /** Animation duration in ms */
  duration?: number;
  /** Delay before animation starts in ms */
  delay?: number;
  /** Show a subtle glow effect on the filled portion */
  glow?: boolean;
}

export function AnimatedProgressBar({
  value,
  color = COLORS.gold,
  trackColor = "rgba(203, 178, 130, 0.12)",
  height = 6,
  borderRadius,
  duration = 1000,
  delay = 0,
  glow = false,
}: AnimatedProgressBarProps) {
  const progress = useSharedValue(0);
  const clampedValue = Math.min(100, Math.max(0, value));
  const resolvedRadius = borderRadius ?? height / 2;

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(clampedValue, {
        duration,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [clampedValue, duration, delay]);

  const barStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value}%` as any,
      opacity: interpolate(progress.value, [0, clampedValue * 0.1, clampedValue], [0.4, 0.8, 1]),
    };
  });

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: resolvedRadius,
          backgroundColor: trackColor,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.bar,
          {
            height,
            borderRadius: resolvedRadius,
            backgroundColor: color,
          },
          glow && {
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 4,
            elevation: 3,
          },
          barStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
  },
  bar: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
