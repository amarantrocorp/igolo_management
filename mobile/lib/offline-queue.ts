import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

const QUEUE_KEY = "igolo_offline_queue";

export type QueuedActionType =
  | "CREATE_LEAD"
  | "LOG_ATTENDANCE"
  | "CREATE_DAILY_LOG"
  | "RECORD_PAYMENT";

export interface QueuedAction {
  id: string;
  type: QueuedActionType;
  payload: any;
  endpoint: string;
  method: "POST" | "PUT" | "PATCH";
  createdAt: string;
  retries: number;
}

const MAX_RETRIES = 5;

/** In-memory cache so getQueueCount() doesn't hit AsyncStorage every time */
let cachedCount: number | null = null;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Save a new action to the offline queue */
export async function enqueueAction(
  action: Omit<QueuedAction, "id" | "retries" | "createdAt">
): Promise<QueuedAction> {
  const queued: QueuedAction = {
    ...action,
    id: generateId(),
    retries: 0,
    createdAt: new Date().toISOString(),
  };

  const queue = await getQueue();
  queue.push(queued);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  cachedCount = queue.length;
  return queued;
}

/** Get all queued actions */
export async function getQueue(): Promise<QueuedAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) {
      cachedCount = 0;
      return [];
    }
    const parsed = JSON.parse(raw) as QueuedAction[];
    cachedCount = parsed.length;
    return parsed;
  } catch {
    cachedCount = 0;
    return [];
  }
}

/** Remove a single action from the queue by id */
export async function dequeueAction(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((a) => a.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  cachedCount = filtered.length;
}

/** Get the number of items waiting in the queue (uses in-memory cache when available) */
export async function getQueueCount(): Promise<number> {
  if (cachedCount !== null) return cachedCount;
  const queue = await getQueue();
  return queue.length;
}

/** Sleep helper for exponential backoff */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Process the offline queue one item at a time.
 * Each item is dequeued from storage IMMEDIATELY after its API call succeeds,
 * so a crash mid-processing won't lose already-processed items.
 * Uses exponential backoff between retries (1s, 2s, 4s, 8s, ...).
 * Items that exceed MAX_RETRIES are discarded.
 * Returns { processed: number, failed: number }.
 */
export async function processQueue(): Promise<{
  processed: number;
  failed: number;
}> {
  let processed = 0;
  let failed = 0;

  // Process one-at-a-time by always reading the head of the queue.
  // This ensures each successful item is persisted-removed before moving on.
  while (true) {
    const queue = await getQueue();
    if (queue.length === 0) break;

    const action = queue[0];

    try {
      await api.request({
        url: action.endpoint,
        method: action.method,
        data: action.payload,
      });

      // Dequeue immediately after success -- crash-safe
      await dequeueAction(action.id);
      processed++;
    } catch (error: any) {
      // If it's a client error (4xx) other than 401/408/429, don't retry -- it will never succeed
      const status = error?.response?.status;
      const isPermanentFailure =
        status &&
        status >= 400 &&
        status < 500 &&
        status !== 401 &&
        status !== 408 &&
        status !== 429;

      if (isPermanentFailure) {
        await dequeueAction(action.id);
        failed++;
        continue;
      }

      // Transient error -- increment retries
      const newRetries = action.retries + 1;

      if (newRetries >= MAX_RETRIES) {
        // Exceeded max retries, discard
        await dequeueAction(action.id);
        failed++;
        continue;
      }

      // Update retry count in storage
      const currentQueue = await getQueue();
      const updatedQueue = currentQueue.map((a) =>
        a.id === action.id ? { ...a, retries: newRetries } : a
      );
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));
      cachedCount = updatedQueue.length;

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const backoffMs = Math.min(1000 * Math.pow(2, newRetries - 1), 16000);
      await sleep(backoffMs);
    }
  }

  return { processed, failed };
}

/** Clear the entire queue (use with caution) */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
  cachedCount = 0;
}
