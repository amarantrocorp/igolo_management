import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { Briefcase } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { useQueryClient } from "@tanstack/react-query";
import { useProjects } from "../../../features/projects/hooks";
import ProjectCard from "../../../features/projects/components/ProjectCard";
import { SearchBar } from "../../../components/molecules/SearchBar";
import { COLORS } from "../../../lib/constants";
import type { Project, ProjectStatus } from "../../../types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const STATUS_FILTERS: { label: string; value: ProjectStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Not Started", value: "NOT_STARTED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "On Hold", value: "ON_HOLD" },
];

function FilterChip({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPress={onPress}
      style={[
        styles.chip,
        isActive ? styles.chipActive : styles.chipInactive,
        chipStyle,
      ]}
    >
      {isActive && <View style={styles.chipDot} />}
      <Text
        style={[
          styles.chipText,
          { color: isActive ? "#0B1120" : COLORS.mutedForeground },
          isActive && { fontWeight: "700" },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export default function ProjectsListScreen() {
  const queryClient = useQueryClient();
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<ProjectStatus | undefined>(
    undefined
  );

  const handleSearchChange = useCallback((text: string) => {
    setDebouncedSearch(text);
  }, []);

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProjects({
    status: activeStatus,
    search: debouncedSearch || undefined,
  });

  const projects = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  const totalCount = data?.pages[0]?.total ?? 0;

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => {
    queryClient.resetQueries({ queryKey: ["projects"] });
  }, [queryClient]);

  const handleStatusFilter = useCallback(
    (status: ProjectStatus | undefined) => {
      setActiveStatus(status);
    },
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Project; index: number }) => (
      <ProjectCard project={item} index={index} />
    ),
    []
  );

  const keyExtractor = useCallback((item: Project) => item.id, []);

  const ListFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={COLORS.gold} />
      </View>
    );
  }, [isFetchingNextPage]);

  const ListEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <Animated.View
        entering={FadeIn.duration(400)}
        style={styles.emptyContainer}
      >
        <View style={styles.emptyIcon}>
          <Briefcase
            size={40}
            color={COLORS.mutedForeground}
            strokeWidth={1.5}
          />
        </View>
        <Text style={styles.emptyTitle}>No projects found</Text>
        <Text style={styles.emptySubtitle}>
          {debouncedSearch || activeStatus
            ? "Try changing your filters or search term"
            : "Projects will appear here once quotes are converted"}
        </Text>
      </Animated.View>
    );
  }, [isLoading, debouncedSearch, activeStatus]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Projects</Text>
          {totalCount > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totalCount}</Text>
            </View>
          ) : null}
        </View>

        {/* Search Bar */}
        <SearchBar
          onChangeText={handleSearchChange}
          placeholder="Search projects..."
          debounceMs={400}
        />
      </Animated.View>

      {/* Status Filters */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {STATUS_FILTERS.map((filter) => (
            <FilterChip
              key={filter.label}
              label={filter.label}
              isActive={activeStatus === filter.value}
              onPress={() => handleStatusFilter(filter.value)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Project List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
        </View>
      ) : (
        <FlashList
          data={projects}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          estimatedItemSize={120}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={handleRefresh}
              tintColor={COLORS.gold}
              colors={[COLORS.gold]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  countBadge: {
    backgroundColor: COLORS.gold + "20",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.gold,
  },
  filterContainer: {
    height: 44,
    marginBottom: 4,
  },
  filterScroll: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  chipInactive: {
    backgroundColor: "#FFFFFF",
    borderColor: COLORS.border,
  },
  chipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#0B1120",
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 18,
  },
});
