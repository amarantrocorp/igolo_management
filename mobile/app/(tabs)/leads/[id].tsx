import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Edit3,
  ChevronDown,
  Plus,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Tag,
  PhoneCall,
  Video,
  StickyNote,
  Eye,
} from "lucide-react-native";
import {
  useLead,
  useUpdateLead,
  useLeadActivities,
  useCreateActivity,
} from "../../../features/leads/hooks";
import LeadForm from "../../../features/leads/components/LeadForm";
import { Badge } from "../../../components/atoms/Badge";
import { Button } from "../../../components/atoms/Button";
import { COLORS } from "../../../lib/constants";
import { useToast } from "../../../components/molecules/Toast";
import { formatDate, formatRelativeTime, formatDateTime } from "../../../lib/format";
import type { LeadStatus, ActivityType, LeadActivity } from "../../../types";
import type { LeadFormValues } from "../../../features/leads/components/LeadForm";

// ---------------------
// Constants
// ---------------------

const LEAD_STATUSES: { label: string; value: LeadStatus }[] = [
  { label: "New", value: "NEW" },
  { label: "Contacted", value: "CONTACTED" },
  { label: "Qualified", value: "QUALIFIED" },
  { label: "Quotation Sent", value: "QUOTATION_SENT" },
  { label: "Negotiation", value: "NEGOTIATION" },
  { label: "Converted", value: "CONVERTED" },
  { label: "Lost", value: "LOST" },
];

const STATUS_BADGE_VARIANTS: Record<
  LeadStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  NEW: "default",
  CONTACTED: "secondary",
  QUALIFIED: "warning",
  QUOTATION_SENT: "default",
  NEGOTIATION: "warning",
  CONVERTED: "success",
  LOST: "destructive",
};

const ACTIVITY_TYPES: { label: string; value: ActivityType; icon: typeof Phone }[] = [
  { label: "Call", value: "CALL", icon: PhoneCall },
  { label: "Email", value: "EMAIL", icon: Mail },
  { label: "Meeting", value: "MEETING", icon: Video },
  { label: "Note", value: "NOTE", icon: StickyNote },
  { label: "Site Visit", value: "SITE_VISIT", icon: Eye },
];

const ACTIVITY_ICON_MAP: Record<ActivityType, typeof Phone> = {
  CALL: PhoneCall,
  EMAIL: Mail,
  MEETING: Video,
  NOTE: StickyNote,
  SITE_VISIT: Eye,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  CALL: "#3B82F6",
  EMAIL: "#8B5CF6",
  MEETING: "#06B6D4",
  NOTE: "#F59E0B",
  SITE_VISIT: "#22C55E",
};

