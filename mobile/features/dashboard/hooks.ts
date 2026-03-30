import { useQuery } from "@tanstack/react-query";
import {
  fetchLeadCount,
  fetchProjects,
  fetchNotificationCount,
  fetchRecentLeads,
} from "./api";
import type { Project } from "../../types";
import { useOrgId } from "../../lib/use-org-id";
import { useAuthStore } from "../auth/store";

/** Roles that have access to CRM/leads endpoints */
const LEAD_ROLES = ["BDE", "SALES", "MANAGER", "SUPER_ADMIN"];

export function useDashboardStats() {
  const orgId = useOrgId();
  const roleInOrg = useAuthStore((s) => s.roleInOrg);
  const canViewLeads = LEAD_ROLES.includes(roleInOrg ?? "");

  const leadsQuery = useQuery({
    queryKey: ["dashboard", orgId, "leadCount"],
    queryFn: fetchLeadCount,
    staleTime: 1000 * 60 * 2,
    enabled: canViewLeads,
  });

  const projectsQuery = useQuery({
    queryKey: ["dashboard", orgId, "projects"],
    queryFn: fetchProjects,
    staleTime: 1000 * 60 * 2,
  });

  const notificationsQuery = useQuery({
    queryKey: ["dashboard", orgId, "notificationCount"],
    queryFn: fetchNotificationCount,
    staleTime: 1000 * 60,
  });

  const activeProjects =
    projectsQuery.data?.filter((p) => p.status === "IN_PROGRESS") ?? [];

  const pendingPayments =
    projectsQuery.data?.reduce((sum, p) => {
      if (p.wallet) {
        return sum + (p.wallet.total_agreed_value - p.wallet.total_received);
      }
      return sum;
    }, 0) ?? 0;

  const isLoading =
    (canViewLeads && leadsQuery.isLoading) ||
    projectsQuery.isLoading ||
    notificationsQuery.isLoading;

  const isRefetching =
    (canViewLeads && leadsQuery.isRefetching) ||
    projectsQuery.isRefetching ||
    notificationsQuery.isRefetching;

  function refetchAll() {
    if (canViewLeads) leadsQuery.refetch();
    projectsQuery.refetch();
    notificationsQuery.refetch();
  }

  return {
    canViewLeads,
    leadCount: leadsQuery.data ?? 0,
    projectCount: projectsQuery.data?.length ?? 0,
    activeProjectCount: activeProjects.length,
    notificationCount: notificationsQuery.data ?? 0,
    pendingPayments,
    activeProjects,
    isLoading,
    isRefetching,
    refetchAll,
  };
}

export function useRecentLeads() {
  const orgId = useOrgId();
  const roleInOrg = useAuthStore((s) => s.roleInOrg);
  const canViewLeads = LEAD_ROLES.includes(roleInOrg ?? "");

  return useQuery({
    queryKey: ["dashboard", orgId, "recentLeads"],
    queryFn: fetchRecentLeads,
    staleTime: 1000 * 60 * 2,
    enabled: canViewLeads,
  });
}

export function useActiveProjects() {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["dashboard", orgId, "projects"],
    queryFn: fetchProjects,
    staleTime: 1000 * 60 * 2,
    select: (projects: Project[]) =>
      projects.filter((p) => p.status === "IN_PROGRESS"),
  });
}
