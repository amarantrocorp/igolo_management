import React, { forwardRef } from "react";
import { View, TextInput, TextInputProps, Pressable } from "react-native";
import { Text } from "./Text";

interface InputProps extends Omit<TextInputProps, "className"> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      onRightIconPress,
      disabled = false,
      className = "",
      containerClassName = "",
      ...textInputProps
    },
    ref
  ) => {
    const borderColor = error
      ? "border-destructive"
      : "border-border focus:border-gold";

    return (
      <View className={containerClassName}>
        {label && (
          <Text
            variant="label"
            weight="medium"
            className="text-muted-foreground mb-1.5"
          >
            {label}
          </Text>
        )}
        <View
          className={`
            flex-row items-center rounded-xl border bg-white
            ${borderColor}
            ${disabled ? "opacity-50 bg-muted" : ""}
            ${className}
          `}
        >
          {leftIcon && (
            <View className="pl-3" accessibilityElementsHidden>
              {leftIcon}
            </View>
          )}
          <TextInput
            ref={ref}
            editable={!disabled}
            placeholderTextColor="#94A3B8"
            accessibilityLabel={label}
            accessibilityState={{ disabled }}
            className={`
              flex-1 px-3 py-3 text-base text-[#0F172A]
              ${leftIcon ? "pl-2" : ""}
              ${rightIcon ? "pr-2" : ""}
            `}
            {...textInputProps}
          />
          {rightIcon && (
            <Pressable
              onPress={onRightIconPress}
              disabled={!onRightIconPress}
              hitSlop={8}
              className="pr-3"
              accessibilityRole={onRightIconPress ? "button" : undefined}
              accessibilityLabel={onRightIconPress ? "Toggle visibility" : undefined}
            >
              {rightIcon}
            </Pressable>
          )}
        </View>
        {error && (
          <Text variant="caption" className="text-destructive mt-1">
            {error}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = "Input";
