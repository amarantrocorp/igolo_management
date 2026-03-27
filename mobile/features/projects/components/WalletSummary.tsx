import React from "react";
import { View, Text } from "react-native";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  CheckCircle,
  AlertCircle,
} from "lucide-react-native";
import { COLORS } from "../../../lib/constants";
import { formatINR } from "../../../lib/format";

interface WalletSummaryProps {
  totalAgreedValue: number;
  totalReceived: number;
  totalSpent: number;
  currentBalance: number;
  pendingApprovals?: number;
}

export default function WalletSummary({
  totalAgreedValue,
  totalReceived,
  totalSpent,
  currentBalance,
  pendingApprovals = 0,
}: WalletSummaryProps) {
  const effectiveBalance = currentBalance - pendingApprovals;
  const canSpend = effectiveBalance > 0;
  const receivedRatio =
    totalAgreedValue > 0 ? totalReceived / totalAgreedValue : 0;

  return (
    <View
      className="bg-white rounded-xl p-4"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      {/* Header */}
      <View className="flex-row items-center mb-3">
        <Wallet size={16} color={COLORS.gold} />
        <Text
          className="text-xs font-semibold uppercase tracking-wider ml-1.5"
          style={{ color: COLORS.mutedForeground }}
        >
          Project Wallet
        </Text>
      </View>

      {/* Total Agreed Value */}
      <View className="mb-3">
        <Text className="text-[10px]" style={{ color: COLORS.mutedForeground }}>
          Total Agreed Value
        </Text>
        <Text className="text-lg font-bold" style={{ color: COLORS.text }}>
          {formatINR(totalAgreedValue)}
        </Text>
      </View>

      {/* Received / Agreed progress bar */}
      <View className="mb-3">
        <View className="flex-row items-center justify-between mb-1">
          <Text
            className="text-[10px] font-medium"
            style={{ color: COLORS.mutedForeground }}
          >
            Received vs Agreed
          </Text>
          <Text
            className="text-[10px] font-medium"
            style={{ color: COLORS.mutedForeground }}
          >
            {Math.round(receivedRatio * 100)}%
          </Text>
        </View>
        <View
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: COLORS.border }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.min(Math.round(receivedRatio * 100), 100)}%`,
              backgroundColor: COLORS.success,
            }}
          />
        </View>
      </View>

      {/* Inflow / Outflow Row */}
      <View className="flex-row gap-3 mb-3">
        <View className="flex-1 bg-green-50 rounded-lg p-3">
          <View className="flex-row items-center mb-1">
            <ArrowDownCircle size={12} color={COLORS.success} />
            <Text
              className="text-[10px] ml-1"
              style={{ color: COLORS.mutedForeground }}
            >
              Received
            </Text>
          </View>
          <Text
            className="text-sm font-bold"
            style={{ color: COLORS.success }}
          >
            {formatINR(totalReceived)}
          </Text>
        </View>
        <View className="flex-1 bg-red-50 rounded-lg p-3">
          <View className="flex-row items-center mb-1">
            <ArrowUpCircle size={12} color={COLORS.destructive} />
            <Text
              className="text-[10px] ml-1"
              style={{ color: COLORS.mutedForeground }}
            >
              Spent
            </Text>
          </View>
          <Text
            className="text-sm font-bold"
            style={{ color: COLORS.destructive }}
          >
            {formatINR(totalSpent)}
          </Text>
        </View>
      </View>

      {/* Effective Balance + Can Spend */}
      <View
        className="flex-row items-center justify-between p-3 rounded-lg"
        style={{
          backgroundColor: canSpend ? "#F0FDF4" : "#FEF2F2",
        }}
      >
        <View>
          <Text
            className="text-[10px]"
            style={{ color: COLORS.mutedForeground }}
          >
            Effective Balance
          </Text>
          <Text
            className="text-sm font-bold"
            style={{ color: canSpend ? COLORS.success : COLORS.destructive }}
          >
            {formatINR(effectiveBalance)}
          </Text>
        </View>
        <View className="flex-row items-center">
          {canSpend ? (
            <>
              <CheckCircle size={14} color={COLORS.success} />
              <Text
                className="text-xs font-medium ml-1"
                style={{ color: COLORS.success }}
              >
                Can Spend
              </Text>
            </>
          ) : (
            <>
              <AlertCircle size={14} color={COLORS.destructive} />
              <Text
                className="text-xs font-medium ml-1"
                style={{ color: COLORS.destructive }}
              >
                Funds Low
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
