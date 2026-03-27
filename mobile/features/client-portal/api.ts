import api from "../../lib/api";
import type { Project, DailyLog, ProjectDocument } from "../../types";

/**
 * Fetch projects for the current client user.
 * The backend filters by the authenticated client automatically.
 */
export async function fetchClientProjects(): Promise<Project[]> {
  const { data } = await api.get("/projects", {
    params: { limit: 50 },
  });

  if (Array.isArray(data)) return data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * Fetch daily logs visible to the client for a specific project.
 * The backend returns only logs where visible_to_client = true.
 */
export async function fetchClientDailyLogs(
  projectId: string
): Promise<DailyLog[]> {
  try {
    const { data } = await api.get<DailyLog[]>(
      `/projects/${projectId}/daily-logs`
    );
    const logs = Array.isArray(data) ? data : [];
    // Filter client-visible logs on the client side as a safety net
    return logs.filter((log) => log.visible_to_client);
  } catch {
    return [];
  }
}

/**
 * Fetch documents for a project (drawings, contracts, reports, etc.).
 */
export async function fetchClientDocuments(
  projectId: string
): Promise<ProjectDocument[]> {
  try {
    const { data } = await api.get(`/projects/${projectId}/documents`);
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  } catch {
    return [];
  }
}
