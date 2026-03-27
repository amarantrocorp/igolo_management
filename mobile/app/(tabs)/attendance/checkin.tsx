import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, MapPin } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Text } from "../../../components/atoms/Text";
import { COLORS } from "../../../lib/constants";
import CheckInFlow from "../../../features/checkin/components/CheckInFlow";

export default function CheckInScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(300)}
        style={styles.header}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={COLORS.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <MapPin size={16} color={COLORS.gold} />
          <Text
            variant="label"
            weight="bold"
            style={{ color: COLORS.text, marginLeft: 6 }}
          >
            GPS Check-In
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </Animated.View>

      {/* Flow */}
      <CheckInFlow onComplete={() => {}} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.muted,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
});
