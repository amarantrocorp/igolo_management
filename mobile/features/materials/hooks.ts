import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchItems,
  createIndent,
  fetchIndents,
} from "./api";
import type { CreateIndentPayload, FetchIndentsParams } from "./api";
import { useOrgId } from "../../lib/use-org-id";

export function useItems() {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["inventoryItems", orgId],
    queryFn: fetchItems,
    staleTime: 1000 * 60 * 5,
  });
}

export function useIndents(params: FetchIndentsParams = {}) {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["materialIndents", orgId, params],
    queryFn: () => fetchIndents(params),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateIndent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateIndentPayload) => createIndent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materialIndents"] });
    },
  });
}
