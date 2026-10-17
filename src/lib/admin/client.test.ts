import { AuthRetryableFetchError, AuthSessionMissingError } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ getSession: vi.fn(), signOut: vi.fn() }));
const verifier = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/lib/esports/supabase-client", () => ({
  getSupabase: () => ({ auth }),
  getAuthVerifier: () => ({ auth: verifier }),
}));

import { call } from "./client";

const session = { access_token: "request-token", user: { id: "account-a" } };
beforeEach(() => {
  vi.resetAllMocks();
  auth.getSession.mockResolvedValue({ data: { session }, error: null });
  auth.signOut.mockResolvedValue({ error: null });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
});
afterEach(() => vi.unstubAllGlobals());

describe("admin request authentication diagnosis", () => {
  it("keeps the server's non-admin/not-found 404 indistinguishable for a valid session", async () => {
    verifier.getUser.mockResolvedValue({ data: { user: session.user }, error: null });
    await expect(call("/api/admin/reports")).rejects.toMatchObject({ status: 404, message: "找不到" });
    expect(fetch).toHaveBeenCalledWith("/api/admin/reports", expect.objectContaining({
      headers: { Authorization: "Bearer request-token" },
    }));
    expect(verifier.getUser).toHaveBeenCalledWith("request-token");
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("reports a confirmed ended session as requiring sign-in and only signs out locally", async () => {
    verifier.getUser.mockResolvedValue({ data: { user: null }, error: new AuthSessionMissingError() });
    await expect(call("/api/admin/reports")).rejects.toMatchObject({ status: 401, message: "登入階段已失效，請重新登入" });
    expect(auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
  });

  it("reports an Auth outage as retryable without signing out", async () => {
    verifier.getUser.mockResolvedValue({ data: { user: null }, error: new AuthRetryableFetchError("unavailable", 503) });
    await expect(call("/api/admin/reports")).rejects.toMatchObject({ status: 503, message: "暫時無法確認登入狀態，請稍後重試" });
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("asks to retry after a same-account re-login rather than clearing its new session", async () => {
    verifier.getUser.mockImplementation(async () => {
      auth.getSession.mockResolvedValue({ data: { session: { ...session, access_token: "new-login-token" } }, error: null });
      return { data: { user: null }, error: new AuthSessionMissingError() };
    });
    await expect(call("/api/admin/reports")).rejects.toMatchObject({ status: 409, message: "登入狀態已更新，請重試" });
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("does not turn an unrelated server error into an authentication check", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: "service unavailable" }), { status: 503 }));
    await expect(call("/api/admin/reports")).rejects.toMatchObject({ status: 503, message: "service unavailable" });
    expect(verifier.getUser).not.toHaveBeenCalled();
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
