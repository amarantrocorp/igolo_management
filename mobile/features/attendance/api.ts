import api from "../../lib/api";
import type {
  LaborTeam,
  AttendanceLog,
  Project,
  PaginatedResponse,
} from "../../types";

// ============================================================
// Fetch labor teams
// ============================================================

export async function fetchTeams(): Promise<LaborTeam[]> {
  const { data } = await api.get("/labor/teams");

  if (Array.isArray(data)) return data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  return [];
}

// ============================================================
// Fetch projects (for project picker)
// ============================================================

export async function fetchProjectsForPicker(): Promise<Project[]> {
  const { data } = await api.get("/projects", {
    params: { skip: 0, limit: 100 },
  });

  if (Array.isArray(data)) return data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  return [];
}

// ============================================================
// Log attendance
// ============================================================

export interface LogAttendancePayload {
  project_id: string;
  sprint_id: string;
  team_id: string;
  date: string;
  workers_present: number;
  total_hours: number;
  notes?: string;
}

export async function logAttendance(
  payload: LogAttendancePayload
): Promise<AttendanceLog> {
  const { data } = await api.post<AttendanceLog>("/labor/attendance", payload);
  return data;
}

// ============================================================
// Fetch recent attendance logs
// ============================================================

export interface FetchAttendanceParams {
  project_id?: string;
  skip?: number;
  limit?: number;
}

export async function fetchAttendanceLogs(
  params: FetchAttendanceParams = {}
): Promise<AttendanceLog[]> {
  const { data } = await api.get("/labor/attendance", {
    params: {
      skip: params.skip ?? 0,
      limit: params.limit ?? 20,
      ...(params.project_id ? { project_id: params.project_id } : {}),
    },
  });

  if (Array.isArray(data)) return data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  return [];
}

// ============================================================
// Payroll summary
// ============================================================

export interface PayrollSummary {
  total_cost: number;
  total_hours: number;
  total_workers: number;
  logs: AttendanceLog[];
  by_team: {
    team_id: string;
    team_name: string;
    total_cost: number;
    total_hours: number;
    days_worked: number;
  }[];
}

export async function fetchPayroll(
  weekStart: string,
  weekEnd: string
): Promise<PayrollSummary> {
  const { data } = await api.get("/labor/payroll", {
    params: { week_start: weekStart, week_end: weekEnd },
  });
  return data;
}
