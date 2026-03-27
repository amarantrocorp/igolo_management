import api from "../../lib/api";

// ─── Request / Response types ───────────────────────────────────

export interface CreateOrderPayload {
  project_id: string;
  amount: number;
}

export interface RazorpayOrder {
  order_id: string;
  key_id: string;
  amount_paise: number;
  currency: string;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  project_id: string;
  amount: number;
}

export interface VerifyPaymentResponse {
  success: boolean;
  transaction_id: string;
}

// ─── API calls ──────────────────────────────────────────────────

export async function createRazorpayOrder(
  payload: CreateOrderPayload
): Promise<RazorpayOrder> {
  const { data } = await api.post<RazorpayOrder>(
    "/payments/create-order",
    payload
  );
  return data;
}

export async function verifyRazorpayPayment(
  payload: VerifyPaymentPayload
): Promise<VerifyPaymentResponse> {
  const { data } = await api.post<VerifyPaymentResponse>(
    "/payments/verify",
    payload
  );
  return data;
}
