import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SettingsPage } from "./SettingsPage";

vi.mock("@/features/admin/api/settingsApi", () => ({
  fetchAiSettings: vi.fn().mockResolvedValue({
    isEnabled: false,
    model: "claude-sonnet-4-20250514",
  }),
  updateAiSettings: vi.fn(),
  fetchAiModels: vi.fn().mockResolvedValue([
    { id: "claude-sonnet-4-20250514", displayName: "Claude Sonnet 4 (Recommended)" },
    { id: "claude-opus-4-20250514", displayName: "Claude Opus 4" },
    { id: "claude-haiku-4-5-20251001", displayName: "Claude Haiku 4.5" },
  ]),
  testAiConnection: vi.fn(),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("SettingsPage", () => {
  it("renders settings heading", async () => {
    renderWithQueryClient(<SettingsPage />);
    expect(await screen.findByText("Settings")).toBeDefined();
  });

  it("renders AI Configuration card", async () => {
    renderWithQueryClient(<SettingsPage />);
    expect(await screen.findByText("AI Configuration")).toBeDefined();
  });

  it("renders save and test buttons", async () => {
    renderWithQueryClient(<SettingsPage />);
    expect(await screen.findByText("Save Settings")).toBeDefined();
    expect(await screen.findByText("Test Connection")).toBeDefined();
  });

  it("renders Claude CLI info banner", async () => {
    renderWithQueryClient(<SettingsPage />);
    expect(await screen.findByText("Using Claude CLI")).toBeDefined();
  });

  it("renders model selector", async () => {
    renderWithQueryClient(<SettingsPage />);
    expect(await screen.findByText("Model")).toBeDefined();
  });
});
