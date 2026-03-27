import React, { useCallback, useState } from "react";
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
import { z } from "zod/v4";
import { ChevronDown, Check } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeInDown,
  interpolate,
  interpolateColor,
} from "react-native-reanimated";
import { COLORS } from "../../../lib/constants";
import { Button } from "../../../components/atoms/Button";

// ---------------------
// Validation Schema
// ---------------------

const leadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact_number: z.string().min(10, "Valid phone number required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  location: z.string().optional(),
  property_type: z.string().optional(),
  budget_range: z.string().optional(),
  source: z.string().min(1, "Source is required"),
  design_style: z.string().optional(),
  scope_of_work: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export type LeadFormValues = z.infer<typeof leadSchema>;

// ---------------------
// Options
// ---------------------

const PROPERTY_TYPES = [
  "1 BHK",
  "2 BHK",
  "3 BHK",
  "4 BHK",
  "Villa",
  "Penthouse",
  "Studio",
  "Office",
  "Retail",
  "Other",
];

const BUDGET_RANGES = [
  "Under 5L",
  "5L - 10L",
  "10L - 20L",
  "20L - 50L",
  "50L - 1Cr",
  "Above 1Cr",
];

const SOURCES = [
  "Website",
  "Referral",
  "Instagram",
  "Facebook",
  "Google Ads",
  "Walk-in",
  "Just Dial",
  "Other",
];

const DESIGN_STYLES = [
  "Modern",
  "Contemporary",
  "Classic",
  "Minimalist",
  "Scandinavian",
  "Industrial",
  "Bohemian",
  "Traditional",
  "Luxury",
  "Other",
];

const SCOPE_OPTIONS = [
  "Full Home",
  "Kitchen",
  "Living Room",
  "Master Bedroom",
  "Kids Room",
  "Guest Bedroom",
  "Bathroom",
  "Pooja Room",
  "Balcony",
  "Study",
  "Foyer",
  "False Ceiling",
  "Painting",
  "Electrical",
];

// ---------------------
// Sub-Components
// ---------------------

function SectionHeader({ children, delay = 0 }: { children: string; delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(300)} style={styles.sectionHeader}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionTitle}>{children}</Text>
    </Animated.View>
  );
}

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {children}
      {required ? <Text style={{ color: COLORS.destructive }}> *</Text> : null}
    </Text>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Animated.Text
      entering={FadeInDown.duration(200)}
      style={styles.fieldError}
    >
      {message}
    </Animated.Text>
  );
}

// Animated input with gold border on focus and shake on error
function AnimatedInput({
  value,
  onChangeText,
  onBlur,
  placeholder,
  hasError,
  keyboardType,
  autoCapitalize,
  maxLength,
  multiline,
  numberOfLines,
  minHeight,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  placeholder: string;
  hasError?: boolean;
  keyboardType?: TextInput["props"]["keyboardType"];
  autoCapitalize?: TextInput["props"]["autoCapitalize"];
  maxLength?: number;
  multiline?: boolean;
  numberOfLines?: number;
  minHeight?: number;
}) {
  const focusAnim = useSharedValue(0);
  const shakeX = useSharedValue(0);

  React.useEffect(() => {
    if (hasError) {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [hasError]);

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: hasError
      ? COLORS.destructive
      : interpolateColor(
          focusAnim.value,
          [0, 1],
          [COLORS.border, COLORS.gold]
        ),
    borderWidth: interpolate(focusAnim.value, [0, 1], [1, 1.5]),
    transform: [{ translateX: shakeX.value }],
  }));

  return (
    <Animated.View style={[styles.inputContainer, containerStyle]}>
      <TextInput
        style={[
          styles.input,
          multiline && { minHeight: minHeight || 80, textAlignVertical: "top" },
        ]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.mutedForeground}
        value={value}
        onChangeText={onChangeText}
        onBlur={() => {
          onBlur();
          focusAnim.value = withTiming(0, { duration: 200 });
        }}
        onFocus={() => {
          focusAnim.value = withTiming(1, { duration: 200 });
        }}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={numberOfLines}
      />
    </Animated.View>
  );
}

