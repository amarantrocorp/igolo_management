import React from "react";
import { View, Pressable, ViewProps } from "react-native";

type PaddingVariant = "none" | "sm" | "md" | "lg";

interface CardBaseProps {
  children: React.ReactNode;
  padding?: PaddingVariant;
  className?: string;
}

interface PressableCardProps extends CardBaseProps {
  pressable: true;
  onPress: () => void;
  accessibilityLabel?: string;
}

interface StaticCardProps extends CardBaseProps {
  pressable?: false;
  onPress?: never;
  accessibilityLabel?: string;
}

type CardProps = PressableCardProps | StaticCardProps;

const paddingClasses: Record<PaddingVariant, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  children,
  padding = "md",
  pressable = false,
  onPress,
  className = "",
  accessibilityLabel,
}: CardProps) {
  const baseClasses = `
    bg-white border border-border rounded-xl shadow-sm
    ${paddingClasses[padding]}
    ${className}
  `;

  if (pressable && onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className={baseClasses}
        style={({ pressed }) => (pressed ? { opacity: 0.9 } : undefined)}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={baseClasses} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}
