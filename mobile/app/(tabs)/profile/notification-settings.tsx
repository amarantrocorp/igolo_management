import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Switch,
  Pressable,
  Linking,
  Platform,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Bell,
  BellOff,
  Users,
  FileCheck,
  CreditCard,
  Timer,
  ClipboardList,
  ExternalLink,
} from "lucide-react-native";
import { Text } from "../../../components/atoms/Text";
import { Card } from "../../../components/atoms/Card";
import { COLORS } from "../../../lib/constants";

// ─── Storage keys ────────────────────────────────────────────
const STORAGE_PREFIX = "igolo_notif_pref_";
const MASTER_KEY = `${STORAGE_PREFIX}master`;

const PREF_KEYS = {
  new_lead: `${STORAGE_PREFIX}new_lead`,
  quote_approval: `${STORAGE_PREFIX}quote_approval`,
  payment_received: `${STORAGE_PREFIX}payment_received`,
  sprint_update: `${STORAGE_PREFIX}sprint_update`,
  daily_log: `${STORAGE_PREFIX}daily_log`,
} as const;

type PrefKey = keyof typeof PREF_KEYS;

interface PrefToggle {
  key: PrefKey;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const TOGGLES: PrefToggle[] = [
  {
    key: "new_lead",
    label: "New Leads",
    description: "When a new lead is assigned to you",
    icon: <Users size={18} color={COLORS.mutedForeground} />,
  },
  {
    key: "quote_approval",
    label: "Quote Approvals",
    description: "Quote approval requests and status changes",
    icon: <FileCheck size={18} color={COLORS.mutedForeground} />,
  },
  {
    key: "payment_received",
    label: "Payments",
    description: "Client payments and financial updates",
    icon: <CreditCard size={18} color={COLORS.mutedForeground} />,
  },
  {
    key: "sprint_update",
    label: "Sprint Updates",
    description: "Sprint status changes and delays",
    icon: <Timer size={18} color={COLORS.mutedForeground} />,
  },
  {
    key: "daily_log",
    label: "Daily Logs",
    description: "New daily progress logs from site",
    icon: <ClipboardList size={18} color={COLORS.mutedForeground} />,
  },
];

// ─── Helpers ─────────────────────────────────────────────────

async function loadPreferences(): Promise<{
  master: boolean;
  prefs: Record<PrefKey, boolean>;
}> {
  const keys = [MASTER_KEY, ...Object.values(PREF_KEYS)];
  const pairs = await AsyncStorage.multiGet(keys);
  const map = new Map(pairs);

  const master = map.get(MASTER_KEY) !== "false"; // default true
  const prefs = {} as Record<PrefKey, boolean>;
  for (const [key, storageKey] of Object.entries(PREF_KEYS) as [
    PrefKey,
    string,
  ][]) {
    prefs[key] = map.get(storageKey) !== "false"; // default true
  }

  return { master, prefs };
}

async function savePref(storageKey: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(storageKey, value ? "true" : "false");
}

// ─── Component ───────────────────────────────────────────────

export default function NotificationSettingsScreen() {
  const [master, setMaster] = useState(true);
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({
    new_lead: true,
    quote_approval: true,
    payment_received: true,
    sprint_update: true,
    daily_log: true,
  });
  const [systemDenied, setSystemDenied] = useState(false);

  // Load saved preferences and check system permission
  useEffect(() => {
    loadPreferences().then(({ master: m, prefs: p }) => {
      setMaster(m);
      setPrefs(p);
    });

    // Dynamic import to avoid crash in Expo Go (no native notification module)
    import("expo-notifications")
      .then((Notifications) =>
        Notifications.getPermissionsAsync().then(({ status }) => {
          setSystemDenied(status === "denied");
        })
      )
      .catch(() => {
        // expo-notifications not available (Expo Go) — assume not denied
        setSystemDenied(false);
      });
  }, []);

  const handleMasterToggle = useCallback(
    async (value: boolean) => {
      if (systemDenied && value) {
        Alert.alert(
          "Notifications Disabled",
          "Push notifications are disabled at the system level. Please enable them in your device Settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                if (Platform.OS === "ios") {
                  Linking.openSettings();
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
        return;
      }

      setMaster(value);
      await savePref(MASTER_KEY, value);
    },
    [systemDenied]
  );

  const handlePrefToggle = useCallback(
    async (key: PrefKey, value: boolean) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));
      await savePref(PREF_KEYS[key], value);
    },
    []
  );

  const handleOpenSystemSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-4 pb-12"
      showsVerticalScrollIndicator={false}
    >
      {/* System permission warning */}
      {systemDenied && (
        <Pressable
          onPress={handleOpenSystemSettings}
          className="bg-destructive/10 rounded-xl px-4 py-3 mt-4 flex-row items-center"
        >
          <BellOff size={18} color={COLORS.destructive} />
          <View className="flex-1 ml-3">
            <Text variant="label" weight="medium" className="text-destructive">
              Notifications Blocked
            </Text>
            <Text variant="caption" className="text-destructive/80 mt-0.5">
              Tap to open Settings and enable notifications
            </Text>
          </View>
          <ExternalLink size={16} color={COLORS.destructive} />
        </Pressable>
      )}

      {/* Master toggle */}
      <Text
        variant="caption"
        weight="semibold"
        className="text-muted-foreground uppercase tracking-wide mb-2 mt-4 px-1"
      >
        General
      </Text>
      <Card padding="md">
        <View className="flex-row items-center justify-between py-1">
          <View className="flex-row items-center flex-1 mr-4">
            <View className="w-9 h-9 rounded-lg bg-muted items-center justify-center mr-3">
              <Bell size={18} color={COLORS.mutedForeground} />
            </View>
            <View className="flex-1">
              <Text variant="label" weight="medium">
                Push Notifications
              </Text>
              <Text
                variant="caption"
                className="text-muted-foreground mt-0.5"
              >
                Master switch for all push notifications
              </Text>
            </View>
          </View>
          <Switch
            value={master}
            onValueChange={handleMasterToggle}
            trackColor={{ false: "#E2E8F0", true: COLORS.gold }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Toggle push notifications master switch"
            accessibilityRole="switch"
            accessibilityState={{ checked: master }}
          />
        </View>
      </Card>

      {/* Per-type toggles */}
      <Text
        variant="caption"
        weight="semibold"
        className="text-muted-foreground uppercase tracking-wide mb-2 mt-4 px-1"
      >
        Notification Types
      </Text>
      <Card padding="md">
        {TOGGLES.map((toggle, index) => (
          <React.Fragment key={toggle.key}>
            {index > 0 && <View className="h-px bg-border my-1" />}
            <View
              className="flex-row items-center justify-between py-3"
              style={!master ? { opacity: 0.4 } : undefined}
            >
              <View className="flex-row items-center flex-1 mr-4">
                <View className="w-9 h-9 rounded-lg bg-muted items-center justify-center mr-3">
                  {toggle.icon}
                </View>
                <View className="flex-1">
                  <Text variant="label" weight="medium">
                    {toggle.label}
                  </Text>
                  <Text
                    variant="caption"
                    className="text-muted-foreground mt-0.5"
                  >
                    {toggle.description}
                  </Text>
                </View>
              </View>
              <Switch
                value={prefs[toggle.key]}
                onValueChange={(val) => handlePrefToggle(toggle.key, val)}
                trackColor={{ false: "#E2E8F0", true: COLORS.gold }}
                thumbColor="#FFFFFF"
                disabled={!master}
                accessibilityLabel={`Toggle ${toggle.label} notifications`}
                accessibilityRole="switch"
                accessibilityState={{ checked: prefs[toggle.key] }}
              />
            </View>
          </React.Fragment>
        ))}
      </Card>

      {/* Hint */}
      <View className="mt-6 px-1">
        <Text variant="caption" className="text-muted-foreground text-center">
          Notification preferences are stored locally on this device. You will
          still receive in-app notifications regardless of these settings.
        </Text>
      </View>
    </ScrollView>
  );
}
