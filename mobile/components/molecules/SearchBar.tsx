import React, { useState, useRef, useCallback, useEffect } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { Search, X } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { COLORS } from "../../lib/constants";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SearchBarProps {
  value?: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  debounceMs?: number;
  autoFocus?: boolean;
  className?: string;
}

export function SearchBar({
  value: controlledValue,
  onChangeText,
  placeholder = "Search...",
  debounceMs = 300,
  autoFocus = false,
  className = "",
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(controlledValue ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const focusAnim = useSharedValue(0);
  const hasText = useSharedValue(0);
  const cancelAnim = useSharedValue(0);

  // Sync controlled value
  useEffect(() => {
    if (controlledValue !== undefined && controlledValue !== localValue) {
      setLocalValue(controlledValue);
      hasText.value = controlledValue.length > 0 ? 1 : 0;
    }
  }, [controlledValue]);

  const debouncedChange = useCallback(
    (text: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChangeText(text);
      }, debounceMs);
    },
    [onChangeText, debounceMs]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleChange = (text: string) => {
    setLocalValue(text);
    hasText.value = withTiming(text.length > 0 ? 1 : 0, { duration: 200 });
    debouncedChange(text);
  };

  const handleClear = () => {
    setLocalValue("");
    hasText.value = withTiming(0, { duration: 200 });
    onChangeText("");
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setIsFocused(true);
    focusAnim.value = withSpring(1, { damping: 18, stiffness: 300 });
    cancelAnim.value = withSpring(1, { damping: 18, stiffness: 300 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusAnim.value = withSpring(0, { damping: 18, stiffness: 300 });
    if (localValue.length === 0) {
      cancelAnim.value = withSpring(0, { damping: 18, stiffness: 300 });
    }
  };

  const handleCancel = () => {
    setLocalValue("");
    hasText.value = withTiming(0, { duration: 200 });
    onChangeText("");
    cancelAnim.value = withSpring(0, { damping: 18, stiffness: 300 });
    inputRef.current?.blur();
  };

  // Container animated style - expands on focus
  const containerStyle = useAnimatedStyle(() => {
    return {
      borderColor: interpolate(
        focusAnim.value,
        [0, 1],
        [0, 1]
      ) > 0.5
        ? COLORS.gold
        : COLORS.border,
      borderWidth: interpolate(focusAnim.value, [0, 1], [1, 1.5]),
    };
  });

  // Search icon animated style - morphs to X when text entered
  const searchIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(hasText.value, [0, 1], [1, 0]),
    transform: [
      { scale: interpolate(hasText.value, [0, 1], [1, 0.5]) },
      { rotate: `${interpolate(hasText.value, [0, 1], [0, 90])}deg` },
    ],
  }));

  const clearIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(hasText.value, [0, 1], [0, 1]),
    transform: [
      { scale: interpolate(hasText.value, [0, 1], [0.5, 1]) },
      { rotate: `${interpolate(hasText.value, [0, 1], [-90, 0])}deg` },
    ],
  }));

  // Cancel button slides in from right
  const cancelStyle = useAnimatedStyle(() => ({
    opacity: cancelAnim.value,
    transform: [
      { translateX: interpolate(cancelAnim.value, [0, 1], [40, 0]) },
    ],
    width: interpolate(cancelAnim.value, [0, 1], [0, 60]),
    marginLeft: interpolate(cancelAnim.value, [0, 1], [0, 8]),
  }));

  return (
    <View style={styles.row}>
      <Animated.View style={[styles.container, containerStyle]}>
        {/* Icon area */}
        <View style={styles.iconWrapper}>
          <Animated.View style={[styles.iconAbsolute, searchIconStyle]}>
            <Search size={18} color={isFocused ? COLORS.gold : COLORS.mutedForeground} />
          </Animated.View>
          <Animated.View style={[styles.iconAbsolute, clearIconStyle]}>
            <Pressable onPress={handleClear} hitSlop={8}>
              <X size={18} color={COLORS.mutedForeground} />
            </Pressable>
          </Animated.View>
        </View>

        <TextInput
          ref={inputRef}
          value={localValue}
          onChangeText={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={COLORS.mutedForeground}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityRole="search"
          accessibilityLabel="Search"
          style={styles.input}
        />
      </Animated.View>

      {/* Cancel button */}
      <AnimatedPressable
        onPress={handleCancel}
        style={cancelStyle}
        hitSlop={8}
      >
        <Animated.Text style={styles.cancelText}>Cancel</Animated.Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 20,
    height: 20,
    position: "relative",
  },
  iconAbsolute: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  input: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
  },
  cancelText: {
    fontSize: 14,
    color: COLORS.gold,
    fontWeight: "600",
  },
});
