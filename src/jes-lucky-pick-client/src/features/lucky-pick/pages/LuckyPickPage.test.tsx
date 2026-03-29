import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LuckyPickPage } from "./LuckyPickPage";
import type { PaginatedResponse, PredictionHistoryItem, DrawContextDto } from "@/types/api";
import type { ExpertRegistry } from "@/features/ai-training/types/expert-registry";

vi.mock("@/features/lucky-pick/api/predictionApi", () => ({
  generatePrediction: vi.fn(),
  savePrediction: vi.fn(),
  generateAgentPrediction: vi.fn(),
  fetchDrawContext: vi.fn().mockResolvedValue({
    lastDraw: {
      drawDate: "2026-03-20T13:00:00Z",
      numbers: [5, 12, 23, 31, 38, 42],
      jackpotAmount: 10000000,
      winnersCount: 0,
    },
    schedule: { drawDays: "Tue,Thu,Sat" },
  } satisfies DrawContextDto),
  fetchPredictionHistory: vi.fn().mockResolvedValue({
    items: [
      {
        id: "1",
        numbers: [5, 12, 23, 31, 38, 42],
        confidenceScore: 72.5,
        strategy: "Combined",
        reasoning: "Test reasoning",
        createdAt: "2026-03-20T10:00:00Z",
        matchInfo: {
          drawDate: "2026-03-20T13:00:00Z",
          drawNumbers: [5, 12, 7, 8, 9, 10],
          matchedCount: 2,
          matchPercentage: 33.3,
        },
      },
      {
        id: "2",
        numbers: [1, 2, 3, 4, 5, 6],
        confidenceScore: 55.0,
        strategy: "Frequency",
        reasoning: "Frequency test",
        createdAt: "2026-03-19T10:00:00Z",
        matchInfo: null,
      },
    ] satisfies PredictionHistoryItem[],
    totalCount: 2,
    page: 1,
    pageSize: 10,
  } satisfies PaginatedResponse<PredictionHistoryItem>),
}));

// Mock useExpertRegistry with empty registry by default
const mockRegistry: ExpertRegistry = { version: 1, experts: [] };
vi.mock("@/features/ai-training/hooks/useExpertRegistry", () => ({
  useExpertRegistry: () => ({
    registry: mockRegistry,
    updateCareer: vi.fn(),
    getCareerById: vi.fn(),
    getCareer: vi.fn(),
    getVeteranCount: vi.fn(),
    updateAfterGame: vi.fn(),
  }),
  buildSeededConfidenceMap: vi.fn().mockReturnValue({}),
  buildCareerContext: vi.fn().mockReturnValue(""),
}));

vi.mock("@/features/ai-training/utils/strategies", () => ({
  executeStrategy: vi.fn().mockReturnValue([1, 2, 3, 4, 5, 6]),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("LuckyPickPage", () => {
  it("renders the generator section", () => {
    renderWithQueryClient(<LuckyPickPage />);
    expect(screen.getByText("Lucky Pick Generator")).toBeInTheDocument();
    expect(screen.getByText("Generate Lucky Numbers")).toBeInTheDocument();
  });

  it("renders the prediction history section", () => {
    renderWithQueryClient(<LuckyPickPage />);
    expect(screen.getByText("Prediction History")).toBeInTheDocument();
  });

  it("renders last draw results", async () => {
    renderWithQueryClient(<LuckyPickPage />);
    expect(await screen.findByText("Last Draw Results")).toBeInTheDocument();
  });

  it("renders next draw countdown", async () => {
    renderWithQueryClient(<LuckyPickPage />);
    expect(await screen.findByText("Next Draw")).toBeInTheDocument();
  });

  it("shows match percentage for predictions with match info", async () => {
    renderWithQueryClient(<LuckyPickPage />);
    expect(await screen.findByText("2/6 (33.3%)")).toBeInTheDocument();
  });

  it("shows awaiting draw for predictions without match info", async () => {
    renderWithQueryClient(<LuckyPickPage />);
    expect(await screen.findByText("Awaiting draw")).toBeInTheDocument();
  });

  it("shows strategy badge in history", async () => {
    renderWithQueryClient(<LuckyPickPage />);
    expect(await screen.findByText("Combined")).toBeInTheDocument();
    expect(await screen.findByText("Frequency")).toBeInTheDocument();
  });

  it("renders mode tabs: Standard, Simulation, AI Agent", () => {
    renderWithQueryClient(<LuckyPickPage />);
    expect(screen.getByRole("tab", { name: "Standard" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Simulation" })
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "AI Agent" })).toBeInTheDocument();
  });

  it("Standard tab shows strategy select, not personality select", () => {
    renderWithQueryClient(<LuckyPickPage />);
    // Standard is the default tab — strategy dropdown shown
    expect(screen.getByText("Strategy")).toBeInTheDocument();
    expect(screen.queryByText("Expert Personality")).not.toBeInTheDocument();
  });

  it("Simulation tab shows veteran combobox, not personality select", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<LuckyPickPage />);
    await user.click(screen.getByRole("tab", { name: "Simulation" }));
    expect(screen.getByText("Veteran Expert")).toBeInTheDocument();
    expect(screen.queryByText("Expert Personality")).not.toBeInTheDocument();
  });

  it("AI Agent tab shows model and veteran combobox, not personality select", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<LuckyPickPage />);
    await user.click(screen.getByRole("tab", { name: "AI Agent" }));
    expect(screen.queryByText("Expert Personality")).not.toBeInTheDocument();
    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(screen.getByText("Veteran Expert")).toBeInTheDocument();
  });

  it("veteran combobox shows no veteran note when no veterans exist", async () => {
    const user = userEvent.setup();
    mockRegistry.experts = [];
    renderWithQueryClient(<LuckyPickPage />);
    await user.click(screen.getByRole("tab", { name: "Simulation" }));
    expect(
      screen.getByText(
        /No veteran data for Scanner — using fresh confidence map/i
      )
    ).toBeInTheDocument();
  });
});
