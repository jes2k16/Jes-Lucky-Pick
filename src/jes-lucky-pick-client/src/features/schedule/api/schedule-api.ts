import apiClient from "@/lib/api-client";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ScheduleConfig {
  id: string;
  isEnabled: boolean;
  frequencyType: "daily" | "weekly";
  daysOfWeekMask: number; // Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
  timeSlots: string[]; // UTC HH:mm strings
  gameSettingsJson: string;
  updatedAtUtc: string;
}

export interface SaveSchedulePayload {
  isEnabled: boolean;
  frequencyType: "daily" | "weekly";
  daysOfWeekMask: number;
  timeSlots: string[]; // UTC HH:mm strings
  gameSettingsJson: string;
}

// ── Time conversion helpers ────────────────────────────────────────────────

/** Convert a local HH:mm time string to UTC HH:mm. */
export function localToUtcTime(localTime: string): string {
  const [h, m] = localTime.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Convert a UTC HH:mm time string to local HH:mm. */
export function utcToLocalTime(utcTime: string): string {
  const [h, m] = utcTime.split(":").map(Number);
  const d = new Date();
  d.setUTCHours(h, m, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── API calls ──────────────────────────────────────────────────────────────

export async function getSchedule(): Promise<ScheduleConfig | null> {
  const res = await apiClient.get<ScheduleConfig>("/schedule");
  if (res.status === 204) return null;
  return res.data;
}

export async function saveSchedule(
  payload: SaveSchedulePayload
): Promise<ScheduleConfig> {
  const res = await apiClient.put<ScheduleConfig>("/schedule", payload);
  return res.data;
}

// ── Schedule History ──────────────────────────────────────────────────────

export interface ScheduleHistoryItem {
  id: string;
  playedAt: string;
  result: string;
  winnerJson: string | null;
  totalRounds: number;
  durationSeconds: number;
  totalExperts: number;
  survivingExperts: number;
}

export interface ScheduleHistoryPage {
  items: ScheduleHistoryItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export async function getScheduleHistory(
  page: number,
  pageSize: number
): Promise<ScheduleHistoryPage> {
  // Hits the schedule-scoped endpoint which returns all scheduled sessions
  // across all users (the schedule is a shared singleton resource, and sessions
  // can be created by either the Hangfire cron (as admin) or any user via
  // "Trigger Now", so the history must span all users to be complete).
  const res = await apiClient.get<ScheduleHistoryPage>("/schedule/history", {
    params: { page, pageSize },
  });
  return res.data;
}
