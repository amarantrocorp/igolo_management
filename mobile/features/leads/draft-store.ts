import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { enqueueAction } from "../../lib/offline-queue";
import type { CreateLeadPayload } from "./api";

const DRAFTS_KEY = "igolo_lead_drafts";

export interface DraftLead {
  id: string;
  data: Partial<CreateLeadPayload>;
  createdAt: string;
  synced: boolean;
}

interface DraftLeadState {
  drafts: DraftLead[];
  isHydrated: boolean;
  isSyncing: boolean;

  /** Load drafts from AsyncStorage into memory */
  hydrate: () => Promise<void>;

  /** Save a new draft locally and enqueue it for sync */
  saveDraft: (data: Partial<CreateLeadPayload>) => Promise<DraftLead>;

  /** Get all drafts */
  getDrafts: () => DraftLead[];

  /** Remove a single draft by id */
  removeDraft: (id: string) => Promise<void>;

  /** Mark a draft as synced */
  markSynced: (id: string) => Promise<void>;

  /** Attempt to sync all un-synced drafts (enqueue them). Prevents concurrent calls. */
  syncDrafts: () => Promise<number>;
}

function generateDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

async function persistDrafts(drafts: DraftLead[]): Promise<void> {
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export const useDraftLeadStore = create<DraftLeadState>()((set, get) => ({
  drafts: [],
  isHydrated: false,
  isSyncing: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(DRAFTS_KEY);
      const drafts: DraftLead[] = raw ? JSON.parse(raw) : [];
      set({ drafts, isHydrated: true });
    } catch {
      set({ isHydrated: true });
    }
  },

  saveDraft: async (data) => {
    const draft: DraftLead = {
      id: generateDraftId(),
      data,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    // Enqueue for background sync when online
    await enqueueAction({
      type: "CREATE_LEAD",
      payload: data,
      endpoint: "/crm/leads",
      method: "POST",
    });

    const updated = [...get().drafts, draft];
    await persistDrafts(updated);
    set({ drafts: updated });

    return draft;
  },

  getDrafts: () => get().drafts,

  removeDraft: async (id) => {
    const updated = get().drafts.filter((d) => d.id !== id);
    await persistDrafts(updated);
    set({ drafts: updated });
  },

  markSynced: async (id) => {
    const updated = get().drafts.map((d) =>
      d.id === id ? { ...d, synced: true } : d
    );
    await persistDrafts(updated);
    set({ drafts: updated });
  },

  syncDrafts: async () => {
    // Prevent concurrent sync calls that could enqueue duplicates
    if (get().isSyncing) return 0;
    set({ isSyncing: true });

    try {
      const unsyncedDrafts = get().drafts.filter((d) => !d.synced);
      let enqueued = 0;

      for (const draft of unsyncedDrafts) {
        await enqueueAction({
          type: "CREATE_LEAD",
          payload: draft.data,
          endpoint: "/crm/leads",
          method: "POST",
        });
        enqueued++;
      }

      // Mark all as synced (they are now in the queue)
      if (enqueued > 0) {
        const updated = get().drafts.map((d) => ({ ...d, synced: true }));
        await persistDrafts(updated);
        set({ drafts: updated });
      }

      return enqueued;
    } finally {
      set({ isSyncing: false });
    }
  },
}));
