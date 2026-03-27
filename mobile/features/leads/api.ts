import api from "../../lib/api";
import type {
  Lead,
  LeadActivity,
  LeadStatus,
  PaginatedResponse,
} from "../../types";

export interface FetchLeadsParams {
  skip?: number;
  limit?: number;
  status?: LeadStatus;
  search?: string;
}

export async function fetchLeads(
  params: FetchLeadsParams = {}
): Promise<PaginatedResponse<Lead>> {
  const { data } = await api.get("/crm/leads", {
    params: {
      skip: params.skip ?? 0,
      limit: params.limit ?? 20,
      ...(params.status ? { status: params.status } : {}),
      ...(params.search ? { search: params.search } : {}),
    },
  });
  // Handle both array and paginated responses
  if (Array.isArray(data)) {
    return { items: data, total: data.length };
  }
  if (data?.items) {
    return { items: data.items, total: data.total ?? data.items.length };
  }
  return { items: [], total: 0 };
}

export async function fetchLead(id: string): Promise<Lead> {
  const { data } = await api.get<Lead>(`/crm/leads/${id}`);
  return data;
}

export interface CreateLeadPayload {
  name: string;
  contact_number: string;
  email?: string;
  location?: string;
  property_type?: string;
  budget_range?: string;
  source: string;
  design_style?: string;
  scope_of_work?: string[];
  notes?: string;
}

export async function createLead(payload: CreateLeadPayload): Promise<Lead> {
  const { data } = await api.post<Lead>("/crm/leads", payload);
  return data;
}

export interface UpdateLeadPayload extends Partial<CreateLeadPayload> {
  status?: LeadStatus;
}

export async function updateLead(
  id: string,
  payload: UpdateLeadPayload
): Promise<Lead> {
  const { data } = await api.put<Lead>(`/crm/leads/${id}`, payload);
  return data;
}

export async function fetchLeadActivities(
  leadId: string
): Promise<LeadActivity[]> {
  const { data } = await api.get(
    `/crm/leads/${leadId}/activities`
  );
  // Handle both array and {items, total} responses
  if (Array.isArray(data)) return data;
  if (data?.items) return data.items;
  return [];
}

export interface CreateActivityPayload {
  type: string;
  description: string;
  date?: string;
}

export async function createLeadActivity(
  leadId: string,
  payload: CreateActivityPayload
): Promise<LeadActivity> {
  const { data } = await api.post<LeadActivity>(
    `/crm/leads/${leadId}/activities`,
    payload
  );
  return data;
}
