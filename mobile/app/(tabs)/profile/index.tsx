import React, { useCallback } from "react";
import { View, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Settings,
  LogOut,
  Building2,
  Mail,
  Phone,
  Shield,
  Calendar,
  ChevronRight,
} from "lucide-react-native";
import { Text } from "../../../components/atoms/Text";
import { Badge } from "../../../components/atoms/Badge";
import { Card } from "../../../components/atoms/Card";
import { Button } from "../../../components/atoms/Button";
import { useAuth } from "../../../features/auth/hooks";
import { useAuthStore } from "../../../features/auth/store";
import { formatDate } from "../../../lib/format";
import { COLORS } from "../../../lib/constants";
import Constants from "expo-constants";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Manager",
  BDE: "Business Development",
  SALES: "Sales",
  SUPERVISOR: "Supervisor",
  CLIENT: "Client",
  LABOR_LEAD: "Labor Lead",
};

function Avatar({ name }: { name: string }) {
  const initials = name?.trim()
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <View
      className="w-20 h-20 rounded-full bg-primary items-center justify-center"
      accessibilityLabel={`Avatar for ${name}`}
    >
      <Text variant="title" weight="bold" className="text-white">
        {initials}
      </Text>
    </View>
  );
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center py-2.5">
      <View className="w-8">{icon}</View>
      <View className="flex-1 ml-1">
        <Text variant="caption" className="text-muted-foreground">
          {label}
        </Text>
        <Text variant="label" weight="medium">
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, roleInOrg, organizations, activeOrgId } = useAuth();
  const logout = useAuthStore((s) => s.logout);
  const switchOrg = useAuthStore((s) => s.switchOrg);

  const activeOrg = organizations.find((o) => o.org_id === activeOrgId);
  const hasMultipleOrgs = organizations.length > 1;

  const handleLogout = useCallback(() => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  }, [logout]);

  const handleSwitchOrg = useCallback(() => {
    const otherOrgs = organizations.filter((o) => o.org_id !== activeOrgId);
    if (otherOrgs.length === 1) {
      Alert.alert(
        "Switch Organization",
        `Switch to ${otherOrgs[0].org_name}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Switch",
            onPress: () => switchOrg(otherOrgs[0].org_id),
          },
        ]
      );
      return;
    }

    // For multiple orgs, show action sheet style alert
    const buttons = otherOrgs.map((org) => ({
      text: org.org_name,
      onPress: () => switchOrg(org.org_id),
    }));
    buttons.push({ text: "Cancel", onPress: async () => {} });

    Alert.alert("Switch Organization", "Select an organization", buttons);
  }, [organizations, activeOrgId, switchOrg]);

  const handleOpenSettings = useCallback(() => {
    router.push("/(tabs)/profile/settings");
  }, [router]);

  const appVersion =
    Constants.expoConfig?.version ?? Constants.manifest2?.extra?.expoClient?.version ?? "1.0.0";

  if (!user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <Text variant="subtitle" className="text-muted-foreground">
          Not logged in
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="pb-12"
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View className="items-center pt-6 pb-4 px-4">
        <Avatar name={user.full_name} />
        <Text variant="title" weight="bold" className="mt-3">
          {user.full_name}
        </Text>
        {roleInOrg && (
          <Badge variant="default" className="mt-2">
            {ROLE_LABELS[roleInOrg] ?? roleInOrg}
          </Badge>
        )}
      </View>

      {/* User Info Card */}
      <View className="px-4 mb-4">
        <Card padding="md">
          <ProfileRow
            icon={<Mail size={16} color={COLORS.mutedForeground} />}
            label="Email"
            value={user.email}
          />
          {user.phone && (
            <ProfileRow
              icon={<Phone size={16} color={COLORS.mutedForeground} />}
              label="Phone"
              value={user.phone}
            />
          )}
          {roleInOrg && (
            <ProfileRow
              icon={<Shield size={16} color={COLORS.mutedForeground} />}
              label="Role"
              value={ROLE_LABELS[roleInOrg] ?? roleInOrg}
            />
          )}
          {activeOrg && (
            <ProfileRow
              icon={<Building2 size={16} color={COLORS.mutedForeground} />}
              label="Organization"
              value={activeOrg.org_name}
            />
          )}
          <ProfileRow
            icon={<Calendar size={16} color={COLORS.mutedForeground} />}
            label="Member Since"
            value={formatDate(user.created_at)}
          />
        </Card>
      </View>

      {/* Action Buttons */}
      <View className="px-4 gap-3">
        <Card
          pressable
          onPress={handleOpenSettings}
          padding="md"
          accessibilityLabel="Open app settings"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-lg bg-muted items-center justify-center mr-3">
                <Settings size={18} color={COLORS.mutedForeground} />
              </View>
              <Text variant="label" weight="medium">
                App Settings
              </Text>
            </View>
            <ChevronRight size={18} color={COLORS.mutedForeground} />
          </View>
        </Card>

        {hasMultipleOrgs && (
          <Card
            pressable
            onPress={handleSwitchOrg}
            padding="md"
            accessibilityLabel="Switch organization"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-9 h-9 rounded-lg bg-muted items-center justify-center mr-3">
                  <Building2 size={18} color={COLORS.mutedForeground} />
                </View>
                <View>
                  <Text variant="label" weight="medium">
                    Switch Organization
                  </Text>
                  <Text variant="caption" className="text-muted-foreground">
                    {organizations.length} organizations
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={COLORS.mutedForeground} />
            </View>
          </Card>
        )}

        <View className="mt-4">
          <Button
            variant="destructive"
            onPress={handleLogout}
            leftIcon={<LogOut size={18} color="#FFFFFF" />}
            accessibilityLabel="Logout from your account"
          >
            Logout
          </Button>
        </View>
      </View>

      {/* App Version */}
      <View className="items-center mt-8">
        <Text variant="caption" className="text-muted-foreground">
          Igolo Interior v{appVersion}
        </Text>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
