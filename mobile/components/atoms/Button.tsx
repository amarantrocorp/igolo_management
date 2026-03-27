import React from "react";
import { Pressable, ActivityIndicator, View } from "react-native";
import { Text } from "./Text";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "destructive"
  | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  accessibilityLabel?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-gold",
  secondary: "bg-muted",
  outline: "border border-border bg-transparent",
  destructive: "bg-destructive",
  ghost: "bg-transparent",
};

const variantPressedClasses: Record<ButtonVariant, string> = {
  primary: "opacity-80",
  secondary: "opacity-80",
  outline: "bg-muted",
  destructive: "opacity-80",
  ghost: "bg-muted",
};

const variantTextClasses: Record<ButtonVariant, string> = {
  primary: "text-primary",
  secondary: "text-primary",
  outline: "text-primary",
  destructive: "text-white",
  ghost: "text-primary",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-2",
  md: "px-4 py-3",
  lg: "px-6 py-4",
};

const sizeTextVariant: Record<ButtonSize, "caption" | "body" | "subtitle"> = {
  sm: "caption",
  md: "body",
  lg: "subtitle",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  onPress,
  leftIcon,
  rightIcon,
  className = "",
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`
        flex-row items-center justify-center rounded-xl
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${isDisabled ? "opacity-50" : ""}
        ${className}
      `}
      style={({ pressed }) =>
        pressed && !isDisabled ? { opacity: 0.8 } : undefined
      }
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "destructive" ? "#FFFFFF" : "#0B1120"}
          className="mr-2"
        />
      ) : leftIcon ? (
        <View className="mr-2">{leftIcon}</View>
      ) : null}
      {typeof children === "string" ? (
        <Text
          variant={sizeTextVariant[size]}
          weight="semibold"
          className={variantTextClasses[variant]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
      {rightIcon && !loading ? (
        <View className="ml-2">{rightIcon}</View>
      ) : null}
    </Pressable>
  );
}
