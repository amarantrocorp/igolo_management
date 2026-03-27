import React, { useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, WifiOff } from "lucide-react-native";
import LeadForm from "../../../features/leads/components/LeadForm";
import { useCreateLead } from "../../../features/leads/hooks";
import { useNetworkStatus } from "../../../lib/network-status";
import { useDraftLeadStore } from "../../../features/leads/draft-store";
import { useToast } from "../../../components/molecules/Toast";
import { COLORS } from "../../../lib/constants";
import type { LeadFormValues } from "../../../features/leads/components/LeadForm";

export default function NewLeadScreen() {
  const router = useRouter();
  const createLead = useCreateLead();
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const saveDraft = useDraftLeadStore((s) => s.saveDraft);
  const toast = useToast();
  const isOnline = isConnected && isInternetReachable;

  const handleSubmit = useCallback(
    async (data: LeadFormValues) => {
      const payload = {
        name: data.name,
        contact_number: data.contact_number,
        email: data.email || undefined,
        location: data.location || undefined,
        property_type: data.property_type || undefined,
        budget_range: data.budget_range || undefined,
        source: data.source,
        design_style: data.design_style || undefined,
        scope_of_work: data.scope_of_work,
        notes: data.notes || undefined,
      };

      if (!isOnline) {
        // Offline: save as draft and enqueue for later sync
        try {
          await saveDraft(payload);
          toast.show("Lead saved locally. It will sync when you're back online.", "info");
          router.back();
        } catch {
          toast.show("Failed to save draft locally.", "error");
        }
        return;
      }

      // Online: normal API call
      createLead.mutate(payload, {
        onSuccess: () => {
          toast.show("Lead created successfully", "success");
          router.back();
        },
        onError: (error: any) => {
          // If the error is a network error, fall back to draft
          if (!error?.response) {
            saveDraft(payload).then(() => {
              toast.show("Network error. Lead saved locally and will sync when connected.", "info");
              router.back();
            });
            return;
          }
          const message =
            error?.response?.data?.detail ?? "Failed to create lead";
          toast.show(message, "error");
        },
      });
    },
    [createLead, router, isOnline, saveDraft]
  );

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#F8FAFC" }}>
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-3 border-b"
        style={{
          borderBottomColor: COLORS.border,
          backgroundColor: COLORS.background,
        }}
      >
        <Pressable onPress={handleGoBack} hitSlop={12} className="mr-3" accessibilityLabel="Go back" accessibilityRole="button">
          <ArrowLeft size={22} color={COLORS.text} />
        </Pressable>
        <Text className="text-lg font-bold" style={{ color: COLORS.text }}>
          New Lead
        </Text>
        {!isOnline && (
          <View className="flex-row items-center ml-auto" style={{ gap: 4 }}>
            <WifiOff size={14} color={COLORS.warning} />
            <Text style={{ color: COLORS.warning, fontSize: 11, fontWeight: "600" }}>
              Draft mode
            </Text>
          </View>
        )}
      </View>

      <LeadForm
        onSubmit={handleSubmit}
        isSubmitting={createLead.isPending}
        submitLabel={isOnline ? "Create Lead" : "Save Draft"}
      />
    </SafeAreaView>
  );
}
