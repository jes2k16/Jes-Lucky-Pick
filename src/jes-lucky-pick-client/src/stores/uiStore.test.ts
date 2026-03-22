import { describe, it, expect, beforeEach } from "vitest";
import { useUiStore } from "./uiStore";

describe("uiStore", () => {
  beforeEach(() => {
    useUiStore.setState({ theme: "light" });
  });

  it("toggleTheme switches between light and dark", () => {
    expect(useUiStore.getState().theme).toBe("light");

    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe("dark");

    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe("light");
  });

  it("setTheme sets specific theme", () => {
    useUiStore.getState().setTheme("dark");
    expect(useUiStore.getState().theme).toBe("dark");
  });
});
