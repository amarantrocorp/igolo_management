import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTeams,
  fetchProjectsForPicker,
  logAttendance,
  fetchAttendanceLogs,
  fetchPayroll,
} from "./api";
import type { LogAttendancePayload, FetchAttendanceParams } from "./api";
import { useOrgId } from "../../lib/use-org-id";

export function useTeams() {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["laborTeams", orgId],
    queryFn: fetchTeams,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProjectsForPicker() {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["projectsForPicker", orgId],
    queryFn: fetchProjectsForPicker,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAttendanceLogs(params: FetchAttendanceParams = {}) {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["attendanceLogs", orgId, params],
    queryFn: () => fetchAttendanceLogs(params),
    staleTime: 1000 * 60 * 2,
  });
}

export function useLogAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LogAttendancePayload) => logAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendanceLogs"] });
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
  });
}

export function usePayroll(weekStart: string, weekEnd: string) {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["payroll", orgId, weekStart, weekEnd],
    queryFn: () => fetchPayroll(weekStart, weekEnd),
    enabled: !!weekStart && !!weekEnd,
    staleTime: 1000 * 60 * 2,
  });
}
