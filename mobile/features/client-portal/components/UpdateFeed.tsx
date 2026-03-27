import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  RefreshControl,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeIn as ReanimatedFadeIn,
} from "react-native-reanimated";
import { Camera, Calendar, X, ChevronLeft, ChevronRight } from "lucide-react-native";
import { COLORS } from "../../../lib/constants";
import { formatDate, formatRelativeTime } from "../../../lib/format";
import { getFriendlyPhaseName } from "../constants";
import type { DailyLog, Sprint } from "../../../types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CAROUSEL_WIDTH = SCREEN_WIDTH - 72;

interface UpdateFeedProps {
  logs: DailyLog[];
  sprints?: Sprint[];
  isLoading?: boolean;
  isRefetching?: boolean;
  onRefresh?: () => void;
}

// ---------- Empty State ----------

function EmptyState() {
  return (
    <Animated.View
      entering={ReanimatedFadeIn.duration(600).delay(200)}
      style={styles.emptyContainer}
    >
      <View style={styles.emptyIcon}>
        <Camera size={28} color={COLORS.gold} />
      </View>
      <Text style={styles.emptyTitle}>No updates yet</Text>
      <Text style={styles.emptyDescription}>
        Your designer will post site photos and progress updates here.
      </Text>
    </Animated.View>
  );
}

// ---------- Photo Carousel with dots + full-screen ----------

function PhotoCarousel({ images }: { images: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const modalListRef = useRef<FlatList>(null);

  if (!images || images.length === 0) return null;

  const isSingle = images.length === 1;
  const photoWidth = isSingle ? CAROUSEL_WIDTH : SCREEN_WIDTH * 0.6;
  const photoHeight = photoWidth * 0.65;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const idx = Math.round(offset / photoWidth);
    if (idx !== activeIndex && idx >= 0 && idx < images.length) {
      setActiveIndex(idx);
    }
  };

  const openFullscreen = (idx: number) => {
    setModalIndex(idx);
    setModalVisible(true);
    setTimeout(() => {
      modalListRef.current?.scrollToIndex({ index: idx, animated: false });
    }, 100);
  };

  return (
    <>
      <View style={styles.carouselContainer}>
        <ScrollView
          horizontal
          pagingEnabled={isSingle}
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={isSingle ? undefined : photoWidth + 8}
          contentContainerStyle={{ gap: 8 }}
        >
          {images.map((uri, index) => (
            <Pressable
              key={`${uri}-${index}`}
              onPress={() => openFullscreen(index)}
            >
              <Image
                source={{ uri }}
                style={[
                  styles.photo,
                  { width: photoWidth, height: photoHeight },
                ]}
                resizeMode="cover"
              />
            </Pressable>
          ))}
        </ScrollView>

        {/* Dots indicator */}
        {images.length > 1 && (
          <View style={styles.dotsContainer}>
            {images.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === activeIndex
                    ? styles.dotActive
                    : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Full-screen photo modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Close button */}
          <Pressable
            style={styles.modalCloseBtn}
            onPress={() => setModalVisible(false)}
            hitSlop={16}
          >
            <X size={24} color="#FFFFFF" />
          </Pressable>

          {/* Counter */}
          <View style={styles.modalCounter}>
            <Text style={styles.modalCounterText}>
              {modalIndex + 1} / {images.length}
            </Text>
          </View>

          <FlatList
            ref={modalListRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={modalIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setModalIndex(idx);
            }}
            keyExtractor={(item, idx) => `modal-${item}-${idx}`}
            renderItem={({ item }) => (
              <View style={styles.modalImageContainer}>
                <Image
                  source={{ uri: item }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              </View>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

// ---------- Date Separator ----------

function DateSeparator({ dateStr }: { dateStr: string }) {
  return (
    <View style={styles.dateSeparator}>
      <View style={styles.dateLine} />
      <Text style={styles.dateLabel}>{formatDate(dateStr)}</Text>
      <View style={styles.dateLine} />
    </View>
  );
}

// ---------- Update Item ----------

function UpdateItem({
  log,
  sprintName,
  showDateSeparator,
  index,
}: {
  log: DailyLog;
  sprintName: string;
  showDateSeparator: boolean;
  index: number;
}) {
  const photos = log.image_urls ?? log.images ?? [];
  const dateStr = log.date || log.created_at;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(index * 60).springify().damping(18)}
    >
      {showDateSeparator && <DateSeparator dateStr={dateStr} />}

      <View style={styles.updateCard}>
        {/* Phase badge + time */}
        <View style={styles.updateHeader}>
          <View style={styles.phaseBadge}>
            <Text style={styles.phaseBadgeText}>{sprintName}</Text>
          </View>
          <Text style={styles.timeAgo}>
            {formatRelativeTime(log.created_at)}
          </Text>
        </View>

        {/* Notes */}
        {log.notes ? (
          <Text style={styles.noteText}>{log.notes}</Text>
        ) : null}

        {/* Photos */}
        <PhotoCarousel images={photos} />
      </View>
    </Animated.View>
  );
}

// ---------- Main Component ----------

export default function UpdateFeed({
  logs,
  sprints,
  isLoading,
  isRefetching,
  onRefresh,
}: UpdateFeedProps) {
  const sprintMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    if (sprints) {
      for (const s of sprints) {
        map[s.id] = getFriendlyPhaseName(s.name);
      }
    }
    return map;
  }, [sprints]);

  const getSprintName = useCallback(
    (sprintId: string) => sprintMap[sprintId] ?? "Update",
    [sprintMap]
  );

  // Sort logs newest first
  const sortedLogs = React.useMemo(
    () =>
      [...logs].sort(
        (a, b) =>
          new Date(b.date || b.created_at).getTime() -
          new Date(a.date || a.created_at).getTime()
      ),
    [logs]
  );

  if (!isLoading && sortedLogs.length === 0) {
    return <EmptyState />;
  }

  // Determine which logs need a date separator
  const getDateKey = (log: DailyLog) => {
    const d = log.date || log.created_at;
    return d ? d.split("T")[0] : "";
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.feedContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefetching ?? false}
            onRefresh={onRefresh}
            tintColor={COLORS.gold}
            colors={[COLORS.gold]}
          />
        ) : undefined
      }
    >
      {sortedLogs.map((log, idx) => {
        const prevDateKey = idx > 0 ? getDateKey(sortedLogs[idx - 1]) : null;
        const currentDateKey = getDateKey(log);
        const showSep = currentDateKey !== prevDateKey;

        return (
          <UpdateItem
            key={log.id}
            log={log}
            sprintName={getSprintName(log.sprint_id)}
            showDateSeparator={showSep}
            index={idx}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  feedContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.gold + "15",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
  },
  // Date Separator
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    paddingHorizontal: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Update Card
  updateCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  updateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  phaseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: COLORS.gold + "15",
  },
  phaseBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.gold,
  },
  timeAgo: {
    fontSize: 10,
    color: COLORS.mutedForeground,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
    marginBottom: 4,
  },
  // Photo Carousel
  carouselContainer: {
    marginTop: 10,
  },
  photo: {
    borderRadius: 12,
    backgroundColor: COLORS.muted,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: COLORS.gold,
    width: 18,
    borderRadius: 3,
  },
  dotInactive: {
    backgroundColor: COLORS.border,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
  },
  modalCloseBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCounter: {
    position: "absolute",
    top: 68,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: "center",
  },
  modalCounterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  modalImageContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 32,
    borderRadius: 8,
  },
});
