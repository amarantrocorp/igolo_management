import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
  FadeInDown,
  FadeIn as ReanimatedFadeIn,
  interpolate,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  CreditCard,
  CheckCircle2,
  ChevronDown,
  Wallet,
  IndianRupee,
  ArrowLeft,
  Sparkles,
} from "lucide-react-native";
import { TextInput } from "react-native";
import { Text, Button, Card, Input } from "../../../components/atoms";
import { AnimatedNumber } from "../../../components/animations/AnimatedNumber";
import { formatINR } from "../../../lib/format";
import { COLORS } from "../../../lib/constants";
import { useToast } from "../../../components/molecules/Toast";
import { useProjects } from "../../projects/hooks";
import { useProjectTransactions } from "../../projects/hooks";
import { useCreateOrder, useVerifyPayment } from "../hooks";
import { PaymentHistory } from "./PaymentHistory";
import type { Project } from "../../../types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// -- Payment milestones --

const MILESTONES = [
  { label: "Advance", percent: 20, description: "Project kickoff" },
  { label: "Carpentry", percent: 30, description: "Before woodwork begins" },
  { label: "Finishing", percent: 40, description: "Painting & fixtures" },
  { label: "Handover", percent: 10, description: "Final settlement" },
];

// -- Razorpay WebView HTML generator --

function buildRazorpayHTML(
  keyId: string,
  orderId: string,
  amountPaise: number,
  currency: string,
  projectName: string,
  userEmail?: string,
  userName?: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #F8FAFC;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .loading {
      text-align: center;
      color: #64748B;
      font-size: 16px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #E2E8F0;
      border-top-color: #CBB282;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    Opening payment gateway...
  </div>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    var options = {
      key: "${keyId}",
      amount: ${amountPaise},
      currency: "${currency}",
      order_id: "${orderId}",
      name: "Igolo Interior",
      description: "Payment for ${projectName.replace(/"/g, '\\"')}",
      prefill: {
        email: "${(userEmail || "").replace(/"/g, '\\"')}",
        name: "${(userName || "").replace(/"/g, '\\"')}"
      },
      theme: { color: "#CBB282" },
      handler: function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          success: true,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        }));
      },
      modal: {
        ondismiss: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ dismissed: true }));
        }
      }
    };
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function(response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        error: true,
        code: response.error.code,
        description: response.error.description,
        reason: response.error.reason
      }));
    });
    rzp.open();
  </script>
