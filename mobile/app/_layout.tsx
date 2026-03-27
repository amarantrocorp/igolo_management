import "../global.css";
import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, View, Platform, Dimensions } from "react-native";
import { Slot, useRouter, useSegments, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import axios from "axios";
import { useAuthStore } from "../features/auth/store";
import { useOnlineManager } from "../lib/network-status";
import { useDraftLeadStore } from "../features/leads/draft-store";
import { OfflineBanner } from "../components/molecules/OfflineBanner";
import { usePushNotifications } from "../features/push/hooks";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ToastProvider } from "../components/molecules/Toast";
import { COLORS, API_URL } from "../lib/constants";
import { queryClient } from "../lib/query-client";
import { Text } from "../components/atoms/Text";
import {
  getRefreshToken,
  setToken,
  setRefreshToken,
  clearTokens,
} from "../lib/storage";

// Global handler for unhandled promise rejections
if (Platform.OS !== "web") {
  const originalHandler = (global as any).ErrorUtils?.getGlobalHandler?.();

  (global as any).ErrorUtils?.setGlobalHandler?.(
    (error: Error, isFatal: boolean) => {
      console.error(
        `[GlobalError] ${isFatal ? "FATAL" : "NON-FATAL"}:`,
        error?.message,
        error?.stack
      );
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    }
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ---------- Animated Letter (extracted to avoid Rules of Hooks violation) ----------
function AnimatedLetter({ char, sharedValue }: { char: string; sharedValue: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: sharedValue.value,
    transform: [
      {
        translateY: interpolate(
          sharedValue.value,
          [0, 1],
          [12, 0]
        ),
      },
    ],
  }));

  return (
    <Animated.Text
      style={[
        style,
        {
          fontSize: 48,
          fontWeight: "800",
          color: COLORS.gold,
          letterSpacing: 2,
        },
      ]}
    >
      {char}
    </Animated.Text>
  );
}

// ---------- Animated Splash Screen ----------
function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  // Letter-by-letter typewriter for "Igolo"
  const letter1 = useSharedValue(0);
  const letter2 = useSharedValue(0);
  const letter3 = useSharedValue(0);
  const letter4 = useSharedValue(0);
  const letter5 = useSharedValue(0);

  // "Interior" text
  const interiorOpacity = useSharedValue(0);
  const interiorTranslateY = useSharedValue(10);

  // Gold underline
  const lineWidth = useSharedValue(0);

  // Overall fade out
  const containerOpacity = useSharedValue(1);

  // Decorative ring
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);

  const letters = [letter1, letter2, letter3, letter4, letter5];
  const IGOLO = ["I", "g", "o", "l", "o"];

  useEffect(() => {
    const LETTER_DELAY = 120;
    const BASE_DELAY = 300;

    // Decorative ring appears
    ringOpacity.value = withDelay(
      100,
      withTiming(0.08, { duration: 600 })
    );
    ringScale.value = withDelay(
      100,
      withSpring(1, { damping: 20, stiffness: 80 })
    );

    // Typewriter: each letter fades in sequentially
    letters.forEach((letter, i) => {
      letter.value = withDelay(
        BASE_DELAY + i * LETTER_DELAY,
        withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })
      );
    });

    // "Interior" appears after last letter
    const afterLetters = BASE_DELAY + IGOLO.length * LETTER_DELAY + 100;
    interiorOpacity.value = withDelay(
      afterLetters,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    interiorTranslateY.value = withDelay(
      afterLetters,
      withSpring(0, { damping: 15, stiffness: 120 })
    );

    // Gold line draws underneath
    lineWidth.value = withDelay(
      afterLetters + 200,
      withSpring(120, { damping: 15, stiffness: 100 })
    );

    // Cross-fade out after a pause
    const totalDuration = afterLetters + 1000;
    containerOpacity.value = withDelay(
      totalDuration,
      withTiming(0, { duration: 350, easing: Easing.in(Easing.cubic) })
    );

    // Signal completion
    const timeout = setTimeout(() => {
      onFinish();
    }, totalDuration + 400);

    return () => clearTimeout(timeout);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const interiorStyle = useAnimatedStyle(() => ({
    opacity: interiorOpacity.value,
    transform: [{ translateY: interiorTranslateY.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    width: lineWidth.value,
    height: 3,
    backgroundColor: COLORS.gold,
    borderRadius: 2,
    marginTop: 12,
  }));

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100,
        },
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={["#0B1120", "#0F1729", "#0B1120"]}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Decorative ring */}
        <Animated.View
          style={[
            ringStyle,
            {
              position: "absolute",
              width: 280,
              height: 280,
              borderRadius: 140,
              borderWidth: 1.5,
              borderColor: COLORS.gold,
            },
          ]}
        />

        {/* Logo text */}
        <View style={{ alignItems: "center" }}>
          {/* "Igolo" with typewriter effect */}
          <View style={{ flexDirection: "row" }}>
            {IGOLO.map((char, i) => (
              <AnimatedLetter key={i} char={char} sharedValue={letters[i]} />
            ))}
          </View>

          {/* "Interior" */}
          <Animated.Text
            style={[
              interiorStyle,
              {
                fontSize: 18,
                fontWeight: "500",
                color: "#94A3B8",
                letterSpacing: 8,
                textTransform: "uppercase",
                marginTop: 4,
              },
            ]}
          >
            Interior
          </Animated.Text>

          {/* Gold underline */}
          <Animated.View style={lineStyle} />
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ---------- Helper Components ----------
function OfflineSync() {
  useOnlineManager();

  const hydrateDrafts = useDraftLeadStore((s) => s.hydrate);
  useEffect(() => {
    hydrateDrafts();
  }, []);

  return null;
}

function PushNotificationManager() {
  usePushNotifications();
  return null;
}

// ---------------------------------------------------------------------------
// JWT expiry helper (Fix #2): decode the `exp` claim without a library
// ---------------------------------------------------------------------------
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    // Base64url decode the payload
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(payload));
    if (!decoded.exp) return false; // no exp claim — treat as valid
    // exp is in seconds; Date.now() is in ms
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true; // can't parse — treat as expired
  }
}

