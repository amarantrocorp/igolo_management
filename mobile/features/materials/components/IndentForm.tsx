import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { ChevronDown, Search } from "lucide-react-native";
import { COLORS } from "../../../lib/constants";
import { Button } from "../../../components/atoms/Button";
import { useItems } from "../hooks";
import { useProjectsForPicker } from "../../attendance/hooks";
import type { Item, Project } from "../../../types";

// ============================================================
// Form Types
// ============================================================

export interface IndentFormValues {
  project_id: string;
  item_id: string;
  quantity: string;
  priority: string;
  notes: string;
}

interface IndentFormProps {
  onSubmit: (data: IndentFormValues) => void;
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
    <Text className="text-xs font-medium mb-1" style={{ color: COLORS.text }}>
      {children}
      {required ? <Text style={{ color: COLORS.destructive }}> *</Text> : null}
    </Text>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Text className="text-xs mt-0.5" style={{ color: COLORS.destructive }}>
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
          className="text-sm flex-1"
          style={{
            color: selectedLabel ? COLORS.text : COLORS.mutedForeground,
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
                  className="text-sm"
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
                    className="text-sm"
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

function SearchablePickerField({
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
  options: { label: string; value: string; subtitle?: string }[];
  onSelect: (val: string) => void;
  placeholder: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedLabel = options.find((o) => o.value === value)?.label || "";

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.subtitle && o.subtitle.toLowerCase().includes(q))
    );
  }, [options, search]);

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
          className="text-sm flex-1"
          style={{
            color: selectedLabel ? COLORS.text : COLORS.mutedForeground,
          }}
        >
          {selectedLabel || placeholder}
        </Text>
        <ChevronDown size={16} color={COLORS.mutedForeground} />
      </Pressable>
      {open ? (
        <View
          className="border rounded-lg mt-1 overflow-hidden"
          style={{
            borderColor: COLORS.border,
            backgroundColor: COLORS.background,
            maxHeight: 220,
          }}
        >
          {/* Search bar */}
          <View
            className="flex-row items-center border-b px-3 py-2"
            style={{ borderBottomColor: COLORS.border }}
          >
            <Search size={14} color={COLORS.mutedForeground} />
            <TextInput
              className="flex-1 ml-2 text-sm"
              style={{ color: COLORS.text, paddingVertical: 2 }}
              placeholder="Search materials..."
              placeholderTextColor={COLORS.mutedForeground}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
            {filtered.length === 0 ? (
              <View className="px-3 py-3">
                <Text
                  className="text-sm"
                  style={{ color: COLORS.mutedForeground }}
                >
                  No items found
                </Text>
              </View>
            ) : (
              filtered.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    onSelect(opt.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="px-3 py-2.5"
                  style={
                    value === opt.value
                      ? { backgroundColor: COLORS.gold + "15" }
                      : undefined
                  }
                >
                  <Text
                    className="text-sm"
                    style={{
                      color: value === opt.value ? COLORS.gold : COLORS.text,
                      fontWeight: value === opt.value ? "600" : "400",
                    }}
                  >
                    {opt.label}
                  </Text>
                  {opt.subtitle ? (
                    <Text
                      className="text-xs mt-0.5"
                      style={{ color: COLORS.mutedForeground }}
                    >
                      {opt.subtitle}
                    </Text>
                  ) : null}
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

const PRIORITIES = [
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Urgent", value: "URGENT" },
];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: COLORS.mutedForeground,
  MEDIUM: COLORS.gold,
  HIGH: "#F97316",
  URGENT: COLORS.destructive,
};

// ============================================================
// Main Form
// ============================================================

export default function IndentForm({
  onSubmit,
  isSubmitting = false,
}: IndentFormProps) {
  const { data: items = [], isLoading: itemsLoading } = useItems();
  const { data: projects = [], isLoading: projectsLoading } =
    useProjectsForPicker();

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<IndentFormValues>({
    defaultValues: {
      project_id: "",
      item_id: "",
      quantity: "",
      priority: "MEDIUM",
      notes: "",
    },
  });

  const selectedItemId = watch("item_id");

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId),
    [items, selectedItemId]
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

  const itemOptions = useMemo(
    () =>
      items.map((i: Item) => ({
        label: i.name,
        value: i.id,
        subtitle: `${i.category} | Stock: ${i.current_stock} ${i.unit}`,
      })),
    [items]
  );

  const onValid = useCallback(
    (data: IndentFormValues) => {
      onSubmit(data);
      reset({
        project_id: "",
        item_id: "",
        quantity: "",
        priority: "MEDIUM",
        notes: "",
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

        {/* Material Picker (Searchable) */}
        <Controller
          control={control}
          name="item_id"
          rules={{ required: "Material is required" }}
          render={({ field: { onChange, value } }) => (
            <SearchablePickerField
              label="Material"
              value={value}
              options={itemOptions}
              onSelect={onChange}
              placeholder={
                itemsLoading ? "Loading items..." : "Search and select material"
              }
              required
              error={errors.item_id?.message}
              disabled={itemsLoading}
            />
          )}
        />

        {/* Unit (auto-filled) */}
        {selectedItem ? (
          <View className="mb-4">
            <FieldLabel>Unit</FieldLabel>
            <View
              className="border rounded-lg px-3 py-3"
              style={{
                borderColor: COLORS.border,
                backgroundColor: COLORS.muted,
              }}
            >
              <Text className="text-sm" style={{ color: COLORS.text }}>
                {selectedItem.unit}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Quantity */}
        <View className="mb-4">
          <FieldLabel required>
            Quantity{selectedItem ? ` (${selectedItem.unit})` : ""}
          </FieldLabel>
          <Controller
            control={control}
            name="quantity"
            rules={{
              required: "Quantity is required",
              validate: (val) => {
                const n = parseFloat(val);
                if (isNaN(n) || n <= 0) return "Must be greater than 0";
                return true;
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border rounded-lg px-3 py-3 text-sm"
                style={{
                  borderColor: errors.quantity
                    ? COLORS.destructive
                    : COLORS.border,
                  color: COLORS.text,
                }}
                placeholder="Enter quantity"
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
                  // Limit length to prevent absurdly large numbers
                  if (cleaned.length <= 12) onChange(cleaned);
                }}
                onBlur={onBlur}
                keyboardType="decimal-pad"
                inputMode="decimal"
                maxLength={12}
              />
            )}
          />
          <FieldError message={errors.quantity?.message} />
        </View>

        {/* Priority Radio Buttons */}
        <View className="mb-4">
          <FieldLabel required>Priority</FieldLabel>
          <Controller
            control={control}
            name="priority"
            rules={{ required: "Priority is required" }}
            render={({ field: { onChange, value } }) => (
              <View className="flex-row flex-wrap gap-2 mt-1">
                {PRIORITIES.map((p) => {
                  const isSelected = value === p.value;
                  return (
                    <Pressable
                      key={p.value}
                      onPress={() => onChange(p.value)}
                      className="flex-row items-center px-3 py-2 rounded-lg border"
                      style={{
                        borderColor: isSelected
                          ? PRIORITY_COLORS[p.value]
                          : COLORS.border,
                        backgroundColor: isSelected
                          ? PRIORITY_COLORS[p.value] + "12"
                          : "transparent",
                      }}
                    >
                      <View
                        className="w-4 h-4 rounded-full border-2 mr-2 items-center justify-center"
                        style={{
                          borderColor: isSelected
                            ? PRIORITY_COLORS[p.value]
                            : COLORS.border,
                        }}
                      >
                        {isSelected ? (
                          <View
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: PRIORITY_COLORS[p.value],
                            }}
                          />
                        ) : null}
                      </View>
                      <Text
                        className="text-sm font-medium"
                        style={{
                          color: isSelected
                            ? PRIORITY_COLORS[p.value]
                            : COLORS.text,
                        }}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          />
          <FieldError message={errors.priority?.message} />
        </View>

        {/* Notes */}
        <View className="mb-6">
          <FieldLabel>Notes</FieldLabel>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border rounded-lg px-3 py-3 text-sm"
                style={{
                  borderColor: COLORS.border,
                  color: COLORS.text,
                  minHeight: 70,
                  textAlignVertical: "top",
                }}
                placeholder="Any additional details..."
                placeholderTextColor={COLORS.mutedForeground}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={3}
                maxLength={2000}
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
          Submit Indent Request
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
