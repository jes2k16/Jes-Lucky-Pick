import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProfilePage } from "./ProfilePage";

vi.mock("@/features/profile/api/profileApi", () => ({
  fetchProfile: vi.fn().mockResolvedValue({
    id: "1",
    username: "testuser",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    phoneNumber: "+639123456789",
    bio: "A test user",
    profilePictureBase64: null,
  }),
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("ProfilePage", () => {
  it("renders the page title after loading", async () => {
    renderWithQueryClient(<ProfilePage />);
    expect(await screen.findByText("Profile")).toBeInTheDocument();
  });

  it("renders profile picture section", async () => {
    renderWithQueryClient(<ProfilePage />);
    expect(await screen.findByText("Profile Picture")).toBeInTheDocument();
  });

  it("renders account information section", async () => {
    renderWithQueryClient(<ProfilePage />);
    expect(await screen.findByText("Account Information")).toBeInTheDocument();
  });

  it("shows upload button", async () => {
    renderWithQueryClient(<ProfilePage />);
    expect(await screen.findByText("Upload")).toBeInTheDocument();
  });

  it("populates form fields with profile data", async () => {
    renderWithQueryClient(<ProfilePage />);
    const firstNameInput = await screen.findByPlaceholderText(
      "Enter first name"
    );
    expect(firstNameInput).toHaveValue("John");
  });

  it("shows save button", async () => {
    renderWithQueryClient(<ProfilePage />);
    expect(await screen.findByText("Save Changes")).toBeInTheDocument();
  });
});
