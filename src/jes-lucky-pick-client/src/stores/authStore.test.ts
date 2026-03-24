import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./authStore";

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it("starts with no user and not authenticated", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("sets user and marks authenticated", () => {
    const user = { id: "1", username: "admin", email: "admin@test.com", role: "Admin", profilePictureBase64: null, firstName: null, lastName: null, phoneNumber: null, bio: null };
    useAuthStore.getState().setUser(user);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
  });

  it("clears user on logout", () => {
    const user = { id: "1", username: "admin", email: "admin@test.com", role: "Admin", profilePictureBase64: null, firstName: null, lastName: null, phoneNumber: null, bio: null };
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("sets isAuthenticated to false when user is null", () => {
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