// ---------------------
// Sub-components
// ---------------------

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <View className="flex-row items-start py-2.5 border-b" style={{ borderBottomColor: COLORS.border + "60" }}>
      <View className="w-8 h-8 rounded-lg bg-gray-50 items-center justify-center mr-3">
        <Icon size={14} color={COLORS.mutedForeground} />
      </View>
      <View className="flex-1">
        <Text className="text-[10px] mb-0.5" style={{ color: COLORS.mutedForeground }}>
          {label}
        </Text>
        <Text className="text-sm" style={{ color: COLORS.text }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ActivityItem({ activity }: { activity: LeadActivity }) {
  const Icon = ACTIVITY_ICON_MAP[activity.type] ?? StickyNote;
  const color = ACTIVITY_COLORS[activity.type] ?? COLORS.mutedForeground;

  return (
    <View className="flex-row mb-4">
      <View className="items-center mr-3">
        <View
          className="w-8 h-8 rounded-full items-center justify-center"
          style={{ backgroundColor: color + "15" }}
        >
          <Icon size={14} color={color} />
        </View>
        <View
          className="w-0.5 flex-1 mt-1"
          style={{ backgroundColor: COLORS.border }}
        />
      </View>
      <View className="flex-1 pb-2">
        <View className="flex-row items-center justify-between mb-0.5">
          <Text
            className="text-xs font-semibold"
            style={{ color }}
          >
            {activity.type.replace(/_/g, " ")}
          </Text>
          <Text className="text-[10px]" style={{ color: COLORS.mutedForeground }}>
            {formatRelativeTime(activity.created_at)}
          </Text>
        </View>
        <Text className="text-sm" style={{ color: COLORS.text }}>
          {activity.description}
        </Text>
      </View>
    </View>
  );
}

// ---------------------
// Main Screen
// ---------------------

type TabName = "overview" | "activities";

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabName>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>("NOTE");
  const [activityText, setActivityText] = useState("");

  const leadQuery = useLead(id);
  const updateLead = useUpdateLead();
  const activitiesQuery = useLeadActivities(id);
  const createActivity = useCreateActivity();

  const lead = leadQuery.data;

  const handleGoBack = useCallback(() => {
    if (isEditing) {
      setIsEditing(false);
    } else {
      router.back();
    }
  }, [router, isEditing]);

  const handleCall = useCallback(() => {
    if (lead?.contact_number) {
      Linking.openURL(`tel:${lead.contact_number}`);
    }
  }, [lead?.contact_number]);

  const handleWhatsApp = useCallback(() => {
    if (lead?.contact_number) {
      const phone = lead.contact_number.replace(/\D/g, "");
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  }, [lead?.contact_number]);

  const handleStatusChange = useCallback(
    (status: LeadStatus) => {
      if (!id) return;
      setShowStatusPicker(false);
      updateLead.mutate(
        { id, data: { status } },
        {
          onError: (error: any) => {
            toast.show(
              error?.response?.data?.detail ?? "Failed to update status",
              "error"
            );
          },
        }
      );
    },
    [id, updateLead]
  );

  const handleEditSubmit = useCallback(
    (formData: LeadFormValues) => {
      if (!id) return;
      updateLead.mutate(
        {
          id,
          data: {
            name: formData.name,
            contact_number: formData.contact_number,
            email: formData.email || undefined,
            location: formData.location || undefined,
            property_type: formData.property_type || undefined,
            budget_range: formData.budget_range || undefined,
            source: formData.source,
            design_style: formData.design_style || undefined,
            scope_of_work: formData.scope_of_work,
            notes: formData.notes || undefined,
          },
        },
        {
          onSuccess: () => {
            setIsEditing(false);
            toast.show("Lead updated successfully", "success");
          },
          onError: (error: any) => {
            toast.show(
              error?.response?.data?.detail ?? "Failed to update lead",
              "error"
            );
          },
        }
      );
    },
    [id, updateLead]
  );

  const handleAddActivity = useCallback(() => {
    if (!id || !activityText.trim()) return;
    createActivity.mutate(
      {
        leadId: id,
        data: {
          type: activityType,
          description: activityText.trim(),
        },
      },
      {
        onSuccess: () => {
          setActivityText("");
          setShowAddActivity(false);
        },
        onError: (error: any) => {
          toast.show(
            error?.response?.data?.detail ?? "Failed to add activity",
            "error"
          );
        },
      }
    );
  }, [id, activityType, activityText, createActivity]);

  // Loading
  if (leadQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: "#F8FAFC" }}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </SafeAreaView>
    );
  }

  // Not found
  if (!lead) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: "#F8FAFC" }}>
        <Text className="text-base" style={{ color: COLORS.mutedForeground }}>
          Lead not found
        </Text>
        <Button variant="ghost" onPress={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  // Edit mode
  if (isEditing) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: "#F8FAFC" }}>
        <View
          className="flex-row items-center px-4 py-3 border-b"
          style={{
            borderBottomColor: COLORS.border,
            backgroundColor: COLORS.background,
          }}
        >
          <Pressable onPress={handleGoBack} hitSlop={12} className="mr-3">
            <ArrowLeft size={22} color={COLORS.text} />
          </Pressable>
          <Text className="text-lg font-bold" style={{ color: COLORS.text }}>
            Edit Lead
          </Text>
        </View>
        <LeadForm
          defaultValues={{
            name: lead.name,
            contact_number: lead.contact_number,
            email: lead.email ?? "",
            location: lead.location ?? "",
            property_type: lead.property_type ?? "",
            budget_range: lead.budget_range ?? "",
            source: lead.source,
            design_style: lead.design_style ?? "",
            scope_of_work: lead.scope_of_work ?? [],
            notes: lead.notes ?? "",
          }}
          onSubmit={handleEditSubmit}
          isSubmitting={updateLead.isPending}
          submitLabel="Update Lead"
        />
      </SafeAreaView>
    );
  }

  const statusVariant = STATUS_BADGE_VARIANTS[lead.status] ?? "default";

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#F8FAFC" }}>
      {/* Header */}
      <View
        className="px-4 py-3 border-b"
        style={{
          borderBottomColor: COLORS.border,
          backgroundColor: COLORS.background,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <Pressable onPress={handleGoBack} hitSlop={12} className="mr-3">
              <ArrowLeft size={22} color={COLORS.text} />
            </Pressable>
            <Text
              className="text-lg font-bold flex-1 mr-2"
              style={{ color: COLORS.text }}
              numberOfLines={1}
            >
              {lead.name}
            </Text>
          </View>
          <Pressable onPress={() => setIsEditing(true)} hitSlop={8} className="ml-2" accessibilityLabel="Edit lead" accessibilityRole="button">
            <Edit3 size={18} color={COLORS.mutedForeground} />
          </Pressable>
        </View>

        {/* Status + Actions Row */}
        <View className="flex-row items-center mt-2">
          <Pressable
            onPress={() => setShowStatusPicker(!showStatusPicker)}
            className="flex-row items-center mr-auto"
          >
            <Badge variant={statusVariant}>
              {lead.status.replace(/_/g, " ")}
            </Badge>
            <ChevronDown
              size={14}
              color={COLORS.mutedForeground}
              className="ml-1"
            />
          </Pressable>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={handleCall}
              hitSlop={8}
              className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center"
              accessibilityLabel="Call lead"
              accessibilityRole="button"
            >
              <Phone size={16} color="#3B82F6" strokeWidth={2} />
            </Pressable>
            <Pressable
              onPress={handleWhatsApp}
              hitSlop={8}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: "#DCFCE7" }}
              accessibilityLabel="Message on WhatsApp"
              accessibilityRole="button"
            >
              <MessageCircle size={16} color="#22C55E" strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* Status Picker Dropdown */}
        {showStatusPicker ? (
          <View
            className="mt-2 border rounded-lg overflow-hidden"
            style={{ borderColor: COLORS.border, backgroundColor: COLORS.background }}
          >
            {LEAD_STATUSES.map((s) => (
              <Pressable
                key={s.value}
                onPress={() => handleStatusChange(s.value)}
                className="px-3 py-2.5 border-b"
                style={{
                  borderBottomColor: COLORS.border + "60",
                  backgroundColor:
                    lead.status === s.value ? COLORS.gold + "10" : "transparent",
                }}
              >
                <Text
                  className="text-sm"
                  style={{
                    color: lead.status === s.value ? COLORS.gold : COLORS.text,
                    fontWeight: lead.status === s.value ? "600" : "400",
                  }}
                >
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {/* Tabs */}
      <View
        className="flex-row border-b"
        style={{ borderBottomColor: COLORS.border }}
      >
        {(["overview", "activities"] as TabName[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className="flex-1 py-3 items-center"
            style={
              activeTab === tab
                ? {
                    borderBottomWidth: 2,
                    borderBottomColor: COLORS.gold,
                  }
                : undefined
            }
          >
            <Text
              className="text-sm font-medium capitalize"
              style={{
                color: activeTab === tab ? COLORS.gold : COLORS.mutedForeground,
              }}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={leadQuery.isRefetching}
            onRefresh={() => {
              leadQuery.refetch();
              activitiesQuery.refetch();
            }}
            tintColor={COLORS.gold}
            colors={[COLORS.gold]}
          />
        }
      >
        {activeTab === "overview" ? (
          <View>
            {/* Contact Info */}
            <Text
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: COLORS.mutedForeground }}
            >
              Contact Information
            </Text>
            <View
              className="bg-white rounded-xl p-3 mb-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <InfoRow icon={Phone} label="Phone" value={lead.contact_number} />
              <InfoRow icon={Mail} label="Email" value={lead.email} />
              <InfoRow icon={MapPin} label="Location" value={lead.location} />
            </View>

            {/* Project Details */}
            <Text
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: COLORS.mutedForeground }}
            >
              Project Details
            </Text>
            <View
              className="bg-white rounded-xl p-3 mb-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <InfoRow icon={Briefcase} label="Property Type" value={lead.property_type} />
              <InfoRow icon={Tag} label="Budget Range" value={lead.budget_range} />
              <InfoRow icon={Tag} label="Design Style" value={lead.design_style} />
              <InfoRow icon={Tag} label="Source" value={lead.source} />
              <InfoRow
                icon={Calendar}
                label="Created"
                value={formatDate(lead.created_at)}
              />
            </View>

            {/* Scope of Work */}
            {lead.scope_of_work && lead.scope_of_work.length > 0 ? (
              <>
                <Text
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: COLORS.mutedForeground }}
                >
                  Scope of Work
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {lead.scope_of_work.map((item) => (
                    <View
                      key={item}
                      className="px-3 py-1.5 rounded-full"
                      style={{ backgroundColor: COLORS.gold + "15" }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: COLORS.gold }}
                      >
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {/* Notes */}
            {lead.notes ? (
              <>
                <Text
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: COLORS.mutedForeground }}
                >
                  Notes
                </Text>
                <View
                  className="bg-white rounded-xl p-3"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.03,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <Text className="text-sm leading-5" style={{ color: COLORS.text }}>
                    {lead.notes}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        ) : (
          /* Activities Tab */
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View>
            {/* Add Activity Button */}
            <Pressable
              onPress={() => setShowAddActivity(!showAddActivity)}
              className="flex-row items-center justify-center py-2.5 mb-4 rounded-lg border border-dashed"
              style={{ borderColor: COLORS.gold }}
            >
              <Plus size={16} color={COLORS.gold} />
              <Text
                className="text-sm font-medium ml-1.5"
                style={{ color: COLORS.gold }}
              >
                Add Activity
              </Text>
            </Pressable>

            {/* Add Activity Form */}
            {showAddActivity ? (
              <View
                className="bg-white rounded-xl p-4 mb-4"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                {/* Activity Type Selector */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-3"
                >
                  {ACTIVITY_TYPES.map((at) => {
                    const isActive = activityType === at.value;
                    const Icon = at.icon;
                    return (
                      <Pressable
                        key={at.value}
                        onPress={() => setActivityType(at.value)}
                        className="flex-row items-center mr-2 px-3 py-1.5 rounded-full border"
                        style={{
                          borderColor: isActive
                            ? ACTIVITY_COLORS[at.value]
                            : COLORS.border,
                          backgroundColor: isActive
                            ? ACTIVITY_COLORS[at.value] + "15"
                            : "transparent",
                        }}
                      >
                        <Icon
                          size={12}
                          color={
                            isActive
                              ? ACTIVITY_COLORS[at.value]
                              : COLORS.mutedForeground
                          }
                        />
                        <Text
                          className="text-xs font-medium ml-1"
                          style={{
                            color: isActive
                              ? ACTIVITY_COLORS[at.value]
                              : COLORS.mutedForeground,
                          }}
                        >
                          {at.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Description Input */}
                <TextInput
                  className="border rounded-lg px-3 py-3 text-sm mb-3"
                  style={{
                    borderColor: COLORS.border,
                    color: COLORS.text,
                    minHeight: 60,
                    textAlignVertical: "top",
                  }}
                  placeholder="What happened?"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={activityText}
                  onChangeText={setActivityText}
                  multiline
                  maxLength={2000}
                />

                <Button
                  onPress={handleAddActivity}
                  loading={createActivity.isPending}
                  disabled={!activityText.trim() || createActivity.isPending}
                  size="sm"
                >
                  Save Activity
                </Button>
              </View>
            ) : null}

            {/* Activities Timeline */}
            {activitiesQuery.isLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="small" color={COLORS.gold} />
              </View>
            ) : activitiesQuery.data && activitiesQuery.data.length > 0 ? (
              activitiesQuery.data.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            ) : (
              <View className="py-12 items-center">
                <StickyNote
                  size={40}
                  color={COLORS.mutedForeground}
                  strokeWidth={1.5}
                />
                <Text
                  className="text-sm mt-3"
                  style={{ color: COLORS.mutedForeground }}
                >
                  No activities yet
                </Text>
              </View>
            )}
          </View>
          </KeyboardAvoidingView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
