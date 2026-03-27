import React from "react";
import { View } from "react-native";
import { Text } from "./Text";

type BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "destructive"
  | "outline";

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gold",
  secondary: "bg-muted",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  outline: "border border-border bg-transparent",
};

const variantTextClasses: Record<BadgeVariant, string> = {
  default: "text-primary",
  secondary: "text-muted-foreground",
  success: "text-white",
  warning: "text-primary",
  destructive: "text-white",
  outline: "text-primary",
};

export function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <View
      accessibilityRole="text"
      className={`
        self-start rounded-full px-2.5 py-0.5
        ${variantClasses[variant]}
        ${className}
      `}
    >
      <Text
        variant="caption"
        weight="medium"
        className={variantTextClasses[variant]}
      >
        {children}
      </Text>
    </View>
  );
}
