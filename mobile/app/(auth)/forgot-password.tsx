import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Mail, ArrowLeft, Check, Lock, Send } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { lightHaptic, mediumHaptic, successHaptic, errorHaptic } from "../../lib/haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
  FadeInDown,
  FadeIn as ReanimatedFadeIn,
  FadeInUp,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { Text } from "../../components/atoms/Text";
import { Input } from "../../components/atoms/Input";
import { forgotPasswordApi } from "../../features/auth/api";
import { COLORS } from "../../lib/constants";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Animation values
  const heroOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(30);
  const buttonScale = useSharedValue(1);

  // Lock icon animation
  const lockShake = useSharedValue(0);

  // Success animation
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const ringProgress = useSharedValue(0);
  const successBounce = useSharedValue(0);

  useEffect(() => {
    heroOpacity.value = withTiming(1, { duration: 600 });
    formOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    formTranslateY.value = withDelay(
      300,
      withSpring(0, { damping: 18, stiffness: 100 })
    );
  }, []);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
  }));

  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const lockStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          lockShake.value,
          [0, 0.25, 0.5, 0.75, 1],
          [0, -8, 8, -4, 0]
        ),
      },
    ],
  }));

  const checkContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: checkScale.value },
      { translateY: successBounce.value },
    ],
    opacity: checkOpacity.value,
  }));

  const triggerShake = () => {
    lockShake.value = 0;
    lockShake.value = withTiming(1, { duration: 400, easing: Easing.linear });
  };

  const triggerSuccessAnimation = () => {
    // Scale in the checkmark circle
    checkOpacity.value = withTiming(1, { duration: 200 });
    checkScale.value = withSpring(1, { damping: 12, stiffness: 150 });
    ringProgress.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    // Subtle bounce
    successBounce.value = withDelay(
      400,
      withSequence(
        withTiming(-8, { duration: 200 }),
        withSpring(0, { damping: 10, stiffness: 200 })
      )
    );
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      triggerShake();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      triggerShake();
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await forgotPasswordApi(email.trim());
      successHaptic();
      setSuccess(true);
      triggerSuccessAnimation();
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to send reset link. Please try again.";
      setError(typeof message === "string" ? message : "Something went wrong.");
      triggerShake();
      errorHaptic();
    } finally {
      setLoading(false);
    }
  };

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
        {/* Hero Section - Compact */}
        <Animated.View style={heroStyle}>
          <View
            style={{ paddingTop: insets.top + 16, paddingBottom: 44 }}
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

            {/* Decorative circle */}
            <View
              style={{
                position: "absolute",
                top: -40,
                right: -30,
                width: 120,
                height: 120,
                borderRadius: 60,
                borderWidth: 1,
                borderColor: COLORS.gold,
                opacity: 0.06,
              }}
            />

            <View className="px-6 pt-4 items-center">
              {/* Back button */}
              <View className="w-full mb-6">
                <Pressable
                  onPress={() => router.back()}
                  className="flex-row items-center"
                  accessibilityRole="link"
                  accessibilityLabel="Back to login"
                  hitSlop={12}
                >
                  <ArrowLeft size={20} color="#94A3B8" />
                  <Text
                    variant="label"
                    weight="medium"
                    className="ml-1.5"
                    style={{ color: "#94A3B8" }}
                  >
                    Back
                  </Text>
                </Pressable>
              </View>

              {/* Lock icon */}
              <Animated.View
                style={lockStyle}
                className="mb-4"
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: COLORS.gold + "15",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1.5,
                    borderColor: COLORS.gold + "30",
                  }}
                >
                  <Lock size={28} color={COLORS.gold} />
                </View>
              </Animated.View>

              <Text
                variant="title"
                weight="bold"
                className="text-white text-center"
                style={{ fontSize: 24 }}
              >
                Reset Password
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Form Card */}
        <Animated.View
          style={[
            formStyle,
            {
              marginTop: -20,
              flex: 1,
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 6,
            },
          ]}
          className="px-6 pt-8 pb-6"
        >
          {success ? (
            /* Success State */
            <Animated.View
              entering={ReanimatedFadeIn.duration(300)}
              className="items-center pt-6"
            >
              <Animated.View
                style={checkContainerStyle}
                className="mb-6"
              >
                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 44,
                    backgroundColor: "#22C55E10",
                    borderWidth: 3,
                    borderColor: COLORS.success,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: COLORS.success,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={28} color="#FFFFFF" strokeWidth={3} />
                  </View>
                </View>
              </Animated.View>

              <Animated.View
                entering={FadeInUp.duration(400).delay(300).springify().damping(18)}
              >
                <Text
                  variant="title"
                  weight="bold"
                  className="text-center mb-2"
                  style={{ fontSize: 24 }}
                >
                  Check your email
                </Text>
              </Animated.View>

              <Animated.View
                entering={FadeInUp.duration(400).delay(450).springify().damping(18)}
              >
                <Text
                  variant="body"
                  className="text-muted-foreground text-center mb-2 px-4"
                >
                  We sent a password reset link to
                </Text>
                <Text
                  variant="body"
                  weight="bold"
                  className="text-center mb-8"
                  style={{ color: COLORS.gold }}
                >
                  {email}
                </Text>
              </Animated.View>

              <Animated.View
                entering={FadeInUp.duration(400).delay(600).springify().damping(18)}
                className="w-full"
              >
                <Pressable
                  onPress={() => {
                    lightHaptic();
                    router.replace("/(auth)/login");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Return to login"
                  style={{
                    borderWidth: 1.5,
                    borderColor: COLORS.border,
                    borderRadius: 16,
                    paddingVertical: 15,
                    alignItems: "center",
                  }}
                >
                  <Text variant="body" weight="semibold">
                    Return to Login
                  </Text>
                </Pressable>
              </Animated.View>

              <Animated.View
                entering={FadeInUp.duration(400).delay(750).springify().damping(18)}
                className="mt-4"
              >
                <Text
                  variant="caption"
                  className="text-muted-foreground text-center"
                >
                  Didn't receive the email? Check your spam folder.
                </Text>
              </Animated.View>
            </Animated.View>
          ) : (
            /* Form State */
            <>
              <Animated.View
                entering={FadeInDown.duration(400).delay(400).springify().damping(18)}
              >
                <Text
                  variant="title"
                  weight="bold"
                  className="mb-1"
                  style={{ fontSize: 24 }}
                >
                  Forgot password?
                </Text>
                <Text variant="body" className="text-muted-foreground mb-8">
                  Enter your email and we'll send you a link to reset your
                  password.
                </Text>
              </Animated.View>

              <Animated.View
                entering={FadeInDown.duration(400).delay(500).springify().damping(18)}
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
                  containerClassName="mb-2"
                  error={error ?? undefined}
                />
              </Animated.View>

              <View className="h-4" />

              <Animated.View
                entering={FadeInDown.duration(400).delay(600).springify().damping(18)}
                style={buttonAnimStyle}
              >
                <AnimatedPressable
                  onPressIn={() => {
                    buttonScale.value = withSpring(0.96, {
                      damping: 15,
                      stiffness: 400,
                    });
                  }}
                  onPressOut={() => {
                    buttonScale.value = withSpring(1, {
                      damping: 15,
                      stiffness: 400,
                    });
                  }}
                  onPress={() => {
                    mediumHaptic();
                    handleSubmit();
                  }}
                  disabled={loading || !email.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Send reset link"
                  style={{
                    opacity: loading || !email.trim() ? 0.5 : 1,
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
                      <Text
                        variant="subtitle"
                        weight="bold"
                        className="text-[#0B1120]"
                      >
                        Sending...
                      </Text>
                    ) : (
                      <>
                        <Send
                          size={18}
                          color="#0B1120"
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          variant="subtitle"
                          weight="bold"
                          className="text-[#0B1120]"
                        >
                          Send Reset Link
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </AnimatedPressable>
              </Animated.View>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