// Property type: horizontal pill selector
function PillSelector({
  label,
  value,
  options,
  onSelect,
  required,
  error,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (val: string) => void;
  required?: boolean;
  error?: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {options.map((opt) => {
          const isSelected = value === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => onSelect(opt)}
              style={[
                styles.pill,
                isSelected ? styles.pillActive : styles.pillInactive,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: isSelected ? "#0B1120" : COLORS.mutedForeground },
                  isSelected && { fontWeight: "700" },
                ]}
              >
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <FieldError message={error} />
    </View>
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
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (val: string) => void;
  placeholder: string;
  required?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const rotateAnim = useSharedValue(0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotateAnim.value, [0, 1], [0, 180])}deg` }],
  }));

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    rotateAnim.value = withSpring(next ? 1 : 0, { damping: 15 });
  };

  return (
    <View style={styles.fieldGroup}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <Pressable
        onPress={toggleOpen}
        style={[
          styles.pickerTrigger,
          { borderColor: error ? COLORS.destructive : COLORS.border },
        ]}
      >
        <Text
          style={[
            styles.pickerText,
            { color: value ? "#0F172A" : COLORS.mutedForeground },
          ]}
        >
          {value || placeholder}
        </Text>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={16} color={COLORS.mutedForeground} />
        </Animated.View>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeInDown.duration(200)} style={styles.pickerDropdown}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
            {options.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  onSelect(opt);
                  setOpen(false);
                  rotateAnim.value = withSpring(0, { damping: 15 });
                }}
                style={[
                  styles.pickerOption,
                  value === opt && { backgroundColor: COLORS.gold + "15" },
                ]}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    value === opt && { color: COLORS.gold, fontWeight: "600" },
                  ]}
                >
                  {opt}
                </Text>
                {value === opt && <Check size={14} color={COLORS.gold} />}
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      ) : null}
      <FieldError message={error} />
    </View>
  );
}

// Scope of work: chips with animated checkmark
function ScopeChips({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string[];
  options: string[];
  onChange: (val: string[]) => void;
}) {
  const toggleOption = useCallback(
    (opt: string) => {
      if (value.includes(opt)) {
        onChange(value.filter((v) => v !== opt));
      } else {
        onChange([...value, opt]);
      }
    },
    [value, onChange]
  );

  return (
    <View style={styles.fieldGroup}>
      <FieldLabel>{label}</FieldLabel>
      <View style={styles.chipGrid}>
        {options.map((opt) => {
          const isSelected = value.includes(opt);
          return (
            <ScopeChip
              key={opt}
              label={opt}
              isSelected={isSelected}
              onPress={() => toggleOption(opt)}
            />
          );
        })}
      </View>
    </View>
  );
}

function ScopeChip({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(isSelected ? 1 : 0);

  React.useEffect(() => {
    checkScale.value = withSpring(isSelected ? 1 : 0, {
      damping: 12,
      stiffness: 300,
    });
  }, [isSelected]);

  const chipAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkScale.value,
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.93, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.scopeChip,
          isSelected ? styles.scopeChipActive : styles.scopeChipInactive,
          chipAnimStyle,
        ]}
      >
        {isSelected && (
          <Animated.View style={[styles.scopeCheckIcon, checkStyle]}>
            <Check size={11} color={COLORS.gold} strokeWidth={3} />
          </Animated.View>
        )}
        <Text
          style={[
            styles.scopeChipText,
            { color: isSelected ? COLORS.gold : COLORS.mutedForeground },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ---------------------
// Main Form
// ---------------------

interface LeadFormProps {
  defaultValues?: Partial<LeadFormValues>;
  onSubmit: (data: LeadFormValues) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export default function LeadForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Create Lead",
}: LeadFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadFormValues>({
    defaultValues: {
      name: "",
      contact_number: "",
      email: "",
      location: "",
      property_type: "",
      budget_range: "",
      source: "",
      design_style: "",
      scope_of_work: [],
      notes: "",
      ...defaultValues,
    },
  });

  const onValid = useCallback(
    (data: LeadFormValues) => {
      const cleaned: LeadFormValues = {
        ...data,
        email: data.email || undefined,
        location: data.location || undefined,
        property_type: data.property_type || undefined,
        budget_range: data.budget_range || undefined,
        design_style: data.design_style || undefined,
        notes: data.notes || undefined,
        scope_of_work:
          data.scope_of_work && data.scope_of_work.length > 0
            ? data.scope_of_work
            : undefined,
      };
      onSubmit(cleaned);
    },
    [onSubmit]
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section: Contact Information */}
        <SectionHeader delay={0}>Contact Information</SectionHeader>

        {/* Name */}
        <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.fieldGroup}>
          <FieldLabel required>Name</FieldLabel>
          <Controller
            control={control}
            name="name"
            rules={{ required: "Name is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <AnimatedInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Full name"
                hasError={!!errors.name}
                autoCapitalize="words"
                maxLength={255}
              />
            )}
          />
          <FieldError message={errors.name?.message} />
        </Animated.View>

        {/* Phone */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.fieldGroup}>
          <FieldLabel required>Phone Number</FieldLabel>
          <Controller
            control={control}
            name="contact_number"
            rules={{
              required: "Phone number is required",
              minLength: { value: 10, message: "Enter a valid phone number" },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <AnimatedInput
                value={value}
                onChangeText={(text) => onChange(text.replace(/[^0-9+\-\s]/g, ""))}
                onBlur={onBlur}
                placeholder="10-digit phone number"
                hasError={!!errors.contact_number}
                keyboardType="phone-pad"
                maxLength={15}
              />
            )}
          />
          <FieldError message={errors.contact_number?.message} />
        </Animated.View>

        {/* Email */}
        <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.fieldGroup}>
          <FieldLabel>Email</FieldLabel>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <AnimatedInput
                value={value ?? ""}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="email@example.com"
                hasError={!!errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={255}
              />
            )}
          />
          <FieldError message={errors.email?.message} />
        </Animated.View>

        {/* Location */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.fieldGroup}>
          <FieldLabel>Location</FieldLabel>
          <Controller
            control={control}
            name="location"
            render={({ field: { onChange, onBlur, value } }) => (
              <AnimatedInput
                value={value ?? ""}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="City / Area"
                maxLength={255}
              />
            )}
          />
        </Animated.View>

        {/* Section: Property Details */}
        <SectionHeader delay={250}>Property Details</SectionHeader>

        {/* Property Type - Horizontal pill selector */}
        <Animated.View entering={FadeInDown.delay(300).duration(300)}>
          <Controller
            control={control}
            name="property_type"
            render={({ field: { onChange, value } }) => (
              <PillSelector
                label="Property Type"
                value={value ?? ""}
                options={PROPERTY_TYPES}
                onSelect={onChange}
              />
            )}
          />
        </Animated.View>

        {/* Budget Range */}
        <Animated.View entering={FadeInDown.delay(350).duration(300)}>
          <Controller
            control={control}
            name="budget_range"
            render={({ field: { onChange, value } }) => (
              <PillSelector
                label="Budget Range"
                value={value ?? ""}
                options={BUDGET_RANGES}
                onSelect={onChange}
              />
            )}
          />
        </Animated.View>

        {/* Section: Lead Details */}
        <SectionHeader delay={400}>Lead Details</SectionHeader>

        {/* Source */}
        <Animated.View entering={FadeInDown.delay(450).duration(300)}>
          <Controller
            control={control}
            name="source"
            rules={{ required: "Source is required" }}
            render={({ field: { onChange, value } }) => (
              <PickerField
                label="Source"
                value={value}
                options={SOURCES}
                onSelect={onChange}
                placeholder="Where did this lead come from?"
                required
                error={errors.source?.message}
              />
            )}
          />
        </Animated.View>

        {/* Design Style */}
        <Animated.View entering={FadeInDown.delay(500).duration(300)}>
          <Controller
            control={control}
            name="design_style"
            render={({ field: { onChange, value } }) => (
              <PickerField
                label="Design Style Preference"
                value={value ?? ""}
                options={DESIGN_STYLES}
                onSelect={onChange}
                placeholder="Select preferred style"
              />
            )}
          />
        </Animated.View>

        {/* Section: Scope */}
        <SectionHeader delay={550}>Scope of Work</SectionHeader>

        {/* Scope of Work - Chips with checkmarks */}
        <Animated.View entering={FadeInDown.delay(600).duration(300)}>
          <Controller
            control={control}
            name="scope_of_work"
            render={({ field: { onChange, value } }) => (
              <ScopeChips
                label="Select Rooms / Areas"
                value={value ?? []}
                options={SCOPE_OPTIONS}
                onChange={onChange}
              />
            )}
          />
        </Animated.View>

        {/* Notes */}
        <SectionHeader delay={650}>Additional Notes</SectionHeader>
        <Animated.View entering={FadeInDown.delay(700).duration(300)} style={styles.fieldGroup}>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <AnimatedInput
                value={value ?? ""}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Any additional notes..."
                multiline
                numberOfLines={4}
                minHeight={80}
                maxLength={5000}
              />
            )}
          />
        </Animated.View>

        {/* Submit */}
        <Animated.View entering={FadeInDown.delay(750).duration(300)}>
          <Button
            onPress={handleSubmit(onValid)}
            loading={isSubmitting}
            disabled={isSubmitting}
            size="lg"
          >
            {submitLabel}
          </Button>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 16,
  },
  sectionLine: {
    width: 3,
    height: 16,
    borderRadius: 1.5,
    backgroundColor: COLORS.gold,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  fieldError: {
    fontSize: 12,
    color: COLORS.destructive,
    marginTop: 4,
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#0F172A",
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  pillInactive: {
    backgroundColor: "#FFFFFF",
    borderColor: COLORS.border,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "500",
  },
  pickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#FFFFFF",
  },
  pickerText: {
    fontSize: 15,
    flex: 1,
  },
  pickerDropdown: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 180,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerOptionText: {
    fontSize: 14,
    color: "#0F172A",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scopeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  scopeChipActive: {
    backgroundColor: COLORS.gold + "15",
    borderColor: COLORS.gold,
  },
  scopeChipInactive: {
    backgroundColor: "#FFFFFF",
    borderColor: COLORS.border,
  },
  scopeCheckIcon: {
    marginRight: 4,
  },
  scopeChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
