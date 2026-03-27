import React from "react";
import { View, FlatList } from "react-native";
import { CheckCircle, Clock, XCircle } from "lucide-react-native";
import { Text, Badge, Card } from "../../../components/atoms";
import { formatINR, formatDate } from "../../../lib/format";
import { COLORS } from "../../../lib/constants";
import type { Transaction } from "../../../types";

interface PaymentHistoryProps {
  transactions: Transaction[];
  loading?: boolean;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "CLEARED":
      return <CheckCircle size={18} color={COLORS.success} strokeWidth={2} />;
    case "REJECTED":
      return <XCircle size={18} color={COLORS.destructive} strokeWidth={2} />;
    default:
      return <Clock size={18} color={COLORS.warning} strokeWidth={2} />;
  }
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "CLEARED":
      return "success" as const;
    case "REJECTED":
      return "destructive" as const;
    default:
      return "warning" as const;
  }
}

function PaymentItem({ item }: { item: Transaction }) {
  return (
    <Card padding="sm" className="mb-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-3">
          <StatusIcon status={item.status} />
          <View className="ml-3 flex-1">
            <Text variant="body" weight="semibold">
              {formatINR(item.amount)}
            </Text>
            <Text variant="caption" className="text-muted-foreground mt-0.5">
              {formatDate(item.created_at)}
            </Text>
            {item.description ? (
              <Text
                variant="caption"
                className="text-muted-foreground mt-0.5"
                numberOfLines={1}
              >
                {item.description}
              </Text>
            ) : null}
          </View>
        </View>
        <View className="items-end">
          <Badge variant={statusBadgeVariant(item.status)}>{item.status}</Badge>
          {item.id ? (
            <Text variant="caption" className="text-muted-foreground mt-1">
              #{item.id.slice(0, 8)}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

export function PaymentHistory({ transactions, loading }: PaymentHistoryProps) {
  // Filter to only show client inflow transactions
  const payments = transactions.filter(
    (t) => t.category === "INFLOW" && t.source === "CLIENT"
  );

  if (!loading && payments.length === 0) {
    return (
      <View className="items-center py-8">
        <Clock size={40} color={COLORS.mutedForeground} strokeWidth={1.5} />
        <Text
          variant="body"
          className="text-muted-foreground mt-3 text-center"
        >
          No payments yet
        </Text>
        <Text
          variant="caption"
          className="text-muted-foreground mt-1 text-center"
        >
          Your payment history will appear here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={payments}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PaymentItem item={item} />}
      scrollEnabled={false}
      contentContainerStyle={{ paddingBottom: 8 }}
    />
  );
}
