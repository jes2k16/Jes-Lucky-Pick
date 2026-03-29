import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { VeteranDetailModal } from "./VeteranDetailModal";
import type { ExpertCareer } from "../../types/expert-registry";

const mockUpdateCareer = vi.fn();
const mockGetCareerById = vi.fn();

vi.mock("../../hooks/useExpertRegistry", () => ({
  useExpertRegistry: () => ({
    getCareerById: mockGetCareerById,
    updateCareer: mockUpdateCareer,
    registry: { version: 1, experts: [] },
    getCareer: vi.fn(),
    getVeteranCount: vi.fn(),
    updateAfterGame: vi.fn(),
  }),
  buildSeededConfidenceMap: vi.fn(),
  buildCareerContext: vi.fn(),
}));

function makeCareer(overrides: Partial<ExpertCareer> = {}): ExpertCareer {
  return {
    id: "c1",
    name: "Scout Alpha",
    personality: "Scanner",
    gamesPlayed: 10,
    wins: 2,
    eliminations: 3,
    totalRoundsPlayed: 40,
    bestEverScore: 5,
    avgRoundScore: 3.2,
    lastPlayedAt: "2026-03-01T10:00:00Z",
    isFavorite: false,
    byLottoGame: {
      "6/42": {
        lottoGameCode: "6/42",
        gamesPlayed: 10,
        wins: 2,
        eliminations: 3,
        confidenceMap: { 7: 0.9, 14: 0.8, 21: 0.75, 28: 0.7, 35: 0.65 },
        gameMemories: [
          {
            gameId: "g1",
            playedAt: "2026-03-01T10:00:00Z",
            result: "won",
            roundsPlayed: 3,
            bestScore: 5,
            bestGuess: [7, 14, 21, 28, 35, 42],
            secretCombo: [7, 14, 21, 28, 35, 42],
            matchedNumbers: [7, 14],
            topConfidence: [7, 14, 21, 28, 35],
            bottomConfidence: [1, 2, 3, 4, 5],
            lesson: "Numbers 7 and 14 worked well.",
          },
        ],
        careerSummary: null,
      },
    },
    ...overrides,
  };
}

beforeEach(() => {
  mockUpdateCareer.mockClear();
  mockGetCareerById.mockReset();
});

describe("VeteranDetailModal", () => {
  it("does not render when careerId is null", () => {
    mockGetCareerById.mockReturnValue(null);
    const { container } = render(
      <VeteranDetailModal open={true} onOpenChange={vi.fn()} careerId={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders career name in dialog title when open", () => {
    mockGetCareerById.mockReturnValue(makeCareer({ name: "Scout Alpha" }));
    render(
      <VeteranDetailModal open={true} onOpenChange={vi.fn()} careerId="c1" />
    );
    expect(screen.getByText("Scout Alpha")).toBeInTheDocument();
  });

  it("renders personality badge", () => {
    mockGetCareerById.mockReturnValue(makeCareer({ personality: "Scanner" }));
    render(
      <VeteranDetailModal open={true} onOpenChange={vi.fn()} careerId="c1" />
    );
    expect(screen.getByText("Scanner")).toBeInTheDocument();
  });

  it("renders career stats cards", () => {
    mockGetCareerById.mockReturnValue(makeCareer({ gamesPlayed: 10, wins: 2 }));
    render(
      <VeteranDetailModal open={true} onOpenChange={vi.fn()} careerId="c1" />
    );
    expect(screen.getByText("Games Played")).toBeInTheDocument();
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("Best Score")).toBeInTheDocument();
    expect(screen.getByText("Avg Score")).toBeInTheDocument();
  });

  it("input shows current career name", () => {
    mockGetCareerById.mockReturnValue(makeCareer({ name: "Scout Alpha" }));
    render(
      <VeteranDetailModal open={true} onOpenChange={vi.fn()} careerId="c1" />
    );
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("Scout Alpha");
  });

  it("Save button calls updateCareer with trimmed name", async () => {
    mockGetCareerById.mockReturnValue(makeCareer({ name: "Scout Alpha" }));
    render(
      <VeteranDetailModal open={true} onOpenChange={vi.fn()} careerId="c1" />
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "  New Name  " } });

    const saveBtn = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveBtn);

    expect(mockUpdateCareer).toHaveBeenCalledWith("c1", { name: "New Name" });
  });

  it("shows 'Name updated' after saving and hides after timeout", async () => {
    vi.useFakeTimers();
    mockGetCareerById.mockReturnValue(makeCareer({ name: "Scout Alpha" }));
    render(
      <VeteranDetailModal open={true} onOpenChange={vi.fn()} careerId="c1" />
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "New Name" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByText("Name updated")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(screen.queryByText("Name updated")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("favorite star button calls updateCareer with toggled isFavorite", () => {
    mockGetCareerById.mockReturnValue(makeCareer({ isFavorite: false }));
    render(
      <VeteranDetailModal open={true} onOpenChange={vi.fn()} careerId="c1" />
    );

    const starBtn = screen.getByTitle("Mark as favorite");
    fireEvent.click(starBtn);

    expect(mockUpdateCareer).toHaveBeenCalledWith("c1", { isFavorite: true });
  });

  it("shows recent game memories", () => {
    mockGetCareerById.mockReturnValue(makeCareer());
    render(
      <VeteranDetailModal open={true} onOpenChange={vi.fn()} careerId="c1" />
    );
    // result "won" shows as "Won" badge
    expect(screen.getByText("Won")).toBeInTheDocument();
  });

  it("shows no games message when no memories", () => {
    const career = makeCareer();
    career.byLottoGame["6/42"].gameMemories = [];
    mockGetCareerById.mockReturnValue(career);
    render(
      <VeteranDetailModal open={true} onOpenChange={vi.fn()} careerId="c1" />
    );
    expect(
      screen.getByText("No games played for 6/42 yet.")
    ).toBeInTheDocument();
  });

  it("renders top hot numbers section", () => {
    mockGetCareerById.mockReturnValue(makeCareer());
    render(
      <VeteranDetailModal open={true} onOpenChange={vi.fn()} careerId="c1" />
    );
    expect(screen.getByText("Top 5 Hot Numbers")).toBeInTheDocument();
  });
});
