import React from "react";
import { View } from "react-native";
import { AlertCircle } from "lucide-react-native";
import { Text } from "../atoms/Text";
import { Button } from "../atoms/Button";
import { COLORS } from "../../lib/constants";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
  retryLabel = "Try Again",
  className = "",
}: ErrorStateProps) {
  return (
    <View
      className={`flex-1 items-center justify-center px-8 py-12 ${className}`}
      accessibilityRole="alert"
    >
      <View className="mb-4 items-center justify-center rounded-full bg-red-50 w-16 h-16">
        <AlertCircle size={32} color={COLORS.destructive} />
      </View>
      <Text variant="subtitle" weight="semibold" className="text-center mb-2">
        Oops!
      </Text>
      <Text
        variant="body"
        className="text-muted-foreground text-center mb-6"
      >
        {message}
      </Text>
      {onRetry && (
        <Button variant="outline" size="md" onPress={onRetry}>
          {retryLabel}
        </Button>
      )}
    </View>
  );
}