// ---------------------------------------------------------------------------
// Foreground token freshness check (Fix #2)
// ---------------------------------------------------------------------------
function useTokenFreshnessOnForeground() {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextState: AppStateStatus) => {
        // Only act when moving from background/inactive -> active
        if (
          appState.current.match(/inactive|background/) &&
          nextState === "active"
        ) {
          const { token, refreshToken, logout } = useAuthStore.getState();

          if (token && isTokenExpired(token)) {
            // Token is expired — try to refresh
            if (refreshToken) {
              try {
                const { data } = await axios.post<{
                  access_token: string;
                  refresh_token: string;
                }>(`${API_URL}/auth/refresh`, {
                  refresh_token: refreshToken,
                });

                await Promise.all([
                  setToken(data.access_token),
                  setRefreshToken(data.refresh_token),
                ]);

                useAuthStore.setState({
                  token: data.access_token,
                  refreshToken: data.refresh_token,
                });
              } catch {
                // Refresh failed — force re-login
                await clearTokens();
                logout();
              }
            } else {
              // No refresh token — force re-login
              await clearTokens();
              logout();
            }
          }
        }
        appState.current = nextState;
      }
    );

    return () => subscription.remove();
  }, []);
}

// ---------------------------------------------------------------------------
// Deep-link intended route store (Fix #7)
// ---------------------------------------------------------------------------
let pendingDeepLink: string | null = null;

export function setPendingDeepLink(path: string) {
  pendingDeepLink = path;
}

export function consumePendingDeepLink(): string | null {
  const path = pendingDeepLink;
  pendingDeepLink = null;
  return path;
}

function AuthGate() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const isAuthenticated = !!token && !!user;

  // Check token freshness whenever app returns to foreground (Fix #2)
  useTokenFreshnessOnForeground();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      // Save the current deep-link path so we can restore it after login (Fix #7)
      if (pathname && pathname !== "/" && pathname !== "/(auth)/login") {
        setPendingDeepLink(pathname);
      }
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      // After login, redirect to the saved deep link if one exists (Fix #7)
      const savedPath = consumePendingDeepLink();
      if (savedPath) {
        router.replace(savedPath as any);
      } else {
        router.replace("/");
      }
    }
  }, [isHydrated, token, user, segments]);

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      {isAuthenticated && <PushNotificationManager />}
      <Slot />
    </View>
  );
}

// ---------- Root Layout ----------
export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <StatusBar style={splashDone ? "auto" : "light"} />
              <OfflineSync />
              <AuthGate />
              {!splashDone && (
                <AnimatedSplash onFinish={() => setSplashDone(true)} />
              )}
            </ToastProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
