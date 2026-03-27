import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  fetchLeads,
  fetchLead,
  createLead,
  updateLead,
  fetchLeadActivities,
  createLeadActivity,
} from "./api";
import type { FetchLeadsParams, CreateLeadPayload, UpdateLeadPayload, CreateActivityPayload } from "./api";
import type { LeadStatus } from "../../types";
import { useOrgId } from "../../lib/use-org-id";

interface UseLeadsFilters {
  status?: LeadStatus;
  search?: string;
}

export function useLeads(filters: UseLeadsFilters = {}) {
  const orgId = useOrgId();
  const limit = 20;

  return useInfiniteQuery({
    queryKey: ["leads", orgId, filters],
    queryFn: async ({ pageParam = 0 }) => {
      try {
        return await fetchLeads({
          skip: pageParam,
          limit,
          status: filters.status,
          search: filters.search,
        });
      } catch {
        return { items: [], total: 0 };
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.items?.length) return undefined;
      // If we got fewer items than requested, we've reached the end
      if (lastPage.items.length < limit) return undefined;
      const totalFetched = allPages.reduce(
        (sum, page) => sum + (page?.items?.length ?? 0),
        0
      );
      const total = lastPage?.total ?? 0;
      if (total <= 0 || totalFetched >= total) return undefined;
      return totalFetched;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 2,
  });
}

export function useLead(id: string | undefined) {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["lead", orgId, id],
    queryFn: () => fetchLead(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLeadPayload) => createLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadPayload }) =>
      updateLead(id, data),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useLeadActivities(leadId: string | undefined) {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["leadActivities", orgId, leadId],
    queryFn: () => fetchLeadActivities(leadId!),
    enabled: !!leadId,
    staleTime: 1000 * 60,
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      data,
    }: {
      leadId: string;
      data: CreateActivityPayload;
    }) => createLeadActivity(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["leadActivities"],
      });
    },
  });
}
