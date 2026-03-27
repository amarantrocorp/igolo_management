import api from "../../lib/api";
import type { DailyLog } from "../../types";

export interface CreateDailyLogPayload {
  sprint_id: string;
  date: string;
  notes: string;
  images?: string[];
  blockers?: string;
  visible_to_client: boolean;
  progress_percentage?: number;
}

export async function fetchDailyLogs(projectId: string): Promise<DailyLog[]> {
  const { data } = await api.get<DailyLog[]>(
    `/projects/${projectId}/daily-logs`
  );
  return Array.isArray(data) ? data : [];
}

export async function createDailyLog(
  projectId: string,
  payload: CreateDailyLogPayload
): Promise<DailyLog> {
  const { data } = await api.post<DailyLog>(
    `/projects/${projectId}/daily-logs`,
    payload
  );
  return data;
}

export async function uploadPhoto(
  fileUri: string,
  fileName: string,
  mimeType: string = "image/jpeg"
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  const { data } = await api.post<{ url: string }>(
    "/upload?category=daily-logs",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return data;
}
