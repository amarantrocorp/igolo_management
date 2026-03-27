import React, { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";

type SkeletonVariant = "card" | "list-item" | "text";

interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  count?: number;
  className?: string;
}

function ShimmerBlock({ className = "" }: { className?: string }) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      className={`bg-muted rounded-lg ${className}`}
      style={{ opacity }}
    />
  );
}

function CardSkeleton() {
  return (
    <View className="bg-white border border-border rounded-xl p-4 mb-3">
      <ShimmerBlock className="h-4 w-3/4 mb-3" />
      <ShimmerBlock className="h-3 w-full mb-2" />
      <ShimmerBlock className="h-3 w-5/6 mb-3" />
      <View className="flex-row gap-2">
        <ShimmerBlock className="h-6 w-16 rounded-full" />
        <ShimmerBlock className="h-6 w-20 rounded-full" />
      </View>
    </View>
  );
}

function ListItemSkeleton() {
  return (
    <View className="flex-row items-center py-3 px-4 border-b border-border">
      <ShimmerBlock className="w-10 h-10 rounded-full mr-3" />
      <View className="flex-1">
        <ShimmerBlock className="h-4 w-2/3 mb-2" />
        <ShimmerBlock className="h-3 w-1/2" />
      </View>
      <ShimmerBlock className="h-6 w-14 rounded-full" />
    </View>
  );
}

function TextSkeleton() {
  return (
    <View className="mb-3">
      <ShimmerBlock className="h-4 w-full mb-2" />
      <ShimmerBlock className="h-4 w-5/6 mb-2" />
      <ShimmerBlock className="h-4 w-2/3" />
    </View>
  );
}

const variantComponent: Record<SkeletonVariant, React.FC> = {
  card: CardSkeleton,
  "list-item": ListItemSkeleton,
  text: TextSkeleton,
};

export function LoadingSkeleton({
  variant = "card",
  count = 3,
  className = "",
}: LoadingSkeletonProps) {
  const Component = variantComponent[variant];

  return (
    <View className={className} accessibilityLabel="Loading content">
      {Array.from({ length: count }).map((_, index) => (
        <Component key={index} />
      ))}
    </View>
  );
}
