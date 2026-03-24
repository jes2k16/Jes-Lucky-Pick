import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HistoryPage } from "./HistoryPage";

vi.mock("@/features/history/api/drawsApi", () => ({
  fetchDraws: vi.fn().mockResolvedValue({
    items: [
      {
        id: "1",
        drawDate: "2026-03-20T13:00:00Z",
        dayOfWeek: "Friday",
        numbers: [5, 12, 23, 31, 38, 42],
        jackpotAmount: 10000000,
        winnersCount: 0,
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
  }),
  fetchLatestResults: vi.fn(),
  createDraw: vi.fn(),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("HistoryPage", () => {
  it("renders the page title", () => {
    renderWithQueryClient(<HistoryPage />);
    expect(screen.getByText("Draw History")).toBeInTheDocument();
  });

  it("renders the fetch latest results button", () => {
    renderWithQueryClient(<HistoryPage />);
    expect(screen.getByText("Fetch Latest Results")).toBeInTheDocument();
  });

  it("renders the manual entry button", () => {
    renderWithQueryClient(<HistoryPage />);
    expect(screen.getByText("Manual Entry")).toBeInTheDocument();
  });

  it("renders draw data when loaded", async () => {
    renderWithQueryClient(<HistoryPage />);
    expect(await screen.findByText("Friday")).toBeInTheDocument();
    // Date is locale-formatted; verify the jackpot amount renders
    expect(await screen.findByText("₱10,000,000")).toBeInTheDocument();
  });
});
