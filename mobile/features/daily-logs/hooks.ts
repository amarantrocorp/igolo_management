import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDailyLogs, createDailyLog, uploadPhoto } from "./api";
import type { CreateDailyLogPayload } from "./api";
import { useOrgId } from "../../lib/use-org-id";

export function useDailyLogs(projectId: string | undefined) {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["dailyLogs", orgId, projectId],
    queryFn: () => fetchDailyLogs(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateDailyLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: CreateDailyLogPayload;
    }) => createDailyLog(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dailyLogs"],
      });
    },
  });
}

export function useUploadPhoto() {
  return useMutation({
    mutationFn: ({
      fileUri,
      fileName,
      mimeType,
    }: {
      fileUri: string;
      fileName: string;
      mimeType?: string;
    }) => uploadPhoto(fileUri, fileName, mimeType),
  });
}
