import React from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Text } from "../../../components/atoms/Text";
import { QuoteDetail } from "../../../features/quotes/components/QuoteDetail";
import { useQuote } from "../../../features/quotes/hooks";
import { COLORS } from "../../../lib/constants";

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: quote, isLoading, error } = useQuote(id ?? "");

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center bg-white"
        accessibilityLabel="Loading quotation details"
      >
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text variant="label" className="text-muted-foreground mt-3">
          Loading quotation...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !quote) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
        <Text variant="subtitle" weight="semibold" className="mb-2">
          Failed to load quotation
        </Text>
        <Text variant="label" className="text-muted-foreground text-center">
          {error instanceof Error
            ? error.message
            : "The quotation could not be found. Please try again."}
        </Text>
      </SafeAreaView>
    );
  }

  return <QuoteDetail quote={quote} />;
}
