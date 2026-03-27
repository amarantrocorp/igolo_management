import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { TextInput, TextInputProps, Platform } from "react-native";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
  style?: TextInputProps["style"];
}

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  duration = 800,
  decimals = 0,
  className,
  style,
}: AnimatedNumberProps) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  const animatedProps = useAnimatedProps(() => {
    const num = animatedValue.value;
    const formatted =
      decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString();
    return {
      text: `${prefix}${formatted}${suffix}`,
    } as any;
  });

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      animatedProps={animatedProps}
      className={className}
      style={[
        {
          padding: 0,
          color: "#0F172A",
          fontSize: 24,
          fontWeight: "700",
        },
        style,
      ]}
      // defaultValue ensures something shows before animation starts
      defaultValue={`${prefix}0${suffix}`}
    />
  );
}
