import { Stack } from "expo-router";

export default function AttendanceLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F8FAFC" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="checkin" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="indent" />
    </Stack>
  );
}
