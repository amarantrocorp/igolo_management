import React from "react";
import { View } from "react-native";
import { Text } from "../atoms/Text";
import { Button } from "../atoms/Button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <View
      className={`flex-1 items-center justify-center px-8 py-12 ${className}`}
      accessibilityRole="text"
    >
      {icon && <View className="mb-4">{icon}</View>}
      <Text variant="subtitle" weight="semibold" className="text-center mb-2">
        {title}
      </Text>
      {subtitle && (
        <Text
          variant="body"
          className="text-muted-foreground text-center mb-6"
        >
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onPress={onAction}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}
