import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./constants", () => ({
  SUPABASE_URL: "https://session-test.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("stateless session verification with the installed Supabase SDK", () => {
  it("a rejected old token cannot clear the shared client's newer login", async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); },
    });
    vi.stubGlobal("BroadcastChannel", undefined);
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const token = [
      btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })),
      btoa(JSON.stringify({ sub: "account-a", exp: expiresAt })),
      btoa("test-signature"),
    ].join(".");
    const stored = {
      access_token: token,
      refresh_token: "new-session-refresh-token",
      expires_in: 3600,
      expires_at: expiresAt,
      token_type: "bearer",
      user: { id: "account-a", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-10-05T00:00:00Z" },
    };
    storage.set("sb-session-test-auth-token", JSON.stringify(stored));
    const fetcher = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ code: "session_not_found", message: "Session not found" }),
      { status: 403, headers: { "Content-Type": "application/json", "X-Supabase-Api-Version": "2024-01-01" } },
    ));
    vi.stubGlobal("fetch", fetcher);
    const { getAuthVerifier, getSupabase } = await import("./supabase-client");
    const client = getSupabase();
    const events: string[] = [];
    const { data: subscription } = client.auth.onAuthStateChange((event) => { events.push(event); });
    try {
      expect((await client.auth.getSession()).data.session?.access_token).toBe(token);
      const result = await getAuthVerifier().auth.getUser("old-revoked-token");
      expect(result.error?.name).toBe("AuthSessionMissingError");
      expect((await client.auth.getSession()).data.session?.access_token).toBe(token);
      expect(JSON.parse(storage.get("sb-session-test-auth-token")!).refresh_token).toBe(stored.refresh_token);
      expect(events).not.toContain("SIGNED_OUT");
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher.mock.calls[0][0]).toBe("https://session-test.supabase.co/auth/v1/user");
    } finally {
      subscription.subscription.unsubscribe();
      await client.auth.stopAutoRefresh();
    }
  });
});
