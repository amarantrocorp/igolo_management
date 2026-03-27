import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withSpring,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
  interpolate,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ChevronDown, Minus, Plus, CheckCircle2 } from "lucide-react-native";
import { COLORS } from "../../../lib/constants";
import { Button } from "../../../components/atoms/Button";
import { Card } from "../../../components/atoms/Card";
import { useTeams, useProjectsForPicker } from "../hooks";
import type { Project, LaborTeam, Sprint } from "../../../types";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// ============================================================
// Form Types
// ============================================================

export interface AttendanceFormValues {
  project_id: string;
  team_id: string;
  sprint_id: string;
  date: string;
  workers_present: string;
  total_hours: string;
  notes: string;
}

interface AttendanceFormProps {
  onSubmit: (data: AttendanceFormValues) => void;
  isSubmitting?: boolean;
}

// ============================================================
// Sub-Components
// ============================================================

function SectionHeader({ children }: { children: string }) {
  return (
    <View style={sectionStyles.header}>
      <View style={sectionStyles.line} />
      <Text style={sectionStyles.text}>{children}</Text>
      <View style={sectionStyles.line} />
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    marginTop: 8,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.gold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    paddingHorizontal: 10,
  },
});

function FieldLabel({
  children,
  required,
}: {
  children: string;
  required?: boolean;
}) {
  return (
    <Text style={styles.fieldLabel}>
      {children}
      {required ? <Text style={{ color: COLORS.destructive }}> *</Text> : null}
    </Text>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
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
  const selectedLabel =
    options.find((o) => o.value === value)?.label || "";

  return (
    <View style={styles.fieldGroup}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <Pressable
        onPress={() => {
          if (disabled) return;
          setOpen(!open);
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
        style={[
          styles.pickerBtn,
          {
            borderColor: error ? COLORS.destructive : open ? COLORS.gold : COLORS.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.pickerText,
            { color: selectedLabel ? COLORS.text : COLORS.mutedForeground },
          ]}
        >
          {selectedLabel || placeholder}
        </Text>
        <ChevronDown size={16} color={COLORS.mutedForeground} />
      </Pressable>
      {open ? (
        <View style={styles.pickerDropdown}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
            {options.length === 0 ? (
              <View style={styles.pickerOption}>
                <Text style={[styles.pickerOptionText, { color: COLORS.mutedForeground }]}>
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
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={[
                    styles.pickerOption,
                    value === opt.value && { backgroundColor: COLORS.gold + "15" },
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      {
                        color: value === opt.value ? COLORS.gold : COLORS.text,
                        fontWeight: value === opt.value ? "600" : "400",
                      },
                    ]}
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
// Stepper Component
// ============================================================

function StepperInput({
  value,
  onChange,
  min = 1,
  max = 200,
  step = 1,
  label,
  required,
  error,
  suffix,
}: {
  value: string;
  onChange: (val: string) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  required?: boolean;
  error?: string;
  suffix?: string;
}) {
  const numValue = parseFloat(value) || 0;
  const scale = useSharedValue(1);

  const bump = () => {
    scale.value = withSequence(
      withSpring(1.15, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 300 })
    );
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const numberStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const increment = () => {
    const next = Math.min(max, numValue + step);
    onChange(String(step < 1 ? next.toFixed(1) : next));
    bump();
  };

  const decrement = () => {
    const next = Math.max(min, numValue - step);
    onChange(String(step < 1 ? next.toFixed(1) : next));
    bump();
  };

  return (
    <View style={styles.fieldGroup}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <View style={[styles.stepperContainer, error && { borderColor: COLORS.destructive }]}>
        <Pressable
          onPress={decrement}
          style={[styles.stepperBtn, { borderRightWidth: 1, borderRightColor: COLORS.border }]}
        >
          <Minus size={18} color={numValue <= min ? COLORS.border : COLORS.text} />
        </Pressable>

        <Animated.View style={[styles.stepperValueWrap, numberStyle]}>
          <Text style={styles.stepperValue}>{value || "0"}</Text>
          {suffix && <Text style={styles.stepperSuffix}>{suffix}</Text>}
        </Animated.View>

        <Pressable
          onPress={increment}
          style={[styles.stepperBtn, { borderLeftWidth: 1, borderLeftColor: COLORS.border }]}
        >
          <Plus size={18} color={numValue >= max ? COLORS.border : COLORS.gold} />
        </Pressable>
      </View>
      <FieldError message={error} />
    </View>
  );
}

// ============================================================
// Animated Cost Display
// ============================================================

function AnimatedCostCard({
  cost,
  rate,
  workers,
  hours,
}: {
  cost: number;
  rate: number;
  workers: string;
  hours: string;
}) {
  const animatedCost = useSharedValue(0);

  useEffect(() => {
    animatedCost.value = withTiming(cost, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [cost]);

  const animatedProps = useAnimatedProps(() => {
    const val = Math.round(animatedCost.value);
    return {
      text: `\u20B9${val.toLocaleString("en-IN")}`,
    } as any;
  });

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify().damping(18)}
      style={styles.costCard}
    >
      <View style={styles.costLeft}>
        <Text style={styles.costLabel}>Estimated Cost</Text>
        <AnimatedTextInput
          underlineColorAndroid="transparent"
          editable={false}
          animatedProps={animatedProps}
          defaultValue={"\u20B90"}
          style={styles.costValue}
        />
      </View>
      <View style={styles.costRight}>
        <Text style={styles.costDetail}>
          Rate: {"\u20B9"}{rate}/day
        </Text>
        <Text style={styles.costDetail}>
          {workers || 0} workers x {hours || 0}h
        </Text>
      </View>
    </Animated.View>
  );
}

// ============================================================
// Success Animation
// ============================================================

function SuccessOverlay({ visible }: { visible: boolean }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSequence(
        withSpring(1.2, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = 0;
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: visible ? "auto" as const : "none" as const,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.successOverlay, containerStyle]}>
      <Animated.View style={[styles.successIcon, iconStyle]}>
        <CheckCircle2 size={64} color="#22C55E" strokeWidth={2} />
      </Animated.View>
      <Text style={styles.successText}>Attendance Logged!</Text>
    </Animated.View>
  );
}

// ============================================================
// Main Form
// ============================================================

export default function AttendanceForm({
  onSubmit,
  isSubmitting = false,
}: AttendanceFormProps) {
  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const { data: projects = [], isLoading: projectsLoading } =
    useProjectsForPicker();

  const today = new Date().toISOString().split("T")[0];
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<AttendanceFormValues>({
    defaultValues: {
      project_id: "",
      team_id: "",
      sprint_id: "",
      date: today,
      workers_present: "1",
      total_hours: "8",
      notes: "",
    },
  });

  const selectedProjectId = watch("project_id");
  const selectedTeamId = watch("team_id");
  const workersPresent = watch("workers_present");
  const totalHours = watch("total_hours");

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const sprintOptions = useMemo(() => {
    if (!selectedProject?.sprints) return [];
    return selectedProject.sprints.map((s: Sprint) => ({
      label: s.name,
      value: s.id,
    }));
  }, [selectedProject]);

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

  const teamOptions = useMemo(
    () =>
      teams.map((t: LaborTeam) => ({
        label: `${t.name} (${t.specialization})`,
        value: t.id,
      })),
    [teams]
  );

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId),
    [teams, selectedTeamId]
  );

  const estimatedCost = useMemo(() => {
    if (!selectedTeam) return 0;
    const workers = parseFloat(workersPresent) || 0;
    const hours = parseFloat(totalHours) || 0;
    return workers * selectedTeam.default_daily_rate * (hours / 8);
  }, [selectedTeam, workersPresent, totalHours]);

  const onValid = useCallback(
    (data: AttendanceFormValues) => {
      onSubmit(data);
      // Show success animation briefly & reset form
      setShowSuccess(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      reset({
        project_id: "",
        team_id: "",
        sprint_id: "",
        date: today,
        workers_present: "1",
        total_hours: "8",
        notes: "",
      });
      setTimeout(() => setShowSuccess(false), 1800);
    },
    [onSubmit, reset, today]
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section: Assignment */}
        <SectionHeader>Assignment</SectionHeader>

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
              placeholder={projectsLoading ? "Loading projects..." : "Select project"}
              required
              error={errors.project_id?.message}
              disabled={projectsLoading}
            />
          )}
        />

        <Controller
          control={control}
          name="team_id"
          rules={{ required: "Team is required" }}
          render={({ field: { onChange, value } }) => (
            <PickerField
              label="Labor Team"
              value={value}
              options={teamOptions}
              onSelect={onChange}
              placeholder={teamsLoading ? "Loading teams..." : "Select labor team"}
              required
              error={errors.team_id?.message}
              disabled={teamsLoading}
            />
          )}
        />

        <Controller
          control={control}
          name="sprint_id"
          rules={{ required: "Sprint is required" }}
          render={({ field: { onChange, value } }) => (
            <PickerField
              label="Sprint / Phase"
              value={value}
              options={sprintOptions}
              onSelect={onChange}
              placeholder={
                !selectedProjectId
                  ? "Select a project first"
                  : sprintOptions.length === 0
                  ? "No sprints available"
                  : "Select sprint"
              }
              required
              error={errors.sprint_id?.message}
              disabled={!selectedProjectId || sprintOptions.length === 0}
            />
          )}
        />

        {/* Section: Details */}
        <SectionHeader>Details</SectionHeader>

        {/* Date */}
        <View style={styles.fieldGroup}>
          <FieldLabel required>Date</FieldLabel>
          <Controller
            control={control}
            name="date"
            rules={{
              required: "Date is required",
              validate: (val) => {
                if (val > today) return "Date cannot be in the future";
                return true;
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[
                  styles.textInput,
                  { borderColor: errors.date ? COLORS.destructive : COLORS.border },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.mutedForeground}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                maxLength={10}
              />
            )}
          />
          <FieldError message={errors.date?.message} />
        </View>

        {/* Workers Present - Stepper */}
        <Controller
          control={control}
          name="workers_present"
          rules={{
            required: "Workers count is required",
            validate: (val) => {
              const n = parseInt(val, 10);
              if (isNaN(n) || n < 1) return "Minimum 1 worker";
              if (n > 200) return "Maximum 200 workers";
              return true;
            },
          }}
          render={({ field: { onChange, value } }) => (
            <StepperInput
              label="Workers Present"
              value={value}
              onChange={onChange}
              min={1}
              max={200}
              step={1}
              required
              error={errors.workers_present?.message}
            />
          )}
        />

        {/* Hours Worked - Stepper */}
        <Controller
          control={control}
          name="total_hours"
          rules={{
            required: "Hours are required",
            validate: (val) => {
              const n = parseFloat(val);
              if (isNaN(n) || n < 0.5) return "Minimum 0.5 hours";
              if (n > 24) return "Maximum 24 hours";
              return true;
            },
          }}
          render={({ field: { onChange, value } }) => (
            <StepperInput
              label="Hours Worked"
              value={value}
              onChange={onChange}
              min={0.5}
              max={24}
              step={0.5}
              required
              error={errors.total_hours?.message}
              suffix="hrs"
            />
          )}
        />

        {/* Notes */}
        <View style={styles.fieldGroup}>
          <FieldLabel>Notes</FieldLabel>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Work done today..."
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

        {/* Estimated Cost Card */}
        {selectedTeam && estimatedCost > 0 ? (
          <AnimatedCostCard
            cost={estimatedCost}
            rate={selectedTeam.default_daily_rate}
            workers={workersPresent}
            hours={totalHours}
          />
        ) : null}

        {/* Submit */}
        <View style={{ marginTop: 8 }}>
          <Button
            onPress={handleSubmit(onValid)}
            loading={isSubmitting}
            disabled={isSubmitting}
            size="lg"
          >
            Mark Attendance
          </Button>
        </View>
      </ScrollView>

      <SuccessOverlay visible={showSuccess} />
    </KeyboardAvoidingView>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  formContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Field
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 6,
  },
  fieldError: {
    fontSize: 11,
    color: COLORS.destructive,
    marginTop: 4,
  },
  // Picker
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  pickerText: {
    fontSize: 14,
    flex: 1,
  },
  pickerDropdown: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 160,
    overflow: "hidden",
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerOptionText: {
    fontSize: 14,
  },
  // Text Input
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  // Stepper
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    overflow: "hidden",
  },
  stepperBtn: {
    width: 52,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValueWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  stepperSuffix: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  // Cost Card
  costCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 20,
  },
  costLeft: {},
  costLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.mutedForeground,
  },
  costValue: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 2,
    padding: 0,
  },
  costRight: {
    alignItems: "flex-end",
  },
  costDetail: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginBottom: 2,
  },
  // Success
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  successIcon: {
    marginBottom: 12,
  },
  successText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#22C55E",
  },
});
