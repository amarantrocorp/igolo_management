import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTransactions,
  recordTransaction,
  verifyTransaction,
  fetchProjectWallet,
  fetchProjectsForFinance,
} from "./api";
import type { RecordTransactionPayload } from "./api";
import { useOrgId } from "../../lib/use-org-id";

export function useTransactions(projectId?: string) {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["transactions", orgId, projectId ?? "all"],
    queryFn: () => fetchTransactions(projectId),
    staleTime: 1000 * 60,
  });
}

export function useRecordTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: RecordTransactionPayload;
    }) => recordTransaction(projectId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({
        queryKey: ["project", variables.projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["projectWallet"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useVerifyTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) => verifyTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["projectWallet"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useProjectWallet(projectId: string | undefined) {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["projectWallet", orgId, projectId],
    queryFn: () => fetchProjectWallet(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60,
  });
}

export function useFinanceProjects() {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["financeProjects", orgId],
    queryFn: fetchProjectsForFinance,
    staleTime: 1000 * 60 * 5,
  });
}
