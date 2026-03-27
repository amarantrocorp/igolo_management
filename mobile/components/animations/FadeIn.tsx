import React from "react";
import Animated, {
  FadeIn as ReanimatedFadeIn,
  FadeInDown,
  FadeInUp,
  FadeInLeft,
  FadeInRight,
} from "react-native-reanimated";

type Direction = "up" | "down" | "left" | "right" | "none";

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: Direction;
  className?: string;
}

const getEntering = (direction: Direction, duration: number, delay: number) => {
  switch (direction) {
    case "up":
      return FadeInUp.duration(duration).delay(delay).springify().damping(18);
    case "down":
      return FadeInDown.duration(duration).delay(delay).springify().damping(18);
    case "left":
      return FadeInLeft.duration(duration).delay(delay).springify().damping(18);
    case "right":
      return FadeInRight.duration(duration).delay(delay).springify().damping(18);
    case "none":
    default:
      return ReanimatedFadeIn.duration(duration).delay(delay);
  }
};

export function FadeIn({
  children,
  delay = 0,
  duration = 500,
  direction = "up",
  className,
}: FadeInProps) {
  return (
    <Animated.View
      entering={getEntering(direction, duration, delay)}
      className={className}
    >
      {children}
    </Animated.View>
  );
}
