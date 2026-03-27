import api from "../../lib/api";
import type { Item, MaterialRequest, PaginatedResponse } from "../../types";

// ============================================================
// Fetch inventory items
// ============================================================

export async function fetchItems(): Promise<Item[]> {
  const { data } = await api.get("/inventory/items", {
    params: { skip: 0, limit: 200 },
  });

  if (Array.isArray(data)) return data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  return [];
}

// ============================================================
// Create material indent / request
// ============================================================

export interface CreateIndentPayload {
  project_id: string;
  sprint_id?: string;
  urgency: string;
  notes?: string;
  items: {
    item_id: string;
    quantity_requested: number;
    notes?: string;
  }[];
}

export async function createIndent(
  payload: CreateIndentPayload
): Promise<MaterialRequest> {
  const { data } = await api.post<MaterialRequest>(
    "/inventory/material-requests",
    payload
  );
  return data;
}

// ============================================================
// Fetch material requests
// ============================================================

export interface FetchIndentsParams {
  project_id?: string;
  skip?: number;
  limit?: number;
}

export async function fetchIndents(
  params: FetchIndentsParams = {}
): Promise<MaterialRequest[]> {
  const { data } = await api.get("/inventory/material-requests", {
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
