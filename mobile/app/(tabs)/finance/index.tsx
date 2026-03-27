import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  FadeInDown,
  FadeIn as ReanimatedFadeIn,
  interpolate,
} from "react-native-reanimated";
import { lightHaptic, mediumHaptic } from "../../../lib/haptics";
import { Plus, Wallet, ChevronDown, X } from "lucide-react-native";
import { useAuth } from "../../../features/auth/hooks";
import {
  useTransactions,
  useRecordTransaction,
  useVerifyTransaction,
  useFinanceProjects,
  useProjectWallet,
} from "../../../features/finance/hooks";
import TransactionCard from "../../../features/finance/components/TransactionCard";
import WalletCard from "../../../features/finance/components/WalletCard";
import RecordPaymentForm, {
  type PaymentFormValues,
} from "../../../features/finance/components/RecordPaymentForm";
import { Text } from "../../../components/atoms/Text";
import { COLORS } from "../../../lib/constants";
import RoleGate from "../../../components/RoleGate";
import type { Transaction, Project } from "../../../types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================
// Project Filter Picker
// ============================================================

function ProjectFilterPicker({
  projects,
  selectedId,
  onSelect,
}: {
  projects: Project[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    const all = [{ label: "All Projects", value: "" }];
    return all.concat(
      projects.map((p) => ({
        label: p.client?.lead?.name
          ? `${p.client.lead.name}`
          : `Project #${p.id.slice(0, 8)}`,
        value: p.id,
      }))
    );
  }, [projects]);

  const selectedLabel =
    options.find((o) => o.value === selectedId)?.label || "All Projects";

  return (
    <View style={pickerStyles.container}>
      <Pressable
        onPress={() => {
          setOpen(!open);
          lightHaptic();
        }}
        style={[
          pickerStyles.btn,
          open && { borderColor: COLORS.gold },
        ]}
      >
        <Text variant="body" weight="medium" style={{ color: COLORS.text }}>
          {selectedLabel}
        </Text>
        <ChevronDown size={16} color={COLORS.mutedForeground} />
      </Pressable>
      {open ? (
        <View style={pickerStyles.dropdown}>
          {options.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
              style={[
                pickerStyles.option,
                selectedId === opt.value && { backgroundColor: COLORS.gold + "15" },
              ]}
            >
              <Text
                variant="body"
                style={{
                  color: selectedId === opt.value ? COLORS.gold : COLORS.text,
                  fontWeight: selectedId === opt.value ? "600" : "400",
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    overflow: "hidden",
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});

// ============================================================
// Empty State
// ============================================================

function EmptyState() {
  return (
    <Animated.View
      entering={ReanimatedFadeIn.duration(500).delay(200)}
      style={emptyStyles.container}
    >
      <View style={emptyStyles.iconWrap}>
        <Wallet size={36} color={COLORS.gold} />
      </View>
      <Text
        variant="body"
        weight="medium"
        style={{ color: COLORS.text, marginTop: 12 }}
      >
        No transactions found
      </Text>
      <Text
        variant="caption"
        style={{ color: COLORS.mutedForeground, marginTop: 4, textAlign: "center" }}
      >
        Tap the + button to record a payment
      </Text>
    </Animated.View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.gold + "15",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ============================================================
// Animated FAB
// ============================================================

function AnimatedFAB({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      400,
      withSpring(1, { damping: 12, stiffness: 200 })
    );
  }, []);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const handlePress = () => {
    rotation.value = withSpring(rotation.value + 90, { damping: 12, stiffness: 300 });
    mediumHaptic();
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[fabStyles.fab, fabStyle]}
      accessibilityRole="button"
      accessibilityLabel="Record payment"
    >
      <Plus size={24} color={COLORS.primary} strokeWidth={2.5} />
    </AnimatedPressable>
  );
}

const fabStyles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

// ============================================================
// Main Screen
// ============================================================

export default function FinanceScreen() {
  const { roleInOrg } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const { data: projects = [], isLoading: projectsLoading } =
    useFinanceProjects();

  const {
    data: transactions = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useTransactions(selectedProjectId || undefined);

  const { data: walletProject } = useProjectWallet(
    selectedProjectId || undefined
  );

  const recordMutation = useRecordTransaction();
  const verifyMutation = useVerifyTransaction();

  const handleRecordPayment = useCallback(
    (formData: PaymentFormValues) => {
      recordMutation.mutate(
        {
          projectId: formData.project_id,
          data: {
            category: formData.category,
            source: formData.source as "CLIENT" | "VENDOR" | "LABOR" | "PETTY_CASH",
            amount: parseFloat(formData.amount),
            description: formData.description,
            reference_id: formData.reference_id || undefined,
          },
        },
        {
          onSuccess: () => {
            setShowForm(false);
          },
        }
      );
    },
    [recordMutation]
  );

  const handleVerify = useCallback(
    (txnId: string) => {
      setVerifyingId(txnId);
      verifyMutation.mutate(txnId, {
        onSettled: () => setVerifyingId(null),
      });
    },
    [verifyMutation]
  );

  const renderTransaction = useCallback(
    ({ item, index }: { item: Transaction; index: number }) => (
      <TransactionCard
        transaction={item}
        userRole={roleInOrg}
        onVerify={handleVerify}
        isVerifying={verifyingId === item.id}
        index={index}
      />
    ),
    [roleInOrg, handleVerify, verifyingId]
  );

  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  const ListHeader = useCallback(() => (
    <>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(100)}
        style={headerStyles.header}
      >
        <Text
          variant="title"
          weight="bold"
          style={{ color: COLORS.text }}
        >
          Finance
        </Text>
      </Animated.View>

      {/* Project Filter */}
      <ProjectFilterPicker
        projects={projects}
        selectedId={selectedProjectId}
        onSelect={setSelectedProjectId}
      />

      {/* Wallet Summary */}
      {walletProject && selectedProjectId ? (
        <WalletCard project={walletProject} />
      ) : null}

      {/* Section label */}
      {transactions.length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(300).delay(250)}
          style={headerStyles.sectionLabel}
        >
          <Text variant="label" weight="semibold" style={{ color: COLORS.mutedForeground }}>
            Transactions
          </Text>
          <Text variant="caption" style={{ color: COLORS.mutedForeground }}>
            {transactions.length} total
          </Text>
        </Animated.View>
      )}
    </>
  ), [projects, selectedProjectId, walletProject, transactions.length]);

  return (
    <SafeAreaView style={mainStyles.safeArea}>
      {isLoading ? (
        <View style={mainStyles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.gold} />
        </View>
      ) : isError ? (
        <View style={mainStyles.loadingWrap}>
          <Text variant="body" weight="medium" style={{ color: COLORS.text, marginBottom: 8 }}>
            Failed to load transactions
          </Text>
          <Text variant="caption" style={{ color: COLORS.mutedForeground, marginBottom: 16, textAlign: "center" }}>
            Something went wrong. Please try again.
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.gold }}
          >
            <Text variant="label" weight="semibold" style={{ color: "#FFFFFF" }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlashList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={keyExtractor}
            estimatedItemSize={100}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={EmptyState}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={COLORS.gold}
                colors={[COLORS.gold]}
              />
            }
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          />
        </View>
      )}

      {/* FAB — only MANAGER / SUPER_ADMIN can record payments */}
      <RoleGate permission="canRecordPayment">
        <AnimatedFAB onPress={() => setShowForm(true)} />
      </RoleGate>

      {/* Record Payment Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForm(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
          <View style={modalStyles.header}>
            <Text variant="subtitle" weight="bold" style={{ color: COLORS.text }}>
              Record Payment
            </Text>
            <Pressable
              onPress={() => setShowForm(false)}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
            >
              <X size={24} color={COLORS.mutedForeground} />
            </Pressable>
          </View>

          <RecordPaymentForm
            onSubmit={handleRecordPayment}
            isSubmitting={recordMutation.isPending}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const mainStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

const headerStyles = StyleSheet.create({
  header: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
});

const modalStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
});
