import api from "../../lib/api";
import type { Transaction, Project } from "../../types";

// ============================================================
// Fetch transactions (optionally filtered by project)
// ============================================================

export async function fetchTransactions(
  projectId?: string
): Promise<Transaction[]> {
  try {
    const params: Record<string, unknown> = { limit: 50 };
    if (projectId) {
      params.project_id = projectId;
    }

    const { data } = await api.get("/finance/transactions", { params });

    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  } catch {
    return [];
  }
}

// ============================================================
// Record a new transaction
// ============================================================

export interface RecordTransactionPayload {
  category: "INFLOW" | "OUTFLOW";
  source: "CLIENT" | "VENDOR" | "LABOR" | "PETTY_CASH";
  amount: number;
  description: string;
  reference_id?: string;
}

export async function recordTransaction(
  projectId: string,
  payload: RecordTransactionPayload
): Promise<Transaction> {
  const { data } = await api.post<Transaction>(
    `/projects/${projectId}/transactions`,
    payload
  );
  return data;
}

// ============================================================
// Verify (approve) a pending transaction
// ============================================================

export async function verifyTransaction(
  transactionId: string
): Promise<Transaction> {
  const { data } = await api.patch<Transaction>(
    `/finance/transactions/${transactionId}/verify`
  );
  return data;
}

// ============================================================
// Fetch project wallet (wallet is nested on the Project object)
// ============================================================

export async function fetchProjectWallet(
  projectId: string
): Promise<Project> {
  const { data } = await api.get<Project>(`/projects/${projectId}`);
  return data;
}

// ============================================================
// Fetch projects for the finance picker
// ============================================================

export async function fetchProjectsForFinance(): Promise<Project[]> {
  try {
    const { data } = await api.get("/projects", {
      params: { skip: 0, limit: 100 },
    });

    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  } catch {
    return [];
  }
}
