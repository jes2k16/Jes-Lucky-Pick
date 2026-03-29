import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useExpertRegistry } from "./useExpertRegistry";
import type { ExpertCareer } from "../types/expert-registry";
import * as trainingApi from "../api/training-api";

vi.mock("../api/training-api", () => ({
  getExpertCareers: vi.fn().mockResolvedValue([]),
  syncExpertCareers: vi.fn().mockResolvedValue(undefined),
  patchExpertCareer: vi.fn().mockResolvedValue(undefined),
}));

const mockGetExpertCareers = vi.mocked(trainingApi.getExpertCareers);
const mockPatchExpertCareer = vi.mocked(trainingApi.patchExpertCareer);

function makeCareer(overrides: Partial<ExpertCareer> = {}): ExpertCareer {
  return {
    id: overrides.id ?? "career-1",
    name: overrides.name ?? "Scout Alpha",
    personality: overrides.personality ?? "Scanner",
    gamesPlayed: overrides.gamesPlayed ?? 5,
    wins: overrides.wins ?? 1,
    eliminations: overrides.eliminations ?? 2,
    totalRoundsPlayed: overrides.totalRoundsPlayed ?? 20,
    bestEverScore: overrides.bestEverScore ?? 4,
    avgRoundScore: overrides.avgRoundScore ?? 2.5,
    lastPlayedAt: overrides.lastPlayedAt ?? "2026-03-01T10:00:00Z",
    isFavorite: overrides.isFavorite,
    byLottoGame: overrides.byLottoGame ?? {
      "6/42": {
        lottoGameCode: "6/42",
        gamesPlayed: 5,
        wins: 1,
        eliminations: 2,
        confidenceMap: { 1: 0.8, 2: 0.6, 3: 0.4 },
        gameMemories: [],
        careerSummary: null,
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetExpertCareers.mockResolvedValue([]);
});

describe("useExpertRegistry — updateCareer", () => {
  it("updates name in-memory and calls patchExpertCareer", async () => {
    const career = makeCareer({ id: "c1", name: "Original Name" });
    mockGetExpertCareers.mockResolvedValue([career]);

    const { result } = renderHook(() => useExpertRegistry());

    // Wait for mount fetch
    await waitFor(() =>
      expect(result.current.registry.experts).toHaveLength(1)
    );

    act(() => {
      result.current.updateCareer("c1", { name: "Updated Name" });
    });

    expect(result.current.registry.experts[0].name).toBe("Updated Name");
    expect(mockPatchExpertCareer).toHaveBeenCalledWith("c1", { name: "Updated Name" });
  });

  it("updates isFavorite in-memory and calls patchExpertCareer", async () => {
    const career = makeCareer({ id: "c1", isFavorite: false });
    mockGetExpertCareers.mockResolvedValue([career]);

    const { result } = renderHook(() => useExpertRegistry());

    await waitFor(() =>
      expect(result.current.registry.experts).toHaveLength(1)
    );

    act(() => {
      result.current.updateCareer("c1", { isFavorite: true });
    });

    expect(result.current.registry.experts[0].isFavorite).toBe(true);
    expect(mockPatchExpertCareer).toHaveBeenCalledWith("c1", { isFavorite: true });
  });

  it("is a no-op for unknown id", async () => {
    const career = makeCareer({ id: "c1", name: "Original" });
    mockGetExpertCareers.mockResolvedValue([career]);

    const { result } = renderHook(() => useExpertRegistry());

    await waitFor(() =>
      expect(result.current.registry.experts).toHaveLength(1)
    );

    act(() => {
      result.current.updateCareer("unknown-id", { name: "Changed" });
    });

    expect(result.current.registry.experts[0].name).toBe("Original");
  });
});

describe("useExpertRegistry — getCareerById", () => {
  it("returns correct career by id", async () => {
    const career = makeCareer({ id: "c1", name: "Target" });
    mockGetExpertCareers.mockResolvedValue([career]);

    const { result } = renderHook(() => useExpertRegistry());

    await waitFor(() =>
      expect(result.current.registry.experts).toHaveLength(1)
    );

    const found = result.current.getCareerById("c1");
    expect(found?.name).toBe("Target");
  });

  it("returns null for unknown id", async () => {
    mockGetExpertCareers.mockResolvedValue([makeCareer({ id: "c1" })]);

    const { result } = renderHook(() => useExpertRegistry());

    await waitFor(() =>
      expect(result.current.registry.experts).toHaveLength(1)
    );

    expect(result.current.getCareerById("unknown")).toBeNull();
  });
});
