import React, { useState, useCallback } from "react";
import { View, ScrollView, Switch, Pressable, Linking } from "react-native";
import {
  Moon,
  BellRing,
  FileText,
  Lock,
  ChevronRight,
  Smartphone,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { Text } from "../../../components/atoms/Text";
import { Card } from "../../../components/atoms/Card";
import { COLORS } from "../../../lib/constants";
import Constants from "expo-constants";

interface SettingToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
}

function SettingToggleRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  accessibilityLabel,
}: SettingToggleRowProps) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <View className="flex-row items-center flex-1 mr-4">
        <View className="w-9 h-9 rounded-lg bg-muted items-center justify-center mr-3">
          {icon}
        </View>
        <View className="flex-1">
          <Text variant="label" weight="medium">
            {label}
          </Text>
          {description && (
            <Text variant="caption" className="text-muted-foreground mt-0.5">
              {description}
            </Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#E2E8F0", true: COLORS.gold }}
        thumbColor="#FFFFFF"
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
      />
    </View>
  );
}

interface SettingLinkRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress: () => void;
  accessibilityLabel: string;
}

function SettingLinkRow({
  icon,
  label,
  value,
  onPress,
  accessibilityLabel,
}: SettingLinkRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="flex-row items-center justify-between py-3"
      style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
    >
      <View className="flex-row items-center flex-1">
        <View className="w-9 h-9 rounded-lg bg-muted items-center justify-center mr-3">
          {icon}
        </View>
        <Text variant="label" weight="medium">
          {label}
        </Text>
      </View>
      <View className="flex-row items-center">
        {value && (
          <Text variant="caption" className="text-muted-foreground mr-2">
            {value}
          </Text>
        )}
        <ChevronRight size={16} color={COLORS.mutedForeground} />
      </View>
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      variant="caption"
      weight="semibold"
      className="text-muted-foreground uppercase tracking-wide mb-2 mt-4 px-1"
    >
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);

  const handleToggleDarkMode = useCallback((value: boolean) => {
    setDarkMode(value);
    // Dark mode implementation can be wired later to a global theme context
  }, []);

  const handleOpenNotificationSettings = useCallback(() => {
    router.push("/(tabs)/profile/notification-settings");
  }, [router]);

  const handleOpenTerms = useCallback(() => {
    Linking.openURL("https://igolo.in/terms");
  }, []);

  const handleOpenPrivacy = useCallback(() => {
    Linking.openURL("https://igolo.in/privacy");
  }, []);

  const appVersion =
    Constants.expoConfig?.version ?? Constants.manifest2?.extra?.expoClient?.version ?? "1.0.0";
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    "1";

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-4 pb-12"
      showsVerticalScrollIndicator={false}
    >
      {/* Appearance Section */}
      <SectionHeader title="Appearance" />
      <Card padding="md">
        <SettingToggleRow
          icon={<Moon size={18} color={COLORS.mutedForeground} />}
          label="Dark Mode"
          description="Use dark color theme"
          value={darkMode}
          onValueChange={handleToggleDarkMode}
          accessibilityLabel="Toggle dark mode"
        />
      </Card>

      {/* Notifications Section */}
      <SectionHeader title="Notifications" />
      <Card padding="md">
        <SettingLinkRow
          icon={<BellRing size={18} color={COLORS.mutedForeground} />}
          label="Notification Preferences"
          onPress={handleOpenNotificationSettings}
          accessibilityLabel="Open notification preferences"
        />
      </Card>

      {/* About Section */}
      <SectionHeader title="About" />
      <Card padding="md">
        <SettingLinkRow
          icon={<Smartphone size={18} color={COLORS.mutedForeground} />}
          label="App Version"
          value={`${appVersion} (${buildNumber})`}
          onPress={() => {}}
          accessibilityLabel={`App version ${appVersion}`}
        />
        <View className="h-px bg-border my-1" />
        <SettingLinkRow
          icon={<FileText size={18} color={COLORS.mutedForeground} />}
          label="Terms of Service"
          onPress={handleOpenTerms}
          accessibilityLabel="Open terms of service"
        />
        <View className="h-px bg-border my-1" />
        <SettingLinkRow
          icon={<Lock size={18} color={COLORS.mutedForeground} />}
          label="Privacy Policy"
          onPress={handleOpenPrivacy}
          accessibilityLabel="Open privacy policy"
        />
      </Card>

      {/* Footer */}
      <View className="items-center mt-8">
        <Text variant="caption" className="text-muted-foreground">
          Igolo Interior
        </Text>
        <Text variant="caption" className="text-muted-foreground mt-0.5">
          Made with care in India
        </Text>
      </View>
    </ScrollView>
  );
}
