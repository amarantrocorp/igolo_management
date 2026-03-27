import api from "../../lib/api";
import type { Lead, Project } from "../../types";

export async function fetchLeadCount(): Promise<number> {
  try {
    const { data } = await api.get("/crm/leads", {
      params: { limit: 1 },
    });
    // Handle both paginated and array responses
    if (data?.total !== undefined) return data.total;
    if (Array.isArray(data)) return data.length;
    if (Array.isArray(data?.items)) return data.items.length;
    return 0;
  } catch {
    return 0;
  }
}

export async function fetchProjects(): Promise<Project[]> {
  try {
    const { data } = await api.get("/projects", {
      params: { limit: 50 },
    });
    // Handle both paginated and array responses
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  } catch {
    return [];
  }
}

export async function fetchNotificationCount(): Promise<number> {
  try {
    const { data } = await api.get<{ count: number }>(
      "/notifications/unread-count"
    );
    return data?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchRecentLeads(): Promise<Lead[]> {
  try {
    const { data } = await api.get("/crm/leads", {
      params: { limit: 5, sort: "-created_at" },
    });
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  } catch {
    return [];
  }
}
