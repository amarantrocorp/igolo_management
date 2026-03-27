import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Plus, ClipboardList } from "lucide-react-native";
import { COLORS } from "../../../../lib/constants";
import { useToast } from "../../../../components/molecules/Toast";
import { useDailyLogs, useCreateDailyLog } from "../../../../features/daily-logs/hooks";
import { fetchProject } from "../../../../features/projects/api";
import { useQuery } from "@tanstack/react-query";
import DailyLogCard from "../../../../features/daily-logs/components/DailyLogCard";
import DailyLogForm from "../../../../features/daily-logs/components/DailyLogForm";
import type { DailyLogFormValues } from "../../../../features/daily-logs/components/DailyLogForm";
import type { DailyLog } from "../../../../types";

export default function DailyLogsScreen() {
  const { id: projectId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);

  const {
    data: logs,
    isLoading,
    isRefetching,
    refetch,
  } = useDailyLogs(projectId);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  });

  const createDailyLog = useCreateDailyLog();

  const sprints = useMemo(() => project?.sprints ?? [], [project]);

  const sprintMap = useMemo(() => {
    const map = new Map<string, string>();
    sprints.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [sprints]);

  const handleSubmit = useCallback(
    (data: DailyLogFormValues) => {
      if (!projectId) return;

      createDailyLog.mutate(
        {
          projectId,
          data: {
            sprint_id: data.sprint_id,
            date: data.date,
            notes: data.notes,
            images: data.images.length > 0 ? data.images : undefined,
            blockers: data.blockers,
            visible_to_client: data.visible_to_client,
            progress_percentage: data.progress_percentage,
          },
        },
        {
          onSuccess: () => {
            setShowForm(false);
            toast.show("Daily log added successfully.", "success");
          },
          onError: (error: any) => {
            const message =
              error?.response?.data?.detail ?? "Failed to create daily log.";
            toast.show(message, "error");
          },
        }
      );
    },
    [projectId, createDailyLog]
  );

  const renderItem = useCallback(
    ({ item }: { item: DailyLog }) => (
      <DailyLogCard
        log={item}
        sprintName={sprintMap.get(item.sprint_id)}
      />
    ),
    [sprintMap]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View className="flex-1 items-center justify-center px-8 pt-20">
        <ClipboardList size={48} color={COLORS.border} />
        <Text
          className="text-base font-semibold mt-4 text-center"
          style={{ color: COLORS.text }}
        >
          No daily logs yet
        </Text>
        <Text
          className="text-sm mt-2 text-center"
          style={{ color: COLORS.mutedForeground }}
        >
          Add your first site update.
        </Text>
      </View>
    );
  }, [isLoading]);

  const keyExtractor = useCallback((item: DailyLog) => item.id, []);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#F8FAFC" }}>
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-3 border-b"
        style={{
          borderBottomColor: COLORS.border,
          backgroundColor: COLORS.background,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} className="mr-3">
          <ArrowLeft size={22} color={COLORS.text} />
        </Pressable>
        <Text className="text-lg font-bold flex-1" style={{ color: COLORS.text }}>
          Daily Logs
        </Text>
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.primary}
            />
          }
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => setShowForm(true)}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        style={{
          backgroundColor: COLORS.primary,
          elevation: 6,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        }}
        accessibilityRole="button"
        accessibilityLabel="Add daily log"
      >
        <Plus size={26} color={COLORS.primaryForeground} />
      </Pressable>

      {/* Form Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForm(false)}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: "#F8FAFC" }}>
          {/* Modal Header */}
          <View
            className="flex-row items-center justify-between px-4 py-3 border-b"
            style={{
              borderBottomColor: COLORS.border,
              backgroundColor: COLORS.background,
            }}
          >
            <Text className="text-lg font-bold" style={{ color: COLORS.text }}>
              Add Daily Log
            </Text>
            <Pressable
              onPress={() => setShowForm(false)}
              hitSlop={12}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: COLORS.mutedForeground }}
              >
                Cancel
              </Text>
            </Pressable>
          </View>

          <DailyLogForm
            sprints={sprints}
            onSubmit={handleSubmit}
            isSubmitting={createDailyLog.isPending}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
