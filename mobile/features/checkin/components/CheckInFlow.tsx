import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Platform,
  Linking,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import {
  MapPin,
  Navigation,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";

import { Text } from "../../../components/atoms/Text";
import { Card } from "../../../components/atoms/Card";
import { Button } from "../../../components/atoms/Button";
import { PressScale } from "../../../components/animations/PressScale";
import { useToast } from "../../../components/molecules/Toast";
import { COLORS } from "../../../lib/constants";
import { useCheckIn } from "../hooks";
import { useProjectsForPicker } from "../../attendance/hooks";
import { MAX_CHECKIN_DISTANCE, calculateDistance, formatDistance } from "../utils";
import ProjectSelector from "./ProjectSelector";
import type { Project } from "../../../types";

type FlowStep = "permission" | "locating" | "select_project" | "confirm" | "success" | "error";

interface Props {
  onComplete?: () => void;
}

export default function CheckInFlow({ onComplete }: Props) {
  const router = useRouter();
  const toast = useToast();
  const checkInMutation = useCheckIn();
  const { data: projects = [], isLoading: projectsLoading } = useProjectsForPicker();

  const [step, setStep] = useState<FlowStep>("permission");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ---- Step 1: Request location permission ----
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    setStep("permission");

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setStep("error");
        setErrorMessage(
          "Location access is required for check-in. Please enable it in Settings."
        );
        return;
      }

      setStep("locating");
      await getCurrentLocation();
    } catch {
      setStep("error");
      setErrorMessage("Could not request location permission.");
    }
  };

  // ---- Step 2: Get GPS coordinates ----
  const getCurrentLocation = async () => {
    try {
      setStep("locating");
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCoords({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      setStep("select_project");
    } catch {
      setStep("error");
      setErrorMessage(
        "Could not determine your location. Make sure GPS is enabled."
      );
    }
  };

  // ---- Step 3: User selects a project ----
  const handleProjectSelect = useCallback((project: Project) => {
    setSelectedProject(project);
    setStep("confirm");
  }, []);

  // ---- Step 4: Confirm and submit ----
  const handleConfirm = useCallback(async () => {
    if (!selectedProject || !coords) return;

    // Double-check distance for projects with coordinates
    const p = selectedProject as any;
    const hasCoords =
      (typeof p.latitude === "number" && typeof p.longitude === "number") ||
      (typeof p.site_latitude === "number" && typeof p.site_longitude === "number");

    if (hasCoords) {
      const projLat = p.latitude ?? p.site_latitude;
      const projLng = p.longitude ?? p.site_longitude;
      const dist = calculateDistance(coords.lat, coords.lng, projLat, projLng);

      if (dist > MAX_CHECKIN_DISTANCE) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        toast.show(
          `You must be within ${MAX_CHECKIN_DISTANCE}m of the project site`,
          "error"
        );
        return;
      }
    }

    checkInMutation.mutate(
      {
        project_id: selectedProject.id,
        latitude: coords.lat,
        longitude: coords.lng,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          setStep("success");
          setTimeout(() => {
            onComplete?.();
            router.back();
          }, 1500);
        },
        onError: (error: any) => {
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          const msg =
            error?.response?.data?.detail ?? "Check-in failed. Try again.";
          toast.show(msg, "error");
        },
      }
    );
  }, [selectedProject, coords, notes, checkInMutation, router, onComplete, toast]);

  // ---- Render based on step ----
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Permission / Locating ---- */}
        {(step === "permission" || step === "locating") && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.centered}>
            <View style={styles.locatingIcon}>
              <Navigation size={32} color={COLORS.gold} />
            </View>
            <ActivityIndicator
              size="large"
              color={COLORS.gold}
              style={{ marginTop: 20 }}
            />
            <Text
              variant="body"
              weight="semibold"
              style={{ color: COLORS.text, marginTop: 16 }}
            >
              {step === "permission"
                ? "Requesting location access..."
                : "Getting your location..."}
            </Text>
            <Text
              variant="caption"
              style={{
                color: COLORS.mutedForeground,
                marginTop: 6,
                textAlign: "center",
              }}
            >
              {step === "permission"
                ? "We need GPS access to verify you are at the project site"
                : "Finding your precise position using GPS"}
            </Text>
          </Animated.View>
        )}

        {/* ---- Project Selection ---- */}
        {step === "select_project" && coords && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <MapPin size={16} color={COLORS.gold} />
                <Text
                  variant="label"
                  weight="bold"
                  style={{ color: COLORS.text, marginLeft: 8 }}
                >
                  Select Project Site
                </Text>
              </View>
              <View style={styles.coordsBadge}>
                <Text variant="caption" style={{ color: COLORS.mutedForeground, fontSize: 10 }}>
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </Text>
              </View>
            </View>

            <ProjectSelector
              projects={projects}
              userLatitude={coords.lat}
              userLongitude={coords.lng}
              isLoading={projectsLoading}
              onSelect={handleProjectSelect}
            />
          </Animated.View>
        )}

        {/* ---- Confirm ---- */}
        {step === "confirm" && selectedProject && (
          <Animated.View entering={FadeInUp.duration(400)} style={styles.confirmContainer}>
            <Card padding="md">
              <Text
                variant="label"
                weight="bold"
                style={{ color: COLORS.text, marginBottom: 12 }}
              >
                Confirm Check-In
              </Text>

              <View style={styles.confirmRow}>
                <MapPin size={14} color={COLORS.gold} />
                <Text
                  variant="body"
                  weight="semibold"
                  style={{ color: COLORS.text, marginLeft: 8 }}
                >
                  {(selectedProject.client as any)?.lead?.name ||
                    (selectedProject.client as any)?.user?.full_name ||
                    "Project"}
                </Text>
              </View>

              <Text
                variant="caption"
                style={{
                  color: COLORS.mutedForeground,
                  marginTop: 4,
                  marginLeft: 22,
                }}
              >
                {(selectedProject.client as any)?.address || ""}
              </Text>

              <View style={styles.notesContainer}>
                <Text
                  variant="caption"
                  weight="semibold"
                  style={{ color: COLORS.mutedForeground, marginBottom: 6 }}
                >
                  Notes (optional)
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="E.g., Starting carpentry work today"
                  placeholderTextColor={COLORS.mutedForeground + "80"}
                  multiline
                  numberOfLines={3}
                  style={styles.notesInput}
                />
              </View>

              <View style={styles.confirmButtons}>
                <Button
                  variant="outline"
                  size="md"
                  onPress={() => {
                    setSelectedProject(null);
                    setStep("select_project");
                  }}
                  className="flex-1 mr-2"
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onPress={handleConfirm}
                  loading={checkInMutation.isPending}
                  leftIcon={<CheckCircle size={16} color={COLORS.primary} />}
                  className="flex-1 ml-2"
                >
                  Check In
                </Button>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* ---- Success ---- */}
        {step === "success" && (
          <Animated.View
            entering={ZoomIn.duration(400).springify()}
            style={styles.centered}
          >
            <View style={styles.successCircle}>
              <CheckCircle size={48} color={COLORS.success} />
            </View>
            <Text
              variant="subtitle"
              weight="bold"
              style={{ color: COLORS.success, marginTop: 16 }}
            >
              Checked In!
            </Text>
            <Text
              variant="caption"
              style={{ color: COLORS.mutedForeground, marginTop: 6 }}
            >
              Your attendance has been recorded
            </Text>
          </Animated.View>
        )}

        {/* ---- Error ---- */}
        {step === "error" && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.centered}>
            <View style={styles.errorCircle}>
              <AlertTriangle size={32} color={COLORS.destructive} />
            </View>
            <Text
              variant="body"
              weight="semibold"
              style={{ color: COLORS.text, marginTop: 16, textAlign: "center" }}
            >
              Location Unavailable
            </Text>
            <Text
              variant="caption"
              style={{
                color: COLORS.mutedForeground,
                marginTop: 6,
                textAlign: "center",
                paddingHorizontal: 20,
              }}
            >
              {errorMessage}
            </Text>

            <View style={styles.errorButtons}>
              <Button
                variant="primary"
                size="md"
                onPress={requestLocationPermission}
              >
                Try Again
              </Button>

              <Button
                variant="outline"
                size="md"
                onPress={() => {
                  if (Platform.OS === "ios") {
                    Linking.openURL("app-settings:");
                  } else {
                    Linking.openSettings();
                  }
                }}
                className="mt-2"
              >
                Open Settings
              </Button>

              <Button
                variant="ghost"
                size="md"
                onPress={() => router.back()}
                className="mt-2"
              >
                Cancel
              </Button>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  locatingIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.gold + "15",
    alignItems: "center",
    justifyContent: "center",
  },

  // Project selection header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  coordsBadge: {
    backgroundColor: COLORS.muted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  // Confirm
  confirmContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  notesContainer: {
    marginTop: 16,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.muted,
    minHeight: 80,
    textAlignVertical: "top",
  },
  confirmButtons: {
    flexDirection: "row",
    marginTop: 16,
  },

  // Success
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.success + "15",
    alignItems: "center",
    justifyContent: "center",
  },

  // Error
  errorCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.destructive + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  errorButtons: {
    marginTop: 24,
    width: "100%",
    paddingHorizontal: 16,
  },
});
