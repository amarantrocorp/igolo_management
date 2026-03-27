import api from "../../lib/api";
import type { Quotation, PaginatedResponse } from "../../types";

export interface FetchQuotesParams {
  lead_id?: string;
  status?: string;
  skip?: number;
  limit?: number;
}

/**
 * Fetch a paginated list of quotations with optional filters.
 */
export async function fetchQuotes(
  params: FetchQuotesParams = {}
): Promise<PaginatedResponse<Quotation>> {
  const queryParams: Record<string, string> = {};

  if (params.lead_id) queryParams.lead_id = params.lead_id;
  if (params.status) queryParams.status = params.status;
  if (params.skip !== undefined) queryParams.skip = String(params.skip);
  if (params.limit !== undefined) queryParams.limit = String(params.limit);

  const { data } = await api.get("/quotes", {
    params: queryParams,
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

/**
 * Fetch a single quotation by ID, including rooms and items.
 */
export async function fetchQuote(id: string): Promise<Quotation> {
  const { data } = await api.get<Quotation>(`/quotes/${id}`);
  return data;
}

/**
 * Download the quotation PDF as an arraybuffer (blob).
 * Returns the raw response data for sharing via expo-sharing.
 */
export async function downloadQuotePDF(
  id: string
): Promise<{ data: ArrayBuffer; filename: string }> {
  const response = await api.get(`/quotes/${id}/pdf`, {
    responseType: "arraybuffer",
  });

  // Extract filename from content-disposition header if available
  const disposition = response.headers["content-disposition"];
  let filename = `quotation-${id.slice(0, 8)}.pdf`;
  if (disposition) {
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    if (match) {
      filename = match[1];
    }
  }

  return { data: response.data, filename };
}
