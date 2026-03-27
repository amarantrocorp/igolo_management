import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Fingerprint,
  ScanFace,
  ArrowRight,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { lightHaptic, mediumHaptic } from "../../lib/haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  withRepeat,
  cancelAnimation,
  Easing,
  FadeInDown,
  FadeIn as ReanimatedFadeIn,
  interpolate,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { Text } from "../../components/atoms/Text";
import { Input } from "../../components/atoms/Input";
import { useAuthStore } from "../../features/auth/store";
import { loginApi, getMe } from "../../features/auth/api";
import { COLORS } from "../../lib/constants";
import {
  isBiometricAvailable,
  isBiometricEnabled,
  getBiometricEmail,
  getBiometricLabel,
  authenticateWithBiometric,
  enableBiometric,
  disableBiometric,
  getBiometricType,
} from "../../lib/biometric";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const login = useAuthStore((s) => s.login);

  const [workspace, setWorkspace] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometrics");
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [biometricLoading, setBiometricLoading] = useState(false);

  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(20);
  const accentWidth = useSharedValue(0);
  const formTranslateY = useSharedValue(40);
  const formOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const bioPulse = useSharedValue(1);

  // Decorative element animations
  const decorOpacity = useSharedValue(0);

  useEffect(() => {
    // Staggered entrance animation
    logoOpacity.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
    logoTranslateY.value = withTiming(0, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
    accentWidth.value = withDelay(
      400,
      withSpring(100, { damping: 15, stiffness: 120 })
    );
    decorOpacity.value = withDelay(
      200,
      withTiming(0.06, { duration: 1000 })
    );
    formOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    formTranslateY.value = withDelay(
      500,
      withSpring(0, { damping: 18, stiffness: 100 })
    );
    // Subtle biometric pulse
    bioPulse.value = withDelay(
      1200,
      withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    return () => {
      cancelAnimation(bioPulse);
    };
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }],
  }));

  const accentStyle = useAnimatedStyle(() => ({
    width: accentWidth.value,
    height: 3,
    backgroundColor: COLORS.gold,
    borderRadius: 2,
    marginTop: 10,
  }));

  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const bioStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bioPulse.value }],
  }));

  const decorStyle = useAnimatedStyle(() => ({
    opacity: decorOpacity.value,
  }));

  // Check biometric availability on mount
  useEffect(() => {
    (async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);

      if (available) {
        const label = await getBiometricLabel();
        const type = await getBiometricType();
        setBiometricLabel(label);
        setBiometricType(type);

        const enabled = await isBiometricEnabled();
        setBiometricEnabled(enabled);

        if (enabled) {
          handleBiometricLogin();
        }
      }
    })();
  }, []);

  const handleBiometricLogin = useCallback(async () => {
    setBiometricLoading(true);
    setError(null);

    try {
      const success = await authenticateWithBiometric();
      if (!success) {
        setBiometricLoading(false);
        return;
      }

      const storedEmail = await getBiometricEmail();
      if (!storedEmail) {
        setError("No saved credentials. Please sign in with your password.");
        setBiometricLoading(false);
        return;
      }

      const hydrate = useAuthStore.getState().hydrate;
      await hydrate();

      const token = useAuthStore.getState().token;
      const user = useAuthStore.getState().user;

      if (token && user) {
        // Validate the token is still accepted by the server (Fix #8).
        // If the user changed their password on the web, the old token
        // may have been revoked even though it hasn't expired yet.
        try {
          const { getMe } = await import("../../features/auth/api");
          const me = await getMe();
          // Block platform admins from biometric login too
          if (me.is_platform_admin) {
            await disableBiometric();
            setBiometricEnabled(false);
            useAuthStore.getState().logout();
            setError("Platform administrators cannot use the mobile app. Please use the web dashboard.");
            setBiometricLoading(false);
            return;
          }
          router.replace("/");
        } catch (validationErr: any) {
          const status = validationErr?.response?.status;
          if (status === 401) {
            // Token rejected — password was likely changed. Clear biometric
            // prefs so the user isn't stuck in a loop.
            await disableBiometric();
            setBiometricEnabled(false);
            useAuthStore.getState().logout();
            setError(
              "Your session is no longer valid. Please sign in with your password."
            );
          } else {
            // Non-auth error (network, 500, etc.) — still let them in since
            // we have a locally-valid token; the refresh interceptor will
            // handle it on subsequent calls.
            router.replace("/");
          }
        }
      } else {
        setError("Session expired. Please sign in with your password.");
      }
    } catch {
      setError("Biometric authentication failed. Please use your password.");
    } finally {
      setBiometricLoading(false);
    }
  }, [router]);

  const offerBiometricSetup = useCallback(
    async (userEmail: string) => {
      const available = await isBiometricAvailable();
      if (!available) return;

      const alreadyEnabled = await isBiometricEnabled();
      if (alreadyEnabled) return;

      const label = await getBiometricLabel();

      Alert.alert(
        `Enable ${label}?`,
        `Sign in faster next time using ${label}.`,
        [
          { text: "Not Now", style: "cancel" },
          {
            text: "Enable",
            onPress: async () => {
              await enableBiometric(userEmail);
              setBiometricEnabled(true);
            },
          },
        ]
      );
    },
    []
  );

  const handleLogin = async () => {
    if (!workspace.trim()) {
      setError("Please enter your workspace name.");
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const loginRes = await loginApi(
        email.trim(),
        password,
        workspace.trim().toLowerCase()
      );

      if (loginRes.requires_org_selection && loginRes.organizations) {
        const { setToken } = await import("../../lib/storage");
        await setToken(loginRes.access_token);

        useAuthStore.setState({
          token: loginRes.access_token,
          organizations: loginRes.organizations.map((org) => ({
            id: org.id,
            org_id: org.id,
            org_name: org.name,
            org_slug: org.slug,
            role: org.role,
            is_default: false,
          })),
        });

        router.replace("/(auth)/org-selector");
        return;
      }

      const { setToken } = await import("../../lib/storage");
      await setToken(loginRes.access_token);

      const me = await getMe();

      // Block platform admins — they should use the web dashboard
      if (me.is_platform_admin) {
        const { clearTokens } = await import("../../lib/storage");
        await clearTokens();
        setError(
          "Platform administrators cannot access the mobile app. Please use the web dashboard at igolohomes.com to manage tenants."
        );
        return;
      }

      await login(
        loginRes.access_token,
        loginRes.refresh_token ?? null,
        me,
        me.active_org_id,
        me.role_in_org,
        me.organizations
      );

      // Ensure the workspace slug from login is persisted for X-Tenant-ID header
      if (workspace.trim()) {
        const { setActiveOrgSlug } = await import("../../lib/storage");
        await setActiveOrgSlug(workspace.trim().toLowerCase());
        useAuthStore.setState({ activeOrgSlug: workspace.trim().toLowerCase() });
      }

      await offerBiometricSetup(email.trim());

      router.replace("/");
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Login failed. Please check your credentials.";
      setError(typeof message === "string" ? message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handleButtonPress = () => {
    mediumHaptic();
    handleLogin();
  };

  const BiometricIcon = biometricType === "face" ? ScanFace : Fingerprint;
  const isDisabled = loading || !email.trim() || !password.trim();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        className="bg-white"
      >
        {/* Hero Section - Top 40% */}
        <View
          style={{ paddingTop: insets.top + 24, paddingBottom: 50 }}
          className="relative overflow-hidden"
        >
          <LinearGradient
            colors={["#0B1120", "#131D35", "#0B1120"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />

          {/* Decorative circles */}
          <Animated.View
            style={[
              decorStyle,
              {
                position: "absolute",
                top: -60,
                right: -40,
                width: 200,
                height: 200,
                borderRadius: 100,
                borderWidth: 1.5,
                borderColor: COLORS.gold,
              },
            ]}
          />
          <Animated.View
            style={[
              decorStyle,
              {
                position: "absolute",
                bottom: 20,
                left: -50,
                width: 140,
                height: 140,
                borderRadius: 70,
                borderWidth: 1,
                borderColor: COLORS.gold,
              },
            ]}
          />

          {/* Logo */}
          <Animated.View
            style={logoStyle}
            className="items-center px-6 pt-8"
          >
            <View className="flex-row items-baseline mb-1">
              <Text
                variant="title"
                weight="bold"
                className="text-[#CBB282]"
                style={{ fontSize: 38, lineHeight: 46 }}
              >
                Igolo
              </Text>
              <Text
                variant="title"
                weight="bold"
                className="text-white ml-3"
                style={{ fontSize: 38, lineHeight: 46 }}
              >
                Interior
              </Text>
            </View>
            <Animated.View style={accentStyle} />
            <Text
              variant="body"
              className="mt-4"
              style={{ color: "#94A3B8" }}
            >
              Design. Build. Deliver.
            </Text>
          </Animated.View>
        </View>

        {/* Form Card - overlaps hero */}
        <Animated.View
          style={[
            formStyle,
            {
              marginTop: -24,
              flex: 1,
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 8,
            },
          ]}
          className="px-6 pt-8 pb-6"
        >
          {/* Welcome text */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(600).springify().damping(18)}
          >
            <Text
              variant="title"
              weight="bold"
              style={{ fontSize: 26, lineHeight: 32 }}
              className="mb-1"
            >
              Welcome back
            </Text>
            <Text variant="body" className="text-muted-foreground mb-7">
              Sign in to your account
            </Text>
          </Animated.View>

          {/* Workspace Input */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(650).springify().damping(18)}
          >
            <Input
              label="Workspace"
              placeholder="e.g. plyman, acme-design"
              value={workspace}
              onChangeText={(text) => {
                setWorkspace(text.replace(/[^a-z0-9\-]/g, ""));
                if (error) setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={
                <View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: COLORS.gold, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>W</Text>
                </View>
              }
              containerClassName="mb-4"
            />
          </Animated.View>

          {/* Email Input */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(750).springify().damping(18)}
          >
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              leftIcon={<Mail size={18} color={COLORS.mutedForeground} />}
              containerClassName="mb-4"
            />
          </Animated.View>

          {/* Password Input */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(800).springify().damping(18)}
          >
            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError(null);
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              leftIcon={<Lock size={18} color={COLORS.mutedForeground} />}
              rightIcon={
                showPassword ? (
                  <EyeOff size={18} color={COLORS.mutedForeground} />
                ) : (
                  <Eye size={18} color={COLORS.mutedForeground} />
                )
              }
              onRightIconPress={() => setShowPassword(!showPassword)}
              containerClassName="mb-2"
            />
          </Animated.View>

          {/* Forgot Password link */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(900).springify().damping(18)}
            className="self-end mb-6"
          >
            <Pressable
              onPress={() => router.push("/(auth)/forgot-password")}
              accessibilityRole="link"
              accessibilityLabel="Forgot password"
              hitSlop={8}
            >
              <Text
                variant="label"
                weight="semibold"
                style={{ color: COLORS.gold }}
              >
                Forgot Password?
              </Text>
            </Pressable>
          </Animated.View>

          {/* Error message */}
          {error && (
            <Animated.View
              entering={FadeInDown.duration(300).springify()}
              className="bg-red-50 border border-red-200 rounded-2xl p-3.5 mb-4"
            >
              <Text variant="label" className="text-destructive text-center">
                {error}
              </Text>
            </Animated.View>
          )}

          {/* Sign In Button */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(1000).springify().damping(18)}
            style={buttonAnimStyle}
          >
            <AnimatedPressable
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              onPress={handleButtonPress}
              disabled={isDisabled}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: isDisabled, busy: loading }}
              style={{
                opacity: isDisabled ? 0.5 : 1,
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={["#CBB282", "#B89B6A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 17,
                  paddingHorizontal: 24,
                  borderRadius: 16,
                }}
              >
                {loading ? (
                  <Animated.View
                    entering={ReanimatedFadeIn.duration(200)}
                    className="flex-row items-center"
                  >
                    <View
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      style={{
                        // Spinner rotation handled by RN's own animation
                      }}
                    />
                    <Text
                      variant="subtitle"
                      weight="bold"
                      className="text-[#0B1120] ml-3"
                    >
                      Signing In...
                    </Text>
                  </Animated.View>
                ) : (
                  <>
                    <Text
                      variant="subtitle"
                      weight="bold"
                      className="text-[#0B1120]"
                    >
                      Sign In
                    </Text>
                    <ArrowRight
                      size={20}
                      color="#0B1120"
                      style={{ marginLeft: 8 }}
                    />
                  </>
                )}
              </LinearGradient>
            </AnimatedPressable>
          </Animated.View>

          {/* Biometric login */}
          {biometricAvailable && biometricEnabled && (
            <Animated.View
              entering={FadeInDown.duration(400).delay(1100).springify().damping(18)}
              className="mt-6 items-center"
            >
              <View className="flex-row items-center mb-5">
                <View className="flex-1 h-px bg-border" />
                <Text
                  variant="caption"
                  className="text-muted-foreground mx-4"
                  weight="medium"
                >
                  or sign in with
                </Text>
                <View className="flex-1 h-px bg-border" />
              </View>

              <Animated.View style={bioStyle}>
                <Pressable
                  onPress={() => {
                    lightHaptic();
                    handleBiometricLogin();
                  }}
                  disabled={biometricLoading}
                  accessibilityRole="button"
                  accessibilityLabel={`Sign in with ${biometricLabel}`}
                  style={({ pressed }) => ({
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: pressed ? "#F1F5F9" : "#F8FAFC",
                    borderWidth: 2,
                    borderColor: COLORS.gold + "40",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: COLORS.gold,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 3,
                  })}
                >
                  <BiometricIcon
                    size={30}
                    color={biometricLoading ? COLORS.mutedForeground : COLORS.gold}
                  />
                </Pressable>
              </Animated.View>

              <Text
                variant="caption"
                className="text-muted-foreground mt-2"
                weight="medium"
              >
                {biometricLoading ? "Verifying..." : biometricLabel}
              </Text>
            </Animated.View>
          )}

          {/* Client portal info */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(1200).springify().damping(18)}
            className="mt-8 items-center"
          >
            <Text variant="caption" className="text-muted-foreground text-center">
              Clients can sign in with the credentials provided by their designer.
            </Text>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
