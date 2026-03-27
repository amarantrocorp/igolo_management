import React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

interface GradientCardProps {
  children: React.ReactNode;
  /** Gradient colors array (top-left to bottom-right) */
  colors?: [string, string, ...string[]];
  /** Gradient start point {x, y} (0-1) */
  start?: { x: number; y: number };
  /** Gradient end point {x, y} (0-1) */
  end?: { x: number; y: number };
  /** Press handler */
  onPress?: () => void;
  /** Shadow tint color (defaults to first gradient color) */
  shadowColor?: string;
  /** Border radius */
  borderRadius?: number;
  /** Additional styles */
  style?: ViewStyle;
  /** Padding */
  padding?: number;
}

export function GradientCard({
  children,
  colors = ["#0B1120", "#1a2744"],
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  onPress,
  shadowColor,
  borderRadius = 16,
  style,
  padding = 16,
}: GradientCardProps) {
  const scale = useSharedValue(1);

  const gesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.97, {
        damping: 15,
        stiffness: 300,
      });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, {
        damping: 12,
        stiffness: 200,
      });
    })
    .onEnd(() => {
      if (onPress) {
        onPress();
      }
    })
    .enabled(!!onPress);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const resolvedShadow = shadowColor ?? colors[0];

  return (
    <GestureDetector gesture={gesture}>
      <AnimatedGradient
        colors={colors}
        start={start}
        end={end}
        style={[
          styles.card,
          {
            borderRadius,
            padding,
            shadowColor: resolvedShadow,
          },
          style,
          animatedStyle,
        ]}
      >
        {children}
      </AnimatedGradient>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
});
