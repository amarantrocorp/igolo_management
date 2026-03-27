import { useQuery } from "@tanstack/react-query";
import {
  fetchClientProjects,
  fetchClientDailyLogs,
  fetchClientDocuments,
} from "./api";
import { useOrgId } from "../../lib/use-org-id";

/**
 * Fetch the client's projects.
 */
export function useClientProjects() {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["client-projects", orgId],
    queryFn: fetchClientProjects,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Fetch daily logs visible to the client for a given project.
 */
export function useClientUpdates(projectId: string | undefined) {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["client-updates", orgId, projectId],
    queryFn: () => fetchClientDailyLogs(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60,
  });
}

/**
 * Fetch documents for a project.
 */
export function useClientDocuments(projectId: string | undefined) {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["client-documents", orgId, projectId],
    queryFn: () => fetchClientDocuments(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  });
}
