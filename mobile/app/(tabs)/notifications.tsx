import React, { useCallback, useMemo } from "react";
import { View, RefreshControl, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Bell, CheckCheck } from "lucide-react-native";
import { Text } from "../../components/atoms/Text";
import { NotificationItem } from "../../features/notifications/components/NotificationItem";
import {
  useNotifications,
  useUnreadCount,
  useMarkAllAsRead,
} from "../../features/notifications/hooks";
import { COLORS } from "../../lib/constants";
import { isToday, parseISO } from "date-fns";
import type { Notification } from "../../types";

interface SectionItem {
  type: "header";
  title: string;
  id: string;
}

interface NotificationSectionItem {
  type: "notification";
  notification: Notification;
  id: string;
}

type ListItem = SectionItem | NotificationSectionItem;

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <View className="w-16 h-16 rounded-full bg-muted items-center justify-center mb-4">
        <Bell size={32} color={COLORS.mutedForeground} />
      </View>
      <Text variant="subtitle" weight="semibold" className="mb-1">
        No notifications yet
      </Text>
      <Text variant="label" className="text-muted-foreground text-center px-8">
        You'll see alerts, approvals, and updates here.
      </Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { data: notifications, isLoading, refetch, isRefetching } = useNotifications();
  const unreadCount = useUnreadCount();
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllAsRead();

  const handleMarkAllRead = useCallback(() => {
    markAllRead();
  }, [markAllRead]);

  // Group notifications into Today / Earlier sections
  const sectionedData = useMemo((): ListItem[] => {
    if (!notifications?.length) return [];

    const today: Notification[] = [];
    const earlier: Notification[] = [];

    for (const n of notifications) {
      try {
        if (isToday(parseISO(n.created_at))) {
          today.push(n);
        } else {
          earlier.push(n);
        }
      } catch {
        earlier.push(n);
      }
    }

    const items: ListItem[] = [];

    if (today.length > 0) {
      items.push({ type: "header", title: "Today", id: "header-today" });
      for (const n of today) {
        items.push({ type: "notification", notification: n, id: n.id });
      }
    }

    if (earlier.length > 0) {
      items.push({ type: "header", title: "Earlier", id: "header-earlier" });
      for (const n of earlier) {
        items.push({ type: "notification", notification: n, id: n.id });
      }
    }

    return items;
  }, [notifications]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === "header") {
      return (
        <View className="px-4 py-2 bg-muted/50">
          <Text variant="caption" weight="semibold" className="text-muted-foreground uppercase tracking-wide">
            {item.title}
          </Text>
        </View>
      );
    }
    return <NotificationItem notification={item.notification} />;
  }, []);

  const keyExtractor = useCallback((item: ListItem) => item.id, []);

  const getItemType = useCallback(
    (item: ListItem) => item.type,
    []
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "Notifications",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: COLORS.background },
          headerTitleStyle: { fontWeight: "600" },
          headerRight: () =>
            (unreadCount.data ?? 0) > 0 ? (
              <Pressable
                onPress={handleMarkAllRead}
                disabled={isMarkingAll}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Mark all notifications as read"
                className="mr-2"
              >
                <View className="flex-row items-center">
                  <CheckCheck
                    size={18}
                    color={isMarkingAll ? COLORS.mutedForeground : COLORS.gold}
                  />
                  <Text
                    variant="caption"
                    weight="medium"
                    className="ml-1"
                    color={isMarkingAll ? COLORS.mutedForeground : COLORS.gold}
                  >
                    Read All
                  </Text>
                </View>
              </Pressable>
            ) : null,
        }}
      />
      <View className="flex-1 bg-white" style={{ paddingBottom: 0 }}>
        {/* Unread count banner */}
        {(unreadCount.data ?? 0) > 0 && (
          <View className="px-4 py-2 bg-blue-50 border-b border-blue-100">
            <Text variant="caption" weight="medium" color="#3B82F6">
              {unreadCount.data} unread notification
              {(unreadCount.data ?? 0) !== 1 ? "s" : ""}
            </Text>
          </View>
        )}

        <FlashList
          data={sectionedData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          estimatedItemSize={72}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom }}
          ListEmptyComponent={
            isLoading ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 }}>
                <ActivityIndicator size="large" color={COLORS.gold} />
              </View>
            ) : (
              <EmptyState />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.gold}
            />
          }
        />
      </View>
    </>
  );
}
