import api from "../../lib/api";

// ============================================================
// Check-in types
// ============================================================

export interface CheckInData {
  project_id: string;
  latitude: number;
  longitude: number;
  notes?: string;
}

export interface CheckOutData {
  latitude: number;
  longitude: number;
}

export interface CheckInRecord {
  id: string;
  project_id: string;
  project_name?: string;
  user_id: string;
  latitude: number;
  longitude: number;
  checked_in_at: string;
  checked_out_at?: string;
  checkout_latitude?: number;
  checkout_longitude?: number;
  notes?: string;
  duration_minutes?: number;
  created_at: string;
}

// ============================================================
// Check in
// ============================================================

export async function checkIn(data: CheckInData): Promise<CheckInRecord> {
  const { data: res } = await api.post("/check-ins/check-in", data);
  return res;
}

// ============================================================
// Check out
// ============================================================

export async function checkOut(
  checkinId: string,
  data: CheckOutData
): Promise<CheckInRecord> {
  const { data: res } = await api.post(
    `/check-ins/check-out/${checkinId}`,
    data
  );
  return res;
}

// ============================================================
// Get active check-in (null if not checked in)
// ============================================================

export async function getActiveCheckIn(): Promise<CheckInRecord | null> {
  try {
    const { data } = await api.get("/check-ins/active");
    return data || null;
  } catch (error: any) {
    // 404 means no active check-in
    if (error?.response?.status === 404) return null;
    throw error;
  }
}

// ============================================================
// Today's check-ins
// ============================================================

export async function getTodayCheckIns(): Promise<CheckInRecord[]> {
  const { data } = await api.get("/check-ins/today");
  if (Array.isArray(data)) return data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  return [];
}
