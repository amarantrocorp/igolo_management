import React from "react";
import { Text as RNText, TextProps as RNTextProps } from "react-native";

type TextVariant = "title" | "subtitle" | "body" | "caption" | "label";
type TextWeight = "normal" | "medium" | "semibold" | "bold";

interface TextProps extends Omit<RNTextProps, "className"> {
  variant?: TextVariant;
  weight?: TextWeight;
  color?: string;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<TextVariant, string> = {
  title: "text-2xl leading-8",
  subtitle: "text-lg leading-6",
  body: "text-base leading-6",
  caption: "text-xs leading-4",
  label: "text-sm leading-5",
};

const weightClasses: Record<TextWeight, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

export function Text({
  variant = "body",
  weight = "normal",
  color,
  className = "",
  children,
  ...rest
}: TextProps) {
  return (
    <RNText
      className={`
        text-[#0F172A]
        ${variantClasses[variant]}
        ${weightClasses[weight]}
        ${className}
      `}
      style={color ? { color } : undefined}
      {...rest}
    >
      {children}
    </RNText>
  );
}
