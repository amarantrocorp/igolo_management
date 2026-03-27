import React, { useMemo } from "react";
import { View, Image, StyleSheet, Text } from "react-native";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  /** Full name for initials generation */
  name?: string;
  /** Image URL (takes precedence over initials) */
  imageUrl?: string;
  /** Size variant */
  size?: AvatarSize;
  /** Show a border (useful for active states) */
  bordered?: boolean;
  /** Border color */
  borderColor?: string;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
};

const FONT_SIZE_MAP: Record<AvatarSize, number> = {
  sm: 11,
  md: 13,
  lg: 18,
  xl: 24,
};

// Carefully selected palette that works on dark backgrounds
const AVATAR_PALETTE = [
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#F43F5E", // rose
  "#F59E0B", // amber
  "#10B981", // emerald
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#A855F7", // purple
  "#14B8A6", // teal
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit int
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({
  name = "",
  imageUrl,
  size = "md",
  bordered = false,
  borderColor = "#CBB282",
}: AvatarProps) {
  const dimension = SIZE_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];

  const { initials, bgColor } = useMemo(() => {
    const init = getInitials(name || "?");
    const bg = AVATAR_PALETTE[hashName(name || "?") % AVATAR_PALETTE.length];
    return { initials: init, bgColor: bg };
  }, [name]);

  const containerStyle = [
    styles.container,
    {
      width: dimension,
      height: dimension,
      borderRadius: dimension / 2,
      backgroundColor: imageUrl ? "#E2E8F0" : bgColor,
    },
    bordered && {
      borderWidth: 2,
      borderColor,
    },
  ];

  if (imageUrl) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.image,
            {
              width: dimension - (bordered ? 4 : 0),
              height: dimension - (bordered ? 4 : 0),
              borderRadius: dimension / 2,
            },
          ]}
        />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Text
        style={[
          styles.initials,
          { fontSize, lineHeight: fontSize * 1.2 },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    resizeMode: "cover",
  },
  initials: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
