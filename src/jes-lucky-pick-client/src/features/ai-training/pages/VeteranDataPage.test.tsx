import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { VeteranDataPage } from "./VeteranDataPage";
import type { ExpertCareer, ExpertRegistry } from "../types/expert-registry";

// Mock useExpertRegistry
const mockUpdateCareer = vi.fn();
const mockRegistry: ExpertRegistry = { version: 1, experts: [] };

vi.mock("../hooks/useExpertRegistry", () => ({
  useExpertRegistry: vi.fn(() => ({
    registry: mockRegistry,
    updateCareer: mockUpdateCareer,
    deduplicateRegistry: vi.fn(() => ({ fixed: 0, names: [] })),
    getCareerById: vi.fn(),
    getCareer: vi.fn(),
    getVeteranCount: vi.fn(),
    updateAfterGame: vi.fn(),
  })),
  buildSeededConfidenceMap: vi.fn(),
  buildCareerContext: vi.fn(),
}));

// Stub VeteranDetailModal to avoid deep rendering
vi.mock("../components/veterans/VeteranDetailModal", () => ({
  VeteranDetailModal: ({ open, careerId }: { open: boolean; careerId: string | null }) =>
    open ? (
      <div data-testid="veteran-modal">Modal: {careerId}</div>
    ) : null,
}));

function makeCareer(overrides: Partial<ExpertCareer> = {}): ExpertCareer {
  return {
    id: overrides.id ?? "c1",
    name: overrides.name ?? "Scout Alpha",
    personality: overrides.personality ?? "Scanner",
    gamesPlayed: overrides.gamesPlayed ?? 5,
    wins: overrides.wins ?? 1,
    eliminations: 1,
    totalRoundsPlayed: 20,
    bestEverScore: 4,
    avgRoundScore: 2.5,
    lastPlayedAt: "2026-03-01T10:00:00Z",
    isFavorite: overrides.isFavorite,
    byLottoGame: {
      "6/42": {
        lottoGameCode: "6/42",
        gamesPlayed: overrides.gamesPlayed ?? 5,
        wins: overrides.wins ?? 1,
        eliminations: 1,
        confidenceMap: {},
        gameMemories: [],
        careerSummary: null,
      },
    },
    ...overrides,
  };
}

function setRegistryExperts(experts: ExpertCareer[]) {
  mockRegistry.experts = experts;
}

describe("VeteranDataPage", () => {
  it("renders the page heading", () => {
    setRegistryExperts([]);
    render(<VeteranDataPage />);
    expect(screen.getByText("Veteran Data")).toBeInTheDocument();
  });

  it("shows empty state when no veterans", () => {
    setRegistryExperts([]);
    render(<VeteranDataPage />);
    expect(
      screen.getByText("No veterans yet. Play some training games first!")
    ).toBeInTheDocument();
  });

  it("shows table with veteran data when veterans exist", () => {
    setRegistryExperts([makeCareer({ name: "Scout Alpha" })]);
    render(<VeteranDataPage />);
    expect(screen.getByText("Scout Alpha")).toBeInTheDocument();
  });

  it("clicking star calls updateCareer with toggled isFavorite", () => {
    mockUpdateCareer.mockClear();
    setRegistryExperts([makeCareer({ id: "c1", isFavorite: false })]);
    render(<VeteranDataPage />);

    const starButtons = screen.getAllByRole("button");
    // The first ghost-icon button is the star
    const starBtn = starButtons.find(
      (b) => b.className.includes("ghost") || b.closest("td")
    );
    if (starBtn) fireEvent.click(starBtn);

    expect(mockUpdateCareer).toHaveBeenCalledWith("c1", { isFavorite: true });
  });

  it("clicking a row opens VeteranDetailModal", () => {
    setRegistryExperts([makeCareer({ id: "c1", name: "Scout Alpha" })]);
    render(<VeteranDataPage />);

    const row = screen.getByText("Scout Alpha").closest("tr");
    if (row) fireEvent.click(row);

    expect(screen.getByTestId("veteran-modal")).toBeInTheDocument();
  });

  it("favorites filter hides non-favorites", () => {
    setRegistryExperts([
      makeCareer({ id: "c1", name: "Fav Expert", isFavorite: true }),
      makeCareer({ id: "c2", name: "Normal Expert", isFavorite: false }),
    ]);
    render(<VeteranDataPage />);

    fireEvent.click(screen.getByRole("button", { name: /favorites/i }));

    expect(screen.getByText("Fav Expert")).toBeInTheDocument();
    expect(screen.queryByText("Normal Expert")).not.toBeInTheDocument();
  });

  it("personality filter shows only matching experts", () => {
    setRegistryExperts([
      makeCareer({ id: "c1", name: "Scanner Expert", personality: "Scanner" }),
      makeCareer({
        id: "c2",
        name: "Gambler Expert",
        personality: "Gambler",
        byLottoGame: {
          "6/42": {
            lottoGameCode: "6/42",
            gamesPlayed: 3,
            wins: 0,
            eliminations: 1,
            confidenceMap: {},
            gameMemories: [],
            careerSummary: null,
          },
        },
      }),
    ]);
    render(<VeteranDataPage />);

    fireEvent.click(screen.getByRole("button", { name: "Scanner" }));

    expect(screen.getByText("Scanner Expert")).toBeInTheDocument();
    expect(screen.queryByText("Gambler Expert")).not.toBeInTheDocument();
  });
});
