import { create } from "zustand";
import type { ExpertCareer, ExpertRegistry } from "@/features/ai-training/types/expert-registry";
import {
  getExpertCareers,
  syncExpertCareers,
  patchExpertCareer,
  deleteExpertCareer,
} from "@/features/ai-training/api/training-api";

interface ExpertRegistryState {
  registry: ExpertRegistry;
  loaded: boolean;
  setRegistry: (registry: ExpertRegistry) => void;
  loadFromServer: () => Promise<void>;
  syncToServer: (experts: ExpertCareer[]) => void;
  updateCareer: (id: string, updates: Partial<Pick<ExpertCareer, "name" | "isFavorite">>) => void;
  deleteCareer: (id: string) => void;
}

export const useExpertRegistryStore = create<ExpertRegistryState>((set, get) => ({
  registry: { version: 1, experts: [] },
  loaded: false,

  setRegistry: (registry) => set({ registry }),

  loadFromServer: async () => {
    if (get().loaded) return;
    try {
      const careers = await getExpertCareers();
      set({ registry: { version: 1, experts: careers }, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  syncToServer: (experts) => {
    syncExpertCareers(experts).catch(() => {});
  },

  updateCareer: (id, updates) => {
    set((state) => {
      const idx = state.registry.experts.findIndex((e) => e.id === id);
      if (idx === -1) return state;
      return {
        registry: {
          ...state.registry,
          experts: state.registry.experts.map((e, i) =>
            i === idx ? { ...e, ...updates } : e
          ),
        },
      };
    });
    patchExpertCareer(id, updates).catch(() => {});
  },

  deleteCareer: (id) => {
    set((state) => ({
      registry: {
        ...state.registry,
        experts: state.registry.experts.filter((e) => e.id !== id),
      },
    }));
    deleteExpertCareer(id).catch(() => {});
  },
}));
