import { create } from "zustand";

const STORAGE_KEY = "app-settings";
const DEFAULT_MAX_AGENT_COUNT = 8;

interface AppSettings {
  maxAgentCount: number;
}

interface AppSettingsState extends AppSettings {
  setMaxAgentCount: (value: number) => void;
}

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        maxAgentCount:
          typeof parsed.maxAgentCount === "number" && parsed.maxAgentCount >= 1
            ? parsed.maxAgentCount
            : DEFAULT_MAX_AGENT_COUNT,
      };
    }
  } catch {
    // ignore
  }
  return { maxAgentCount: DEFAULT_MAX_AGENT_COUNT };
}

function save(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export const useAppSettingsStore = create<AppSettingsState>((set, get) => ({
  ...load(),
  setMaxAgentCount: (value) => {
    const clamped = Math.max(1, Math.floor(value));
    set({ maxAgentCount: clamped });
    save({ ...get(), maxAgentCount: clamped });
  },
}));