</body>
</html>`;
}

// -- Sub-components --

function ProjectPicker({
  projects,
  selectedId,
  onSelect,
}: {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = projects.find((p) => p.id === selectedId);

  if (projects.length <= 1) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(100)}
      style={styles.pickerWrap}
    >
      <Text style={styles.pickerLabel}>Select Project</Text>
      <Pressable
        onPress={() => setOpen(!open)}
        style={[styles.pickerBtn, open && { borderColor: COLORS.gold }]}
      >
        <Text style={styles.pickerBtnText}>
          {selected
            ? `Project #${selected.id.slice(0, 8)}`
            : "Choose a project"}
        </Text>
        <ChevronDown size={20} color={COLORS.mutedForeground} />
      </Pressable>
      {open && (
        <View style={styles.pickerDropdown}>
          {projects.map((project) => (
            <Pressable
              key={project.id}
              onPress={() => {
                onSelect(project.id);
                setOpen(false);
              }}
              style={[
                styles.pickerOption,
                project.id === selectedId && { backgroundColor: COLORS.gold + "12" },
              ]}
            >
              <Text style={[
                styles.pickerOptionText,
                project.id === selectedId && { fontWeight: "600", color: COLORS.gold },
              ]}>
                Project #{project.id.slice(0, 8)}
              </Text>
              <Text style={styles.pickerOptionSub}>
                {formatINR(project.total_project_value)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

function WalletSummary({ project }: { project: Project }) {
  const wallet = project.wallet;
  const totalValue = wallet?.total_agreed_value ?? project.total_project_value;
  const totalPaid = wallet?.total_received ?? 0;
  const remaining = totalValue - totalPaid;
  const paidPercent = totalValue > 0 ? (totalPaid / totalValue) * 100 : 0;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(150)}>
      <LinearGradient
        colors={[COLORS.primary, "#1a2744"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.walletGradient}
      >
        <View style={styles.walletHeader}>
          <Wallet size={18} color={COLORS.gold} strokeWidth={2} />
          <Text style={styles.walletTitle}>Wallet Summary</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.walletProgressTrack}>
          <Animated.View
            style={[
              styles.walletProgressFill,
              { width: `${Math.min(paidPercent, 100)}%` },
            ]}
          />
        </View>

        <View style={styles.walletRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.walletLabel}>Total Value</Text>
            <AnimatedNumber
              value={totalValue}
              prefix={"\u20B9"}
              duration={800}
              style={styles.walletValue}
            />
          </View>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.walletLabel}>Paid</Text>
            <AnimatedNumber
              value={totalPaid}
              prefix={"\u20B9"}
              duration={800}
              style={[styles.walletValue, { color: "#22C55E" }]}
            />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={styles.walletLabel}>Remaining</Text>
            <AnimatedNumber
              value={remaining}
              prefix={"\u20B9"}
              duration={800}
              style={[styles.walletValue, { color: "#EF4444" }]}
            />
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// -- Horizontal Milestone Stepper --

function MilestoneStepper({ project }: { project: Project }) {
  const totalValue = project.wallet?.total_agreed_value ?? project.total_project_value;
  const totalPaid = project.wallet?.total_received ?? 0;

  let cumulativePercent = 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(200)}
      style={styles.milestoneCard}
    >
      <Text style={styles.milestoneTitle}>Payment Milestones</Text>

      {/* Horizontal stepper */}
      <View style={styles.stepperRow}>
        {MILESTONES.map((milestone, index) => {
          cumulativePercent += milestone.percent;
          const cumulativeAmount = (totalValue * cumulativePercent) / 100;
          const isPaid = totalPaid >= cumulativeAmount;
          const isPartial = !isPaid && totalPaid >= cumulativeAmount - (totalValue * milestone.percent / 100);

          return (
            <React.Fragment key={milestone.label}>
              <Animated.View
                entering={FadeInDown.duration(300).delay(250 + index * 100)}
                style={styles.stepperItem}
              >
                {/* Circle */}
                <View
                  style={[
                    styles.stepperCircle,
                    isPaid
                      ? styles.stepperCirclePaid
                      : isPartial
                      ? styles.stepperCirclePartial
                      : styles.stepperCirclePending,
                  ]}
                >
                  {isPaid ? (
                    <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.5} />
                  ) : (
                    <Text style={[
                      styles.stepperNum,
                      isPaid && { color: "#FFFFFF" },
                    ]}>
                      {index + 1}
                    </Text>
                  )}
                </View>

                {/* Label */}
                <Text style={[
                  styles.stepperLabel,
                  isPaid && { color: "#22C55E" },
                ]}>
                  {milestone.label}
                </Text>
                <Text style={styles.stepperPercent}>{milestone.percent}%</Text>
              </Animated.View>

              {/* Connector line */}
              {index < MILESTONES.length - 1 && (
                <View
                  style={[
                    styles.stepperLine,
                    isPaid && { backgroundColor: "#22C55E" },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </Animated.View>
  );
}

// -- Animated Success Overlay --

function SuccessOverlay({
  visible,
  amount,
  transactionId,
  onDismiss,
}: {
  visible: boolean;
  amount: number;
  transactionId: string;
  onDismiss: () => void;
}) {
  const circleScale = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const confettiOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      circleScale.value = withSpring(1, { damping: 10, stiffness: 200 });
      checkScale.value = withDelay(
        300,
        withSequence(
          withSpring(1.3, { damping: 8, stiffness: 300 }),
          withSpring(1, { damping: 12, stiffness: 200 })
        )
      );
      confettiOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      circleScale.value = 0;
      checkScale.value = 0;
      confettiOpacity.value = 0;
    }
  }, [visible]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const confettiStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.successBackdrop}>
        <View style={styles.successCard}>
          {/* Confetti sparkles */}
          <Animated.View style={[styles.confettiWrap, confettiStyle]}>
            {[...Array(6)].map((_, i) => {
              const angle = (i * 60) * (Math.PI / 180);
              const dist = 50 + (i % 2) * 20;
              return (
                <View
                  key={i}
                  style={[
                    styles.confettiDot,
                    {
                      left: 50 + Math.cos(angle) * dist,
                      top: 50 + Math.sin(angle) * dist,
                      backgroundColor: i % 3 === 0 ? COLORS.gold : i % 3 === 1 ? "#22C55E" : "#60A5FA",
                      width: 6 + (i % 2) * 4,
                      height: 6 + (i % 2) * 4,
                    },
                  ]}
                />
              );
            })}
          </Animated.View>

          {/* Animated checkmark circle */}
          <Animated.View style={[styles.successCircleBg, circleStyle]}>
            <Animated.View style={checkStyle}>
              <CheckCircle2 size={56} color="#22C55E" strokeWidth={2} />
            </Animated.View>
          </Animated.View>

          <Text style={styles.successTitle}>Payment Successful</Text>

          <AnimatedNumber
            value={amount}
            prefix={"\u20B9"}
            duration={1000}
            style={styles.successAmount}
          />

          <Text style={styles.successRef}>
            Reference: #{transactionId.slice(0, 12)}
          </Text>

          <Pressable onPress={onDismiss} style={styles.successDoneBtn}>
            <LinearGradient
              colors={[COLORS.gold, "#B89D6A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.successDoneGradient}
            >
              <Text style={styles.successDoneText}>Done</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// -- Main PaymentScreen --

export function PaymentScreen() {
  const toast = useToast();
  const { data: projectPages, isLoading: projectsLoading, refetch } = useProjects();

  const projects = useMemo(() => {
    if (!projectPages?.pages) return [];
    return projectPages.pages.flatMap((page) => page.items);
  }, [projectPages]);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const activeProjectId = selectedProjectId ?? projects[0]?.id ?? null;
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  const { data: transactions = [], isLoading: txLoading } =
    useProjectTransactions(activeProjectId ?? undefined);

  const [amount, setAmount] = useState("");
  const [showWebView, setShowWebView] = useState(false);
  const [razorpayHTML, setRazorpayHTML] = useState("");
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    projectId: string;
    amount: number;
  } | null>(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);
  const [successTxId, setSuccessTxId] = useState("");

  const createOrder = useCreateOrder();
  const verifyPayment = useVerifyPayment();

  const parsedAmount = parseFloat(amount) || 0;
  const remaining = activeProject
    ? (activeProject.wallet?.total_agreed_value ?? activeProject.total_project_value) -
      (activeProject.wallet?.total_received ?? 0)
    : 0;

  const canPay = parsedAmount >= 1 && activeProject !== null;

  const quickAmounts = useMemo(() => {
    if (!activeProject) return [];
    const totalValue =
      activeProject.wallet?.total_agreed_value ?? activeProject.total_project_value;
    return MILESTONES.map((m) => ({
      label: m.label,
      percent: m.percent,
      value: Math.round((totalValue * m.percent) / 100),
    }));
  }, [activeProject]);

  // Pay button animation
  const payScale = useSharedValue(1);
  const payBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: payScale.value }],
  }));

  const handlePayNow = useCallback(async () => {
    if (!activeProject || parsedAmount < 1) return;

    payScale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 300 })
    );

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const order = await createOrder.mutateAsync({
        project_id: activeProject.id,
        amount: parsedAmount,
      });

      const html = buildRazorpayHTML(
        order.key_id,
        order.order_id,
        order.amount_paise,
        order.currency,
        `Project #${activeProject.id.slice(0, 8)}`
      );

      setPendingPaymentData({
        projectId: activeProject.id,
        amount: parsedAmount,
      });
      setRazorpayHTML(html);
      setShowWebView(true);
    } catch (err: any) {
      toast.show(
        err?.response?.data?.detail || err?.message || "Could not create payment order. Please try again.",
        "error"
      );
    }
  }, [activeProject, parsedAmount, createOrder]);

  const handleWebViewMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.dismissed) {
          setShowWebView(false);
          setPendingPaymentData(null);
          return;
        }

        if (data.error) {
          setShowWebView(false);
          setPendingPaymentData(null);
          toast.show(
            data.description || "Payment was not completed. Please try again.",
            "error"
          );
          return;
        }

        if (data.success && pendingPaymentData) {
          setShowWebView(false);

          const result = await verifyPayment.mutateAsync({
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
            project_id: pendingPaymentData.projectId,
            amount: pendingPaymentData.amount,
          });

          setSuccessAmount(pendingPaymentData.amount);
          setSuccessTxId(result.transaction_id);
          setShowSuccess(true);
          setAmount("");
          setPendingPaymentData(null);
        }
      } catch (err: any) {
        setShowWebView(false);
        setPendingPaymentData(null);
        toast.show(
          err?.response?.data?.detail || "Payment verification failed. If money was deducted, it will be refunded automatically.",
          "error"
        );
      }
    },
    [pendingPaymentData, verifyPayment]
  );

  const handleCloseWebView = useCallback(() => {
    Alert.alert("Cancel Payment?", "Are you sure you want to cancel this payment?", [
      { text: "Continue Payment", style: "cancel" },
      {
        text: "Cancel",
        style: "destructive",
        onPress: () => {
          setShowWebView(false);
          setPendingPaymentData(null);
        },
      },
    ]);
  }, []);

  // -- Loading state --

  if (projectsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text variant="body" style={{ color: COLORS.mutedForeground, marginTop: 12 }}>
          Loading projects...
        </Text>
      </View>
    );
  }

  if (projects.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Animated.View entering={ReanimatedFadeIn.duration(500)} style={{ alignItems: "center" }}>
          <View style={styles.emptyIcon}>
            <CreditCard size={36} color={COLORS.gold} />
          </View>
          <Text variant="subtitle" weight="semibold" style={{ marginTop: 16, textAlign: "center" }}>
            No Projects Found
          </Text>
          <Text variant="body" style={{ color: COLORS.mutedForeground, marginTop: 8, textAlign: "center" }}>
            You don't have any active projects to make payments for.
          </Text>
        </Animated.View>
      </View>
    );
  }

  // -- Render --

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => refetch()}
            tintColor={COLORS.gold}
          />
        }
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(50)}
          style={styles.headerRow}
        >
          <CreditCard size={22} color={COLORS.gold} strokeWidth={2} />
          <Text variant="title" weight="bold" style={{ marginLeft: 10 }}>
            Payments
          </Text>
        </Animated.View>

        {/* Project picker */}
        <ProjectPicker
          projects={projects}
          selectedId={activeProjectId}
          onSelect={setSelectedProjectId}
        />

        {activeProject && (
          <>
            {/* Wallet summary */}
            <WalletSummary project={activeProject} />

            {/* Milestone stepper */}
            <MilestoneStepper project={activeProject} />

            {/* Amount input */}
            <Animated.View
              entering={FadeInDown.duration(400).delay(300)}
              style={styles.paymentCard}
            >
              <Text style={styles.payCardTitle}>Make a Payment</Text>

              {/* Amount field with gold accent */}
              <View style={styles.amountField}>
                <IndianRupee size={22} color={COLORS.gold} strokeWidth={2} />
                <TextInput
                  style={styles.amountInput}
                  placeholder="Enter amount"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                />
              </View>

              {remaining > 0 && (
                <Text style={styles.remainingText}>
                  Remaining balance: {formatINR(remaining)}
                </Text>
              )}

              {/* Quick amount buttons */}
              <View style={styles.quickAmountsRow}>
                {quickAmounts.map((qa) => {
                  const isSelected = parsedAmount === qa.value;
                  return (
                    <Pressable
                      key={qa.label}
                      onPress={() => {
                        setAmount(String(qa.value));
                        if (Platform.OS !== "web") {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                      style={[
                        styles.quickAmountBtn,
                        isSelected && styles.quickAmountBtnSelected,
                      ]}
                    >
                      <Text style={[
                        styles.quickAmountValue,
                        isSelected && { color: COLORS.gold },
                      ]}>
                        {formatINR(qa.value)}
                      </Text>
                      <Text style={styles.quickAmountLabel}>
                        {qa.label} ({qa.percent}%)
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Pay button */}
              <AnimatedPressable
                onPress={handlePayNow}
                disabled={!canPay || createOrder.isPending}
                style={[
                  payBtnStyle,
                  { opacity: canPay ? 1 : 0.5, marginTop: 16 },
                ]}
              >
                <LinearGradient
                  colors={[COLORS.gold, "#B89D6A"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.payBtnGradient}
                >
                  {createOrder.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <CreditCard size={18} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.payBtnText}>
                        {parsedAmount > 0
                          ? `Pay ${formatINR(parsedAmount)}`
                          : "Pay Now"}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </AnimatedPressable>
            </Animated.View>

            {/* Payment history */}
            <Animated.View entering={FadeInDown.duration(400).delay(400)}>
              <Text variant="subtitle" weight="semibold" style={{ marginBottom: 12 }}>
                Payment History
              </Text>
              <PaymentHistory transactions={transactions} loading={txLoading} />
            </Animated.View>
          </>
        )}
      </ScrollView>

      {/* Razorpay WebView modal */}
      <Modal
        visible={showWebView}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseWebView}
      >
        <View style={styles.webviewContainer}>
          <View style={styles.webviewHeader}>
            <Pressable onPress={handleCloseWebView} hitSlop={12} style={{ marginRight: 12 }}>
              <ArrowLeft size={24} color={COLORS.primary} strokeWidth={2} />
            </Pressable>
            <Text variant="subtitle" weight="semibold" style={{ flex: 1 }}>
              Complete Payment
            </Text>
            {verifyPayment.isPending && (
              <ActivityIndicator size="small" color={COLORS.gold} />
            )}
          </View>

          <WebView
            source={{ html: razorpayHTML }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webviewLoading}>
                <ActivityIndicator size="large" color={COLORS.gold} />
                <Text variant="body" style={{ color: COLORS.mutedForeground, marginTop: 12 }}>
                  Loading payment gateway...
                </Text>
              </View>
            )}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>

      {/* Success overlay */}
      <SuccessOverlay
        visible={showSuccess}
        amount={successAmount}
        transactionId={successTxId}
        onDismiss={() => setShowSuccess(false)}
      />
    </View>
  );
}

// -- Styles --

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.gold + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  // Picker
  pickerWrap: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.mutedForeground,
    marginBottom: 6,
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerBtnText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  pickerDropdown: {
    marginTop: 4,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: "hidden",
  },
  pickerOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  pickerOptionSub: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  // Wallet
  walletGradient: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  walletHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  walletTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  walletProgressTrack: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    marginBottom: 14,
    overflow: "hidden",
  },
  walletProgressFill: {
    height: "100%",
    backgroundColor: COLORS.gold,
    borderRadius: 3,
  },
  walletRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  walletLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 2,
  },
  walletValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    padding: 0,
  },
  // Milestones
  milestoneCard: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  milestoneTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 14,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  stepperItem: {
    alignItems: "center",
    width: 56,
  },
  stepperCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  stepperCirclePaid: {
    backgroundColor: "#22C55E",
  },
  stepperCirclePartial: {
    backgroundColor: COLORS.warning,
  },
  stepperCirclePending: {
    backgroundColor: COLORS.muted,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  stepperNum: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.mutedForeground,
  },
  stepperLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
  stepperPercent: {
    fontSize: 9,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  stepperLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginTop: 14,
    marginHorizontal: -4,
  },
  // Payment Card
  paymentCard: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  payCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 14,
  },
  amountField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.gold + "30",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: COLORS.gold + "06",
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginLeft: 8,
    paddingVertical: 10,
  },
  remainingText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 8,
  },
  quickAmountsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },
  quickAmountBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  quickAmountBtnSelected: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.gold + "10",
  },
  quickAmountValue: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  quickAmountLabel: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  payBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  payBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // WebView
  webviewContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  webviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  webviewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  // Success Overlay
  successBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  successCard: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  confettiWrap: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    height: 120,
  },
  confettiDot: {
    position: "absolute",
    borderRadius: 10,
  },
  successCircleBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#22C55E12",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#22C55E",
    padding: 0,
    marginBottom: 4,
  },
  successRef: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginBottom: 24,
  },
  successDoneBtn: {
    width: "100%",
  },
  successDoneGradient: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  successDoneText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
