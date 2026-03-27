import React, { useEffect, useCallback, useRef } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Tabs } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  FadeIn,
} from "react-native-reanimated";
import { lightHaptic } from "../../lib/haptics";
import {
  Home,
  Users,
  FileText,
  Briefcase,
  Bell,
  User,
  Hammer,
  Wallet,
  CreditCard,
  Calendar,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

import { useAuth } from "../../features/auth/hooks";
import { useUnreadCount } from "../../features/notifications/hooks";
import { Text } from "../../components/atoms/Text";
import { COLORS } from "../../lib/constants";
import type { UserRole } from "../../types";

// ─── Tab Configuration ──────────────────────────────────
type TabConfig = {
  name: string;
  title: string;
  icon: LucideIcon;
};

const ALL_TABS: TabConfig[] = [
  { name: "index", title: "Home", icon: Home },
  { name: "client-home", title: "Home", icon: Home },
  { name: "client-timeline", title: "Timeline", icon: Calendar },
  { name: "leads", title: "Leads", icon: Users },
  { name: "quotes", title: "Quotes", icon: FileText },
  { name: "projects", title: "Projects", icon: Briefcase },
  { name: "finance", title: "Finance", icon: Wallet },
  { name: "payments", title: "Payments", icon: CreditCard },
  { name: "attendance", title: "Site", icon: Hammer },
  { name: "notifications", title: "Alerts", icon: Bell },
  { name: "profile", title: "Profile", icon: User },
];

function getVisibleTabs(role: UserRole | null): string[] {
  switch (role) {
    case "SUPER_ADMIN":
    case "MANAGER":
      return [
        "index",
        "leads",
        "quotes",
        "projects",
        "finance",
        "notifications",
        "profile",
      ];
    case "SALES":
      return ["index", "leads", "quotes", "projects", "notifications", "profile"];
    case "BDE":
      return ["index", "leads", "notifications", "profile"];
    case "SUPERVISOR":
      return ["index", "attendance", "notifications", "profile"];
    case "CLIENT":
      return [
        "client-home",
        "client-timeline",
        "payments",
        "notifications",
        "profile",
      ];
    default:
      return ["index", "profile"];
  }
}

// ─── Notification Badge with Bounce ─────────────────────
function NotificationBadge() {
  const { data: count } = useUnreadCount();
  const bounceScale = useSharedValue(1);
  const prevCountRef = useRef(count);

  useEffect(() => {
    if (
      count != null &&
      prevCountRef.current != null &&
      count !== prevCountRef.current &&
      count > 0
    ) {
      // Bounce animation when count changes
      bounceScale.value = withSequence(
        withSpring(1.4, { damping: 6, stiffness: 400 }),
        withSpring(1, { damping: 10, stiffness: 300 })
      );
    }
    prevCountRef.current = count;
  }, [count]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceScale.value }],
  }));

  if (!count || count === 0) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[styles.badge, badgeStyle]}
    >
      <Animated.Text style={styles.badgeText}>
        {count > 99 ? "99+" : String(count)}
      </Animated.Text>
    </Animated.View>
  );
}

// ─── Animated Tab Icon ──────────────────────────────────
function AnimatedTabIcon({
  Icon,
  focused,
  tabName,
  title,
}: {
  Icon: LucideIcon;
  focused: boolean;
  tabName: string;
  title: string;
}) {
  const scale = useSharedValue(focused ? 1 : 1);
  const labelOpacity = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.08 : 1, {
      damping: 14,
      stiffness: 300,
    });
    labelOpacity.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused]);

  const iconContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    maxHeight: interpolate(labelOpacity.value, [0, 1], [0, 16]),
    marginTop: interpolate(labelOpacity.value, [0, 1], [0, 3]),
  }));

  const iconColor = focused ? COLORS.gold : COLORS.mutedForeground;
  const strokeWidth = focused ? 2.4 : 1.8;

  return (
    <Animated.View style={[styles.tabIconContainer, iconContainerStyle]}>
      <View>
        <Icon size={22} color={iconColor} strokeWidth={strokeWidth} />
        {tabName === "notifications" && <NotificationBadge />}
      </View>
      <Animated.Text
        style={[
          styles.tabLabel,
          { color: iconColor },
          labelStyle,
        ]}
        numberOfLines={1}
      >
        {title}
      </Animated.Text>
      {focused && <View style={styles.activeIndicator} />}
    </Animated.View>
  );
}

// ─── Tab Bar ────────────────────────────────────────────
export default function TabsLayout() {
  const { roleInOrg } = useAuth();
  const visibleTabs = getVisibleTabs(roleInOrg);

  const handleTabPress = useCallback(() => {
    lightHaptic();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}
      screenListeners={{
        tabPress: handleTabPress,
      }}
    >
      {ALL_TABS.map((tab) => {
        const isVisible = visibleTabs.includes(tab.name);
        const IconComponent = tab.icon;
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              href: isVisible ? undefined : null,
              tabBarIcon: ({ focused }) => (
                <AnimatedTabIcon
                  Icon={IconComponent}
                  focused={focused}
                  tabName={tab.name}
                  title={tab.title}
                />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}

// ─── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0,
    height: Platform.OS === "ios" ? 82 : 64,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
    // Elevated shadow
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 12,
  },
  tabIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
    overflow: "hidden",
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
    marginTop: 3,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 11,
  },
});
