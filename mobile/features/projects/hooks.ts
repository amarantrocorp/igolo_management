import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  fetchProjects,
  fetchProject,
  updateProject,
  updateSprint,
  fetchProjectTransactions,
} from "./api";
import type { UpdateProjectPayload, UpdateSprintPayload } from "./api";
import type { ProjectStatus } from "../../types";
import { useOrgId } from "../../lib/use-org-id";

interface UseProjectsFilters {
  status?: ProjectStatus;
  search?: string;
}

export function useProjects(filters: UseProjectsFilters = {}) {
  const orgId = useOrgId();
  const limit = 20;

  return useInfiniteQuery({
    queryKey: ["projects", orgId, filters],
    queryFn: ({ pageParam = 0 }) =>
      fetchProjects({
        skip: pageParam,
        limit,
        status: filters.status,
        search: filters.search,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.items?.length) return undefined;
      // If we got fewer items than requested, we've reached the end
      if (lastPage.items.length < limit) return undefined;
      const totalFetched = allPages.reduce(
        (sum, page) => sum + (page?.items?.length ?? 0),
        0
      );
      if (totalFetched >= (lastPage.total ?? 0)) return undefined;
      return totalFetched;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 2,
  });
}

export function useProject(id: string | undefined) {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["project", orgId, id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectPayload }) =>
      updateProject(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      sprintId,
      data,
    }: {
      projectId: string;
      sprintId: string;
      data: UpdateSprintPayload;
    }) => updateSprint(projectId, sprintId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useProjectTransactions(projectId: string | undefined) {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["projectTransactions", orgId, projectId],
    queryFn: () => fetchProjectTransactions(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60,
  });
}
