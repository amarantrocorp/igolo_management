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
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { Plus, Inbox } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
  FadeIn,
  interpolate,
} from "react-native-reanimated";
import { useQueryClient } from "@tanstack/react-query";
import { useLeads } from "../../../features/leads/hooks";
import LeadCard from "../../../features/leads/components/LeadCard";
import { SearchBar } from "../../../components/molecules/SearchBar";
import { COLORS } from "../../../lib/constants";
import type { Lead, LeadStatus } from "../../../types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const STATUS_FILTERS: { label: string; value: LeadStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "New", value: "NEW" },
  { label: "Contacted", value: "CONTACTED" },
  { label: "Qualified", value: "QUALIFIED" },
  { label: "Quote Sent", value: "QUOTATION_SENT" },
  { label: "Negotiation", value: "NEGOTIATION" },
  { label: "Converted", value: "CONVERTED" },
  { label: "Lost", value: "LOST" },
];

function FilterChip({
  label,
  isActive,
  onPress,
  index,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  index: number;
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

export default function LeadsListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<LeadStatus | undefined>(
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
  } = useLeads({
    status: activeStatus,
    search: debouncedSearch || undefined,
  });

  const leads = useMemo(
    () => data?.pages?.flatMap((page) => page?.items ?? []) ?? [],
    [data]
  );

  const totalCount = data?.pages[0]?.total ?? 0;

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => {
    queryClient.resetQueries({ queryKey: ["leads"] });
  }, [queryClient]);

  const handleStatusFilter = useCallback((status: LeadStatus | undefined) => {
    setActiveStatus(status);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Lead; index: number }) => (
      <LeadCard lead={item} index={index} />
    ),
    []
  );

  const keyExtractor = useCallback((item: Lead) => item.id, []);

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
          <Inbox size={40} color={COLORS.mutedForeground} strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>No leads found</Text>
        <Text style={styles.emptySubtitle}>
          {debouncedSearch || activeStatus
            ? "Try changing your filters or search term"
            : "Tap the + button to create your first lead"}
        </Text>
      </Animated.View>
    );
  }, [isLoading, debouncedSearch, activeStatus]);

  // FAB animation
  const fabScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Leads</Text>
          {totalCount > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totalCount}</Text>
            </View>
          ) : null}
        </View>

        {/* Search Bar */}
        <SearchBar
          onChangeText={handleSearchChange}
          placeholder="Search leads..."
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
          {STATUS_FILTERS.map((filter, index) => (
            <FilterChip
              key={filter.label}
              label={filter.label}
              isActive={activeStatus === filter.value}
              onPress={() => handleStatusFilter(filter.value)}
              index={index}
            />
          ))}
        </ScrollView>
      </View>

      {/* Lead List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
        </View>
      ) : (
        <FlashList
          data={leads}
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

      {/* FAB */}
      <AnimatedPressable
        onPressIn={() => {
          fabScale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          fabScale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }}
        onPress={() => router.push("/(tabs)/leads/new")}
        style={[styles.fab, fabStyle]}
        accessibilityRole="button"
        accessibilityLabel="Create new lead"
      >
        <Plus size={24} color="#0B1120" strokeWidth={2.5} />
      </AnimatedPressable>
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
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
