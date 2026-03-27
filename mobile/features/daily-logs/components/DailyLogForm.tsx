import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from "react-native";
import { useToast } from "../../../components/molecules/Toast";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImagePlus, X, Send, WifiOff } from "lucide-react-native";
import { COLORS } from "../../../lib/constants";
import { useUploadPhoto } from "../hooks";
import { useNetworkStatus } from "../../../lib/network-status";
import { enqueueAction } from "../../../lib/offline-queue";
import type { Sprint } from "../../../types";

interface DailyLogFormProps {
  sprints: Sprint[];
  onSubmit: (data: DailyLogFormValues) => void;
  isSubmitting: boolean;
}

export interface DailyLogFormValues {
  sprint_id: string;
  date: string;
  notes: string;
  images: string[];
  blockers?: string;
  visible_to_client: boolean;
  progress_percentage: number;
}

export default function DailyLogForm({
  sprints,
  onSubmit,
  isSubmitting,
}: DailyLogFormProps) {
  const [selectedSprintId, setSelectedSprintId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [blockers, setBlockers] = useState("");
  const [visibleToClient, setVisibleToClient] = useState(false);
  const [progress, setProgress] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [localPhotos, setLocalPhotos] = useState<
    { uri: string; uploading: boolean; uploaded: boolean }[]
  >([]);

  const uploadPhoto = useUploadPhoto();
  const toast = useToast();
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOffline = !isConnected || !isInternetReachable;

  const requestCameraPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      toast.show("Camera access is needed to take site photos.", "warning");
      return false;
    }
    return true;
  }, []);

  const pickImage = useCallback(
    async (useCamera: boolean) => {
      if (localPhotos.length >= 5) {
        toast.show("You can add up to 5 photos per log.", "warning");
        return;
      }

      if (useCamera) {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) return;
      }

      try {
        const result = useCamera
          ? await ImagePicker.launchCameraAsync({
              quality: 0.7,
              allowsEditing: false,
            })
          : await ImagePicker.launchImageLibraryAsync({
              quality: 0.7,
              allowsEditing: false,
              mediaTypes: ["images"],
            });

        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        const uri = asset.uri;
        const fileName =
          asset.fileName ?? `photo_${Date.now()}.${asset.mimeType?.split("/")[1] ?? "jpg"}`;
        const mimeType = asset.mimeType ?? "image/jpeg";

        const photoIndex = localPhotos.length;

        if (isOffline) {
          // Offline: store the local URI; photos will be uploaded when the queued log is processed
          setLocalPhotos((prev) => [
            ...prev,
            { uri, uploading: false, uploaded: false },
          ]);
        } else {
          setLocalPhotos((prev) => [
            ...prev,
            { uri, uploading: true, uploaded: false },
          ]);

          uploadPhoto.mutate(
            { fileUri: uri, fileName, mimeType },
            {
              onSuccess: (data) => {
                setPhotoUrls((prev) => [...prev, data.url]);
                setLocalPhotos((prev) =>
                  prev.map((p, i) =>
                    i === photoIndex ? { ...p, uploading: false, uploaded: true } : p
                  )
                );
              },
              onError: () => {
                toast.show("Could not upload photo. Please try again.", "error");
                setLocalPhotos((prev) => prev.filter((_, i) => i !== photoIndex));
              },
            }
          );
        }
      } catch {
        toast.show("Failed to pick image.", "error");
      }
    },
    [localPhotos.length, requestCameraPermission, uploadPhoto, isOffline]
  );

  const handleAddPhoto = useCallback(() => {
    Alert.alert("Add Photo", "Choose source", [
      { text: "Camera", onPress: () => pickImage(true) },
      { text: "Gallery", onPress: () => pickImage(false) },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [pickImage]);

  const removePhoto = useCallback(
    (index: number) => {
      setLocalPhotos((prev) => prev.filter((_, i) => i !== index));
      setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!selectedSprintId) {
      toast.show("Please select a sprint.", "warning");
      return;
    }
    if (notes.trim().length < 10) {
      toast.show("Notes must be at least 10 characters.", "warning");
      return;
    }

    const hasUploading = localPhotos.some((p) => p.uploading);
    if (hasUploading) {
      toast.show("Photos are still uploading.", "info");
      return;
    }

    if (isOffline) {
      // Save as a queued action with local photo URIs.
      // The offline queue processor will upload photos and submit
      // when the device comes back online.
      const localPhotoUris = localPhotos.map((p) => p.uri);
      await enqueueAction({
        type: "CREATE_DAILY_LOG",
        payload: {
          sprint_id: selectedSprintId,
          date: new Date().toISOString().split("T")[0],
          notes: notes.trim(),
          images: [], // No uploaded URLs yet
          localPhotoUris, // Local URIs for deferred upload
          blockers: blockers.trim() || undefined,
          visible_to_client: visibleToClient,
          progress_percentage: progress,
        },
        endpoint: "/projects/daily-logs",
        method: "POST",
      });
      toast.show("Daily log saved offline. It will sync when you reconnect.", "info");
      // Reset form
      setNotes("");
      setBlockers("");
      setLocalPhotos([]);
      setPhotoUrls([]);
      setProgress(0);
      return;
    }

    onSubmit({
      sprint_id: selectedSprintId,
      date: new Date().toISOString().split("T")[0],
      notes: notes.trim(),
      images: photoUrls,
      blockers: blockers.trim() || undefined,
      visible_to_client: visibleToClient,
      progress_percentage: progress,
    });
  }, [
    selectedSprintId,
    notes,
    blockers,
    visibleToClient,
    progress,
    photoUrls,
    localPhotos,
    isOffline,
    onSubmit,
  ]);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Sprint Picker */}
      <Text className="text-sm font-semibold mb-2" style={{ color: COLORS.text }}>
        Sprint *
      </Text>
      {sprints.length === 0 ? (
        <View
          className="px-4 py-3 rounded-xl mb-4"
          style={{
            backgroundColor: COLORS.muted,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text className="text-sm" style={{ color: COLORS.mutedForeground }}>
            No sprints available
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
          contentContainerStyle={{ gap: 8 }}
        >
          {sprints.map((sprint) => {
            const isSelected = selectedSprintId === sprint.id;
            return (
              <Pressable
                key={sprint.id}
                onPress={() => setSelectedSprintId(sprint.id)}
                className="px-4 py-2 rounded-full"
                style={{
                  backgroundColor: isSelected ? COLORS.primary : COLORS.muted,
                  borderWidth: 1,
                  borderColor: isSelected ? COLORS.primary : COLORS.border,
                }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{
                    color: isSelected ? COLORS.primaryForeground : COLORS.text,
                  }}
                >
                  {sprint.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Date */}
      <Text className="text-sm font-semibold mb-2" style={{ color: COLORS.text }}>
        Date
      </Text>
      <View
        className="px-4 py-3 rounded-xl mb-4"
        style={{
          backgroundColor: COLORS.muted,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <Text className="text-sm" style={{ color: COLORS.text }}>
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>

      {/* Notes */}
      <Text className="text-sm font-semibold mb-2" style={{ color: COLORS.text }}>
        Notes * (min 10 characters)
      </Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="What work was done today?"
        placeholderTextColor={COLORS.mutedForeground}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        maxLength={5000}
        className="px-4 py-3 rounded-xl mb-4 text-sm"
        style={{
          backgroundColor: COLORS.muted,
          borderWidth: 1,
          borderColor: COLORS.border,
          color: COLORS.text,
          minHeight: 100,
        }}
      />

      {/* Progress */}
      <Text className="text-sm font-semibold mb-2" style={{ color: COLORS.text }}>
        Progress: {progress}%
      </Text>
      <View className="flex-row items-center mb-4 gap-3">
        <Pressable
          onPress={() => setProgress(Math.max(0, progress - 10))}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: COLORS.muted, borderWidth: 1, borderColor: COLORS.border }}
        >
          <Text className="text-lg font-bold" style={{ color: COLORS.text }}>-</Text>
        </Pressable>
        <View className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: COLORS.muted }}>
          <View
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              backgroundColor: progress < 30 ? COLORS.destructive : progress < 70 ? COLORS.warning : COLORS.success,
            }}
          />
        </View>
        <Pressable
          onPress={() => setProgress(Math.min(100, progress + 10))}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: COLORS.muted, borderWidth: 1, borderColor: COLORS.border }}
        >
          <Text className="text-lg font-bold" style={{ color: COLORS.text }}>+</Text>
        </Pressable>
      </View>

      {/* Photos */}
      <Text className="text-sm font-semibold mb-2" style={{ color: COLORS.text }}>
        Photos ({localPhotos.length}/5)
      </Text>
      <View className="flex-row flex-wrap gap-3 mb-4">
        {localPhotos.map((photo, index) => (
          <View key={`photo-${index}`} className="relative">
            <Image
              source={{ uri: photo.uri }}
              className="w-20 h-20 rounded-xl"
              resizeMode="cover"
            />
            {photo.uploading && (
              <View className="absolute inset-0 rounded-xl items-center justify-center bg-black/40">
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
            <Pressable
              onPress={() => removePhoto(index)}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full items-center justify-center"
              style={{ backgroundColor: COLORS.destructive }}
            >
              <X size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        ))}
        {localPhotos.length < 5 && (
          <Pressable
            onPress={handleAddPhoto}
            className="w-20 h-20 rounded-xl items-center justify-center"
            style={{
              borderWidth: 2,
              borderColor: COLORS.border,
              borderStyle: "dashed",
            }}
          >
            <Camera size={24} color={COLORS.mutedForeground} />
            <Text
              className="text-xs mt-1"
              style={{ color: COLORS.mutedForeground }}
            >
              Add
            </Text>
          </Pressable>
        )}
      </View>

      {/* Blockers */}
      <Text className="text-sm font-semibold mb-2" style={{ color: COLORS.text }}>
        Blockers (optional)
      </Text>
      <TextInput
        value={blockers}
        onChangeText={setBlockers}
        placeholder="Any blockers or issues?"
        placeholderTextColor={COLORS.mutedForeground}
        multiline
        numberOfLines={2}
        textAlignVertical="top"
        maxLength={2000}
        className="px-4 py-3 rounded-xl mb-4 text-sm"
        style={{
          backgroundColor: COLORS.muted,
          borderWidth: 1,
          borderColor: COLORS.border,
          color: COLORS.text,
          minHeight: 60,
        }}
      />

      {/* Visible to Client */}
      <View
        className="flex-row items-center justify-between px-4 py-3 rounded-xl mb-6"
        style={{
          backgroundColor: COLORS.muted,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <Text className="text-sm font-medium" style={{ color: COLORS.text }}>
          Visible to Client
        </Text>
        <Switch
          value={visibleToClient}
          onValueChange={setVisibleToClient}
          trackColor={{ false: COLORS.border, true: COLORS.gold }}
          thumbColor={COLORS.background}
        />
      </View>

      {/* Offline notice */}
      {isOffline && (
        <View
          className="flex-row items-center gap-2 px-4 py-3 rounded-xl mb-3"
          style={{ backgroundColor: COLORS.warning + "20", borderWidth: 1, borderColor: COLORS.warning }}
        >
          <WifiOff size={14} color={COLORS.warning} />
          <Text className="text-xs flex-1" style={{ color: COLORS.text }}>
            You're offline. The log and photos will be saved locally and synced when you reconnect.
          </Text>
        </View>
      )}

      {/* Submit */}
      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        className="flex-row items-center justify-center py-4 rounded-xl"
        style={{
          backgroundColor: isSubmitting ? COLORS.mutedForeground : COLORS.primary,
          opacity: isSubmitting ? 0.7 : 1,
        }}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={COLORS.primaryForeground} />
        ) : (
          <>
            <Send size={18} color={COLORS.primaryForeground} />
            <Text
              className="text-base font-semibold ml-2"
              style={{ color: COLORS.primaryForeground }}
            >
              {isOffline ? "Save Offline" : "Submit Daily Log"}
            </Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}
