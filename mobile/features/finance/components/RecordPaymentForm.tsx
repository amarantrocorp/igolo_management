import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { ChevronDown } from "lucide-react-native";
import { COLORS } from "../../../lib/constants";
import { Button } from "../../../components/atoms/Button";
import { Card } from "../../../components/atoms/Card";
import { Text } from "../../../components/atoms/Text";
import { formatINR } from "../../../lib/format";
import { useFinanceProjects, useProjectWallet } from "../hooks";
import type {
  Project,
  TransactionCategory,
  TransactionSource,
} from "../../../types";

// ============================================================
// Form Types
// ============================================================

export interface PaymentFormValues {
  project_id: string;
  category: TransactionCategory;
  source: TransactionSource | "";
  amount: string;
  description: string;
  reference_id: string;
}

interface RecordPaymentFormProps {
  onSubmit: (data: PaymentFormValues) => void;
  isSubmitting?: boolean;
}

// ============================================================
// Sub-Components
// ============================================================

function FieldLabel({
  children,
  required,
}: {
  children: string;
  required?: boolean;
}) {
  return (
    <Text
      variant="caption"
      weight="medium"
      className="mb-1"
      style={{ color: COLORS.text }}
    >
      {children}
      {required ? (
        <Text variant="caption" style={{ color: COLORS.destructive }}>
          {" "}
          *
        </Text>
      ) : null}
    </Text>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Text
      variant="caption"
      className="mt-0.5"
      style={{ color: COLORS.destructive }}
    >
      {message}
    </Text>
  );
}

