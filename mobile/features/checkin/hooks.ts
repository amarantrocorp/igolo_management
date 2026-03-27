import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  checkIn,
  checkOut,
  getActiveCheckIn,
  getTodayCheckIns,
} from "./api";
import type { CheckInData, CheckOutData } from "./api";
import { useOrgId } from "../../lib/use-org-id";

// ============================================================
// Active check-in (polls every 60s)
// ============================================================

export function useActiveCheckIn() {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["activeCheckIn", orgId],
    queryFn: getActiveCheckIn,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

// ============================================================
// Check-in mutation
// ============================================================

export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CheckInData) => checkIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeCheckIn"] });
      queryClient.invalidateQueries({ queryKey: ["todayCheckIns"] });
    },
  });
}

// ============================================================
// Check-out mutation
// ============================================================

export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      checkinId,
      data,
    }: {
      checkinId: string;
      data: CheckOutData;
    }) => checkOut(checkinId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeCheckIn"] });
      queryClient.invalidateQueries({ queryKey: ["todayCheckIns"] });
    },
  });
}

// ============================================================
// Today's check-ins
// ============================================================

export function useTodayCheckIns() {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["todayCheckIns", orgId],
    queryFn: getTodayCheckIns,
    staleTime: 1000 * 60 * 2,
  });
}
