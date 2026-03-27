import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { FileText } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { Text } from "../../../components/atoms/Text";
import { SearchBar } from "../../../components/molecules/SearchBar";
import { QuoteCard } from "../../../features/quotes/components/QuoteCard";
import { useQuotes } from "../../../features/quotes/hooks";
import { COLORS } from "../../../lib/constants";
import type { QuoteStatus, Quotation } from "../../../types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FILTER_OPTIONS: { label: string; value: QuoteStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

function EmptyState() {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <FileText size={32} color={COLORS.mutedForeground} />
      </View>
      <Text variant="subtitle" weight="semibold" className="mb-1">
        No quotations found
      </Text>
      <Text variant="label" className="text-muted-foreground text-center px-8">
        Quotations will appear here once they are created for your leads.
      </Text>
    </Animated.View>
  );
}

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
        variant="caption"
        weight={isActive ? "bold" : "medium"}
        style={{ color: isActive ? "#0B1120" : COLORS.mutedForeground }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export default function QuotesListScreen() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "ALL">("ALL");

  const filters = useMemo(
    () => ({
      status: statusFilter === "ALL" ? undefined : statusFilter,
      limit: 50,
    }),
    [statusFilter]
  );

  const { data, isLoading, refetch, isRefetching } = useQuotes(filters);

  const filteredQuotes = useMemo(() => {
    const items = data?.items ?? [];
    if (!search.trim()) return items;
    const query = search.toLowerCase();
    return items.filter(
      (q) =>
        q.id.toLowerCase().includes(query) ||
        q.lead?.name?.toLowerCase().includes(query) ||
        q.lead?.contact_number?.includes(query)
    );
  }, [data?.items, search]);

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Quotation; index: number }) => (
      <QuoteCard quote={item} index={index} />
    ),
    []
  );

  const keyExtractor = useCallback((item: Quotation) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text variant="title" weight="bold" style={styles.headerTitle}>
          Quotations
        </Text>
      </Animated.View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <SearchBar
          onChangeText={handleSearchChange}
          placeholder="Search by ID, client name..."
          debounceMs={300}
        />
      </View>

      {/* Status Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              isActive={statusFilter === option.value}
              onPress={() => setStatusFilter(option.value)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Quote List */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.gold} />
          </View>
        ) : (
          <FlashList
            data={filteredQuotes}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            estimatedItemSize={100}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={!isLoading ? <EmptyState /> : null}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={COLORS.gold}
              />
            }
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          />
        )}
      </View>
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
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    letterSpacing: -0.5,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
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
  listContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
});
