// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/esports/supabase-client", () => ({
  getSupabase: () => {
    throw new Error("not in tests");
  },
}));

import { AdminSignIn } from "./AdminSession";

function signInScreen() {
  render(<AdminSignIn title="後台" onSignIn={() => {}} notice={null} onError={() => {}} />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("AdminSignIn", () => {
  it("does not show the backend on the production site", () => {
    vi.stubEnv("NODE_ENV", "production");
    signInScreen();
    expect(screen.getByRole("button", { name: "使用 Apple 登入" })).toBeTruthy();
    expect(screen.queryByText(/後端/)).toBeNull();
    expect(screen.queryByRole("button", { name: "本機登入" })).toBeNull();
  });

  it("shows the backend under next dev, so a dev console pointed at production is visible", () => {
    vi.stubEnv("NODE_ENV", "development");
    signInScreen();
    expect(screen.getByText(/^後端：https?:\/\//)).toBeTruthy();
  });
});
