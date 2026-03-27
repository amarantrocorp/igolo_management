import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { PaymentScreen } from "../../../features/payments/components/PaymentScreen";

export default function PaymentsPage() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <PaymentScreen />
    </SafeAreaView>
  );
}
