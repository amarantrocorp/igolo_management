import React, { useCallback, useState } from "react";
import { View, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import {
  Building2,
  ChevronRight,
  Check,
  Crown,
  Briefcase,
  LogOut,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { mediumHaptic } from "../../lib/haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
  FadeInRight,
  FadeIn as ReanimatedFadeIn,
} from "react-native-reanimated";
import { Text } from "../../components/atoms/Text";
import { Badge } from "../../components/atoms/Badge";
import { PressScale } from "../../components/animations/PressScale";
import { useAuthStore } from "../../features/auth/store";
import { getMe } from "../../features/auth/api";
import { COLORS } from "../../lib/constants";
import type { UserRole } from "../../types";

const ROLE_DISPLAY: Record<
  UserRole,
  {
    label: string;
    variant: "default" | "secondary" | "success" | "warning" | "destructive";
    color: string;
  }
> = {
  SUPER_ADMIN: { label: "Super Admin", variant: "destructive", color: "#EF4444" },
  MANAGER: { label: "Manager", variant: "warning", color: "#F59E0B" },
  BDE: { label: "BDE", variant: "default", color: COLORS.gold },
  SALES: { label: "Sales", variant: "default", color: COLORS.gold },
  SUPERVISOR: { label: "Supervisor", variant: "success", color: "#22C55E" },
  CLIENT: { label: "Client", variant: "secondary", color: "#64748B" },
  LABOR_LEAD: { label: "Labor Lead", variant: "secondary", color: "#64748B" },
};

// Skeleton shimmer placeholder
function SkeletonCard() {
  return (
    <View
      className="rounded-2xl border border-border p-4 mb-3"
      style={{ backgroundColor: "#F8FAFC" }}
    >
      <View className="flex-row items-center">
        <View
          className="w-12 h-12 rounded-full mr-4"
          style={{ backgroundColor: "#E2E8F0" }}
        />
        <View className="flex-1">
          <View
            className="rounded-md mb-2"
            style={{ width: "60%", height: 14, backgroundColor: "#E2E8F0" }}
          />
          <View
            className="rounded-md"
            style={{ width: "30%", height: 10, backgroundColor: "#E2E8F0" }}
          />
        </View>
      </View>
    </View>
  );
}

export default function OrgSelectorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const organizations = useAuthStore((s) => s.organizations);
  const selectOrg = useAuthStore((s) => s.selectOrg);
  const loginFn = useAuthStore((s) => s.login);
  const token = useAuthStore((s) => s.token);

  const logout = useAuthStore((s) => s.logout);

  const [loading, setLoading] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = useCallback(() => {
    logout();
    router.replace("/(auth)/login");
  }, [logout, router]);

  const handleSelectOrg = async (orgId: string) => {
    setError(null);
    setSelectedOrg(orgId);
    setLoading(orgId);

    mediumHaptic();

    try {
      await selectOrg(orgId);

      const me = await getMe();

      // Block platform admins
      if (me.is_platform_admin) {
        const { clearTokens } = await import("../../lib/storage");
        await clearTokens();
        useAuthStore.getState().logout();
        setError(
          "Platform administrators cannot use the mobile app. Please use the web dashboard."
        );
        setSelectedOrg(null);
        return;
      }

      await loginFn(
        useAuthStore.getState().token!,
        useAuthStore.getState().refreshToken,
        me,
        me.active_org_id,
        me.role_in_org,
        me.organizations
      );

      router.replace("/");
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to select organization.";
      setError(typeof message === "string" ? message : "Something went wrong.");
      setSelectedOrg(null);
    } finally {
      setLoading(null);
    }
  };

  const isEmpty = !organizations || organizations.length === 0;

  return (
    <View className="flex-1 bg-white">
      {/* Hero Section */}
      <View
        style={{ paddingTop: insets.top + 24, paddingBottom: 44 }}
        className="relative overflow-hidden"
      >
        <LinearGradient
          colors={["#0B1120", "#131D35", "#0B1120"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        {/* Decorative */}
        <View
          style={{
            position: "absolute",
            top: -30,
            right: -20,
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 1,
            borderColor: COLORS.gold,
            opacity: 0.06,
          }}
        />

        <Animated.View
          entering={FadeInDown.duration(600).springify().damping(18)}
          className="px-6 pt-6 items-center"
        >
          {/* Building icon */}
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: COLORS.gold + "15",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1.5,
              borderColor: COLORS.gold + "30",
              marginBottom: 16,
            }}
          >
            <Briefcase size={28} color={COLORS.gold} />
          </View>

          <Text
            variant="title"
            weight="bold"
            className="text-white text-center mb-1"
            style={{ fontSize: 24 }}
          >
            Choose Your Workspace
          </Text>
          <Text
            variant="body"
            style={{ color: "#94A3B8" }}
            className="text-center"
          >
            Select an organization to continue
          </Text>
        </Animated.View>
      </View>

      {/* Content Card */}
      <View
        style={{
          marginTop: -20,
          flex: 1,
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 6,
        }}
        className="px-6 pt-7"
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200).springify().damping(18)}
          className="mb-5"
        >
          <Text variant="label" weight="semibold" className="text-muted-foreground">
            {organizations.length} workspace{organizations.length !== 1 ? "s" : ""}{" "}
            available
          </Text>
        </Animated.View>

        {/* Error */}
        {error && (
          <Animated.View
            entering={FadeInDown.duration(300).springify()}
            className="bg-red-50 border border-red-200 rounded-2xl p-3.5 mb-4"
          >
            <Text variant="label" className="text-destructive text-center">
              {error}
            </Text>
          </Animated.View>
        )}

        {/* Org list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {isEmpty
            ? // Skeleton loading
              Array.from({ length: 3 }).map((_, i) => (
                <Animated.View
                  key={i}
                  entering={FadeInRight.duration(400)
                    .delay(i * 100)
                    .springify()
                    .damping(18)}
                >
                  <SkeletonCard />
                </Animated.View>
              ))
            : organizations.map((org, index) => {
                const isLoading = loading === org.org_id;
                const isSelected = selectedOrg === org.org_id;
                const isOtherLoading = loading && !isLoading;
                const roleInfo = ROLE_DISPLAY[org.role] || {
                  label: org.role,
                  variant: "secondary" as const,
                  color: "#64748B",
                };

                return (
                  <Animated.View
                    key={org.org_id}
                    entering={FadeInRight.duration(400)
                      .delay(300 + index * 120)
                      .springify()
                      .damping(18)}
                  >
                    <PressScale
                      onPress={() => handleSelectOrg(org.org_id)}
                      disabled={!!loading}
                      scaleTo={0.97}
                      haptic={false}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${org.org_name}`}
                      style={{
                        opacity: isOtherLoading ? 0.45 : 1,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: isSelected ? "#FEFCF7" : "#FFFFFF",
                          borderWidth: isSelected ? 2 : 1.5,
                          borderColor: isSelected
                            ? COLORS.gold
                            : COLORS.border,
                          borderRadius: 18,
                          padding: 16,
                          marginBottom: 12,
                          // Left accent bar
                          borderLeftWidth: 4,
                          borderLeftColor: isSelected
                            ? COLORS.gold
                            : roleInfo.color + "60",
                          // Shadow for selected
                          shadowColor: isSelected ? COLORS.gold : "transparent",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: isSelected ? 0.15 : 0,
                          shadowRadius: 8,
                          elevation: isSelected ? 3 : 0,
                        }}
                      >
                        {/* Org icon */}
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            backgroundColor: "#0B1120",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 14,
                          }}
                        >
                          <Building2 size={22} color={COLORS.gold} />
                        </View>

                        {/* Org info */}
                        <View className="flex-1">
                          <View className="flex-row items-center mb-1.5">
                            <Text
                              variant="body"
                              weight="bold"
                              className="flex-1 mr-2"
                              style={{ fontSize: 16 }}
                            >
                              {org.org_name}
                            </Text>
                            {org.is_default && (
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  backgroundColor: COLORS.gold + "15",
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 8,
                                }}
                              >
                                <Crown size={10} color={COLORS.gold} />
                                <Text
                                  variant="caption"
                                  weight="semibold"
                                  style={{
                                    color: COLORS.gold,
                                    marginLeft: 3,
                                    fontSize: 10,
                                  }}
                                >
                                  DEFAULT
                                </Text>
                              </View>
                            )}
                          </View>
                          <Badge variant={roleInfo.variant}>
                            {roleInfo.label}
                          </Badge>
                        </View>

                        {/* Action indicator */}
                        {isLoading ? (
                          <ActivityIndicator size="small" color={COLORS.gold} />
                        ) : isSelected ? (
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: COLORS.gold,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Check size={16} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        ) : (
                          <ChevronRight
                            size={20}
                            color={COLORS.mutedForeground}
                          />
                        )}
                      </View>
                    </PressScale>
                  </Animated.View>
                );
              })}
          {/* Sign out link */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(600).springify().damping(18)}
            style={{ alignItems: "center", marginTop: 8 }}
          >
            <Pressable
              onPress={handleSignOut}
              accessibilityRole="button"
              accessibilityLabel="Use a different account"
              hitSlop={12}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
            >
              <LogOut size={14} color={COLORS.mutedForeground} />
              <Text
                variant="label"
                weight="medium"
                style={{ color: COLORS.mutedForeground, marginLeft: 6 }}
              >
                Use a different account
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}
