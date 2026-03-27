import { Stack } from "expo-router";
import { COLORS } from "../../../lib/constants";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.primary,
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: COLORS.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "My Profile",
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: "App Settings",
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="notification-settings"
        options={{
          title: "Notification Preferences",
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
