import React, { useCallback } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import {
  Info,
  AlertTriangle,
  CheckCircle,
  CreditCard,
} from "lucide-react-native";
import { Text } from "../../../components/atoms/Text";
import { formatRelativeTime } from "../../../lib/format";
import { COLORS } from "../../../lib/constants";
import { getRouteFromNotification } from "../../../lib/deep-linking";
import { useMarkAsRead } from "../hooks";
import type { Notification, NotificationType } from "../../../types";

interface NotificationItemProps {
  notification: Notification;
}

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  INFO: {
    icon: Info,
    color: "#3B82F6",
    bgColor: "#EFF6FF",
  },
  ALERT: {
    icon: AlertTriangle,
    color: COLORS.destructive,
    bgColor: "#FEF2F2",
  },
  APPROVAL_REQ: {
    icon: CheckCircle,
    color: COLORS.warning,
    bgColor: "#FFFBEB",
  },
  PAYMENT_RECEIVED: {
    icon: CreditCard,
    color: COLORS.success,
    bgColor: "#F0FDF4",
  },
};

function NotificationItemInner({ notification }: NotificationItemProps) {
  const router = useRouter();
  const { mutate: markRead } = useMarkAsRead();

  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.INFO;
  const IconComponent = config.icon;

  const handlePress = useCallback(() => {
    if (!notification.is_read) {
      markRead(notification.id);
    }
    if (notification.action_url) {
      const route = getRouteFromNotification({ action_url: notification.action_url });
      if (route) {
        router.push(route as any);
      }
    }
  }, [notification.id, notification.is_read, notification.action_url, markRead, router]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${notification.is_read ? "" : "Unread "}${notification.title}. ${notification.body}`}
      accessibilityState={{ selected: !notification.is_read }}
      className={`
        flex-row px-4 py-3.5 border-b border-border
        ${notification.is_read ? "bg-white" : "bg-blue-50/40"}
      `}
      style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
    >
      {/* Type Icon */}
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3 mt-0.5"
        style={{ backgroundColor: config.bgColor }}
      >
        <IconComponent size={20} color={config.color} />
      </View>

      {/* Content */}
      <View className="flex-1">
        <View className="flex-row items-center justify-between mb-0.5">
          <Text
            variant="label"
            weight={notification.is_read ? "normal" : "semibold"}
            className="flex-1 mr-2"
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <View className="flex-row items-center">
            <Text variant="caption" className="text-muted-foreground">
              {formatRelativeTime(notification.created_at)}
            </Text>
            {!notification.is_read && (
              <View
                className="w-2 h-2 rounded-full bg-blue-500 ml-2"
                accessibilityLabel="Unread indicator"
              />
            )}
          </View>
        </View>
        <Text
          variant="caption"
          className="text-muted-foreground"
          numberOfLines={2}
        >
          {notification.body}
        </Text>
      </View>
    </Pressable>
  );
}

export const NotificationItem = React.memo(NotificationItemInner);