function PickerField({
  label,
  value,
  options,
  onSelect,
  placeholder,
  required,
  error,
  disabled,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onSelect: (val: string) => void;
  placeholder: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label || "";

  return (
    <View className="mb-4">
      <FieldLabel required={required}>{label}</FieldLabel>
      <Pressable
        onPress={() => !disabled && setOpen(!open)}
        className="flex-row items-center justify-between border rounded-lg px-3 py-3"
        style={{
          borderColor: error ? COLORS.destructive : COLORS.border,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text
          variant="body"
          style={{
            color: selectedLabel ? COLORS.text : COLORS.mutedForeground,
            flex: 1,
          }}
        >
          {selectedLabel || placeholder}
        </Text>
        <ChevronDown size={16} color={COLORS.mutedForeground} />
      </Pressable>
      {open ? (
        <View
          className="border rounded-lg mt-1 max-h-40 overflow-hidden"
          style={{
            borderColor: COLORS.border,
            backgroundColor: COLORS.background,
          }}
        >
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
            {options.length === 0 ? (
              <View className="px-3 py-3">
                <Text
                  variant="body"
                  style={{ color: COLORS.mutedForeground }}
                >
                  No options available
                </Text>
              </View>
            ) : (
              options.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    onSelect(opt.value);
                    setOpen(false);
                  }}
                  className="px-3 py-2.5"
                  style={
                    value === opt.value
                      ? { backgroundColor: COLORS.gold + "15" }
                      : undefined
                  }
                >
                  <Text
                    variant="body"
                    style={{
                      color: value === opt.value ? COLORS.gold : COLORS.text,
                      fontWeight: value === opt.value ? "600" : "400",
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      ) : null}
      <FieldError message={error} />
    </View>
  );
}

// ============================================================
// Source options based on category
// ============================================================

const INFLOW_SOURCES: { label: string; value: TransactionSource }[] = [
  { label: "Client", value: "CLIENT" },
];

const OUTFLOW_SOURCES: { label: string; value: TransactionSource }[] = [
  { label: "Vendor", value: "VENDOR" },
  { label: "Labor", value: "LABOR" },
  { label: "Petty Cash", value: "PETTY_CASH" },
];

// ============================================================
// Main Form
// ============================================================

export default function RecordPaymentForm({
  onSubmit,
  isSubmitting = false,
}: RecordPaymentFormProps) {
  const { data: projects = [], isLoading: projectsLoading } =
    useFinanceProjects();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    defaultValues: {
      project_id: "",
      category: "INFLOW",
      source: "",
      amount: "",
      description: "",
      reference_id: "",
    },
  });

  const selectedProjectId = watch("project_id");
  const selectedCategory = watch("category");

  const { data: walletProject } = useProjectWallet(
    selectedProjectId || undefined
  );

  const projectOptions = useMemo(
    () =>
      projects.map((p: Project) => ({
        label: p.client?.lead?.name
          ? `${p.client.lead.name}`
          : `Project #${p.id.slice(0, 8)}`,
        value: p.id,
      })),
    [projects]
  );

  const sourceOptions = useMemo(
    () => (selectedCategory === "INFLOW" ? INFLOW_SOURCES : OUTFLOW_SOURCES),
    [selectedCategory]
  );

  const handleCategoryChange = useCallback(
    (cat: TransactionCategory) => {
      setValue("category", cat);
      // Reset source when switching category
      setValue("source", cat === "INFLOW" ? "CLIENT" : "");
    },
    [setValue]
  );

  const onValid = useCallback(
    (data: PaymentFormValues) => {
      if (!data.source) return; // guard: source must be selected
      onSubmit(data as PaymentFormValues & { source: TransactionSource });
      reset({
        project_id: "",
        category: "INFLOW",
        source: "",
        amount: "",
        description: "",
        reference_id: "",
      });
    },
    [onSubmit, reset]
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Project Picker */}
        <Controller
          control={control}
          name="project_id"
          rules={{ required: "Project is required" }}
          render={({ field: { onChange, value } }) => (
            <PickerField
              label="Project"
              value={value}
              options={projectOptions}
              onSelect={onChange}
              placeholder={
                projectsLoading ? "Loading projects..." : "Select project"
              }
              required
              error={errors.project_id?.message}
              disabled={projectsLoading}
            />
          )}
        />

        {/* Wallet Balance Preview */}
        {walletProject?.wallet ? (
          <Card padding="sm" className="mb-4 bg-slate-50">
            <View className="flex-row justify-between items-center">
              <Text
                variant="caption"
                weight="medium"
                style={{ color: COLORS.mutedForeground }}
              >
                Current Balance
              </Text>
              <Text
                variant="body"
                weight="bold"
                style={{
                  color:
                    walletProject.wallet.current_balance >= 0
                      ? COLORS.success
                      : COLORS.destructive,
                }}
              >
                {formatINR(walletProject.wallet.current_balance)}
              </Text>
            </View>
          </Card>
        ) : null}

        {/* Category Toggle */}
        <View className="mb-4">
          <FieldLabel required>Category</FieldLabel>
          <Controller
            control={control}
            name="category"
            render={({ field: { value } }) => (
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => handleCategoryChange("INFLOW")}
                  className="flex-1 items-center justify-center py-3 rounded-lg border"
                  style={{
                    borderColor:
                      value === "INFLOW" ? COLORS.success : COLORS.border,
                    backgroundColor:
                      value === "INFLOW" ? COLORS.success + "15" : "transparent",
                  }}
                >
                  <Text
                    variant="body"
                    weight={value === "INFLOW" ? "bold" : "medium"}
                    style={{
                      color:
                        value === "INFLOW"
                          ? COLORS.success
                          : COLORS.mutedForeground,
                    }}
                  >
                    INFLOW
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleCategoryChange("OUTFLOW")}
                  className="flex-1 items-center justify-center py-3 rounded-lg border"
                  style={{
                    borderColor:
                      value === "OUTFLOW" ? COLORS.destructive : COLORS.border,
                    backgroundColor:
                      value === "OUTFLOW"
                        ? COLORS.destructive + "15"
                        : "transparent",
                  }}
                >
                  <Text
                    variant="body"
                    weight={value === "OUTFLOW" ? "bold" : "medium"}
                    style={{
                      color:
                        value === "OUTFLOW"
                          ? COLORS.destructive
                          : COLORS.mutedForeground,
                    }}
                  >
                    OUTFLOW
                  </Text>
                </Pressable>
              </View>
            )}
          />
        </View>

        {/* Source Picker */}
        <Controller
          control={control}
          name="source"
          rules={{ required: "Source is required" }}
          render={({ field: { onChange, value } }) => (
            <PickerField
              label="Source"
              value={value}
              options={sourceOptions}
              onSelect={onChange}
              placeholder="Select source"
              required
              error={errors.source?.message}
            />
          )}
        />

        {/* Amount */}
        <View className="mb-4">
          <FieldLabel required>Amount</FieldLabel>
          <Controller
            control={control}
            name="amount"
            rules={{
              required: "Amount is required",
              validate: (val) => {
                const n = parseFloat(val);
                if (isNaN(n) || n < 0.01) return "Minimum amount is 0.01";
                if (n > 9999999999) return "Amount too large";
                return true;
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border rounded-lg px-3 py-3 text-sm"
                style={{
                  borderColor: errors.amount
                    ? COLORS.destructive
                    : COLORS.border,
                  color: COLORS.text,
                }}
                placeholder="Enter amount"
                placeholderTextColor={COLORS.mutedForeground}
                value={value}
                onChangeText={(text) => {
                  // Allow only valid decimal numbers
                  const sanitized = text.replace(/[^0-9.]/g, "");
                  // Prevent multiple dots
                  const parts = sanitized.split(".");
                  const cleaned = parts.length > 2
                    ? parts[0] + "." + parts.slice(1).join("")
                    : sanitized;
                  if (cleaned.length <= 13) onChange(cleaned);
                }}
                onBlur={onBlur}
                keyboardType="decimal-pad"
                inputMode="decimal"
                maxLength={13}
              />
            )}
          />
          <FieldError message={errors.amount?.message} />
        </View>

        {/* Description */}
        <View className="mb-4">
          <FieldLabel required>Description</FieldLabel>
          <Controller
            control={control}
            name="description"
            rules={{ required: "Description is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border rounded-lg px-3 py-3 text-sm"
                style={{
                  borderColor: errors.description
                    ? COLORS.destructive
                    : COLORS.border,
                  color: COLORS.text,
                  minHeight: 70,
                  textAlignVertical: "top",
                }}
                placeholder="Payment description..."
                placeholderTextColor={COLORS.mutedForeground}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            )}
          />
          <FieldError message={errors.description?.message} />
        </View>

        {/* Reference ID */}
        <View className="mb-4">
          <FieldLabel>Reference ID</FieldLabel>
          <Controller
            control={control}
            name="reference_id"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border rounded-lg px-3 py-3 text-sm"
                style={{
                  borderColor: COLORS.border,
                  color: COLORS.text,
                }}
                placeholder="Bank ref / Cheque no (optional)"
                placeholderTextColor={COLORS.mutedForeground}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                maxLength={100}
              />
            )}
          />
        </View>

        {/* Submit */}
        <Button
          onPress={handleSubmit(onValid)}
          loading={isSubmitting}
          disabled={isSubmitting}
          size="lg"
        >
          Record Payment
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
