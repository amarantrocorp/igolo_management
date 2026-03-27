import api from "../../lib/api";
import type {
  Project,
  Sprint,
  Transaction,
  PaginatedResponse,
  ProjectStatus,
} from "../../types";

export interface FetchProjectsParams {
  skip?: number;
  limit?: number;
  status?: ProjectStatus;
  search?: string;
}

export async function fetchProjects(
  params: FetchProjectsParams = {}
): Promise<PaginatedResponse<Project>> {
  const { data } = await api.get("/projects", {
    params: {
      skip: params.skip ?? 0,
      limit: params.limit ?? 20,
      ...(params.status ? { status: params.status } : {}),
      ...(params.search ? { search: params.search } : {}),
    },
  });

  // Handle both paginated and array responses
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: 1,
      page_size: data.length,
      total_pages: 1,
    };
  }

  return {
    items: data.items ?? [],
    total: data.total ?? 0,
    page: data.page ?? 1,
    page_size: data.page_size ?? 20,
    total_pages: data.total_pages ?? 1,
  };
}

export async function fetchProject(id: string): Promise<Project> {
  const { data } = await api.get<Project>(`/projects/${id}`);
  return data;
}

export interface UpdateProjectPayload {
  status?: ProjectStatus;
  start_date?: string;
  expected_end_date?: string;
}

export async function updateProject(
  id: string,
  payload: UpdateProjectPayload
): Promise<Project> {
  const { data } = await api.patch<Project>(`/projects/${id}`, payload);
  return data;
}

export interface UpdateSprintPayload {
  status?: string;
  completion_percentage?: number;
  start_date?: string;
  end_date?: string;
}

export async function updateSprint(
  projectId: string,
  sprintId: string,
  payload: UpdateSprintPayload
): Promise<Sprint> {
  const { data } = await api.patch<Sprint>(
    `/projects/${projectId}/sprints/${sprintId}`,
    payload
  );
  return data;
}

export async function fetchProjectTransactions(
  projectId: string
): Promise<Transaction[]> {
  try {
    const { data } = await api.get(`/finance/transactions`, {
      params: { project_id: projectId, limit: 20 },
    });

    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  } catch {
    return [];
  }
}
