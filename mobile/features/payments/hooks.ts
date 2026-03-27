import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  type CreateOrderPayload,
  type VerifyPaymentPayload,
} from "./api";

export function useCreateOrder() {
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => createRazorpayOrder(payload),
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VerifyPaymentPayload) =>
      verifyRazorpayPayment(payload),
    onSuccess: (_data, variables) => {
      // Refresh project data (wallet balance changes)
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({
        queryKey: ["project", variables.project_id],
      });
      // Refresh transaction lists
      queryClient.invalidateQueries({
        queryKey: ["projectTransactions", variables.project_id],
      });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      // Refresh dashboard stats
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
