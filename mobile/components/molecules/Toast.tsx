import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../atoms/Text";
import {
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  X,
} from "lucide-react-native";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: "#F0FDF4", border: "#BBF7D0", icon: "#16A34A" },
  error: { bg: "#FEF2F2", border: "#FECACA", icon: "#DC2626" },
  info: { bg: "#EFF6FF", border: "#BFDBFE", icon: "#2563EB" },
  warning: { bg: "#FFFBEB", border: "#FDE68A", icon: "#D97706" },
};

const TOAST_ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const AUTO_DISMISS_MS = 3000;

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: number) => void;
}) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const dismissedRef = useRef(false);

  const colors = TOAST_COLORS[toast.type];
  const Icon = TOAST_ICONS[toast.type];

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    translateY.value = withTiming(-100, { duration: 250, easing: Easing.in(Easing.ease) });
    opacity.value = withTiming(0, { duration: 250 }, () => {
      runOnJS(onDismiss)(toast.id);
    });
  }, [toast.id, onDismiss]);

  // Enter animation
  React.useEffect(() => {
    translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
    opacity.value = withTiming(1, { duration: 300 });

    // Schedule auto-dismiss
    opacity.value = withDelay(
      AUTO_DISMISS_MS,
      withTiming(0, { duration: 250 }, () => {
        if (!dismissedRef.current) {
          dismissedRef.current = true;
          runOnJS(onDismiss)(toast.id);
        }
      })
    );
    translateY.value = withDelay(
      AUTO_DISMISS_MS,
      withTiming(-100, { duration: 250, easing: Easing.in(Easing.ease) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 12,
          marginBottom: 8,
          marginHorizontal: 16,
          paddingVertical: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          // Shadow
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        },
      ]}
    >
      <Icon size={20} color={colors.icon} />
      <Text
        variant="label"
        weight="medium"
        className="flex-1 ml-3"
        numberOfLines={3}
      >
        {toast.message}
      </Text>
      <Pressable
        onPress={dismiss}
        hitSlop={8}
        accessibilityLabel="Dismiss notification"
        accessibilityRole="button"
      >
        <X size={16} color="#94A3B8" />
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idCounter = useRef(0);

  const show = useCallback((message: string, type: ToastType = "info") => {
    const id = ++idCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const handleDismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* Toast container - positioned at top of screen */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 0,
          right: 0,
          zIndex: 9999,
          pointerEvents: "box-none",
        }}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={handleDismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
