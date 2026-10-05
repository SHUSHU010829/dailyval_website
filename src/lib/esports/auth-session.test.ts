import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError, type Session } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithIdToken: vi.fn(),
}));
const verifier = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("./supabase-client", () => ({
  getSupabase: () => ({ auth }),
  getAuthVerifier: () => ({ auth: verifier }),
}));

import { SignOutFailedError, checkRejectedSession, signInWithPassword, signOutCurrentSession } from "./auth-session";
import { signInWithAppleIdToken, signOut } from "./rating-service";

function session(token = "old-token", uid = "account-a"): Session {
  return {
    access_token: token,
    refresh_token: `refresh-${token}`,
    expires_in: 3600,
    token_type: "bearer",
    user: { id: uid, email: "a@example.test", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-10-05T00:00:00Z" },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

let current: Session | null;
beforeEach(() => {
  vi.resetAllMocks();
  current = session();
  auth.getSession.mockImplementation(async () => ({ data: { session: current }, error: null }));
  auth.signOut.mockImplementation(async () => {
    current = null;
    return { error: null };
  });
  verifier.getUser.mockResolvedValue({ data: { user: null }, error: new AuthSessionMissingError() });
});
afterEach(() => vi.unstubAllGlobals());

describe("browser session sign-out", () => {
  it("the public rating-service sign-out only revokes this browser's session", async () => {
    await signOut();
    expect(auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
    expect(current).toBeNull();
  });

  it("does not leave the auth mutation queue blocked after a failed sign-in", async () => {
    auth.signInWithPassword.mockRejectedValueOnce(new TypeError("offline"));
    await expect(signInWithPassword("a@example.test", "password")).rejects.toThrow("offline");
    await signOutCurrentSession();
    expect(auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
  });

  it("treats a failed revoke as signed out when the SDK still cleared the browser session", async () => {
    auth.signOut.mockImplementationOnce(async () => {
      current = null;
      return { error: new AuthRetryableFetchError("offline", 0) };
    });
    await expect(signOutCurrentSession()).resolves.toBeUndefined();
  });

  it("reports a sign-out that left the browser session in place", async () => {
    const reason = new AuthRetryableFetchError("offline", 0);
    auth.signOut.mockResolvedValueOnce({ error: reason });
    const failure = await signOutCurrentSession().catch((err: unknown) => err);
    expect(failure).toBeInstanceOf(SignOutFailedError);
    expect((failure as SignOutFailedError).message).toBe("登出失敗，請確認網路後再試一次");
    expect((failure as SignOutFailedError).reason).toBe(reason);
    expect(current?.access_token).toBe("old-token");
  });

  it("reports a sign-out when the session cannot even be read back afterwards", async () => {
    auth.signOut.mockResolvedValueOnce({ error: new AuthRetryableFetchError("offline", 0) });
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: new AuthRetryableFetchError("offline", 0) });
    await expect(signOutCurrentSession()).rejects.toBeInstanceOf(SignOutFailedError);
  });

  it("wraps a sign-out that throws instead of returning an error", async () => {
    auth.signOut.mockRejectedValueOnce(new TypeError("locks unavailable"));
    await expect(signOutCurrentSession()).rejects.toBeInstanceOf(SignOutFailedError);
  });

  it("does not leave the auth mutation queue blocked after a failed sign-out", async () => {
    auth.signOut.mockResolvedValueOnce({ error: new AuthRetryableFetchError("offline", 0) });
    await expect(signOutCurrentSession()).rejects.toBeInstanceOf(SignOutFailedError);
    auth.signInWithPassword.mockResolvedValueOnce({ data: { session: current, user: current!.user }, error: null });
    await signInWithPassword("a@example.test", "password");
    expect(auth.signInWithPassword).toHaveBeenCalledOnce();
  });

  it("coordinates explicit auth changes across tabs with Web Locks when available", async () => {
    const request = vi.fn(async (_name: string, action: () => Promise<unknown>) => action());
    vi.stubGlobal("navigator", { locks: { request } });
    await signOutCurrentSession();
    expect(request).toHaveBeenCalledWith("dailyval-auth-session", expect.any(Function));
    expect(auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
  });

  it.each(["Apple", "password"])("a new %s login waits for an in-flight sign-out to finish clearing storage", async (provider) => {
    const started = deferred<void>();
    const release = deferred<void>();
    auth.signOut.mockImplementationOnce(async () => {
      started.resolve();
      await release.promise;
      current = null;
      return { error: null };
    });
    const completeLogin = async () => {
      current = session("new-token");
      return { data: { session: current, user: current.user }, error: null };
    };
    auth.signInWithIdToken.mockImplementation(completeLogin);
    auth.signInWithPassword.mockImplementation(completeLogin);

    const logout = signOutCurrentSession();
    await started.promise;
    const login = provider === "Apple"
      ? signInWithAppleIdToken("apple-token", "nonce")
      : signInWithPassword("a@example.test", "password");
    await Promise.resolve();
    expect(auth.signInWithIdToken).not.toHaveBeenCalled();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    release.resolve();
    await Promise.all([logout, login]);
    expect(current?.access_token).toBe("new-token");
  });
});

describe("rejected admin session", () => {
  it("keeps an authenticated non-admin signed in when the resource returns 404", async () => {
    verifier.getUser.mockResolvedValue({ data: { user: current!.user }, error: null });
    expect(await checkRejectedSession(session())).toBe("active");
    expect(verifier.getUser).toHaveBeenCalledWith("old-token");
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it.each([
    new AuthSessionMissingError(),
    new AuthApiError("expired", 403, "session_expired"),
    new AuthApiError("gone", 403, "user_not_found"),
  ])("cleans up only the browser session when it has definitively ended: %s", async (error) => {
    verifier.getUser.mockResolvedValue({ data: { user: null }, error });
    expect(await checkRejectedSession(session())).toBe("expired");
    expect(auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
  });

  it.each([
    new AuthRetryableFetchError("unavailable", 503),
    new AuthApiError("rate limited", 429, "over_request_rate_limit"),
    new AuthApiError("unknown unauthorized response", 401, undefined),
    new AuthApiError("bad jwt needs its own recovery", 403, "bad_jwt"),
    new AuthApiError("infrastructure failure", 503, "session_not_found"),
    new TypeError("Failed to fetch"),
    null,
  ])("preserves login for transient, unclassified or malformed verification failures: %s", async (error) => {
    verifier.getUser.mockResolvedValue({ data: { user: null }, error });
    expect(await checkRejectedSession(session())).toBe("unavailable");
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(current?.access_token).toBe("old-token");
  });

  it("preserves login when verification throws a transport error", async () => {
    verifier.getUser.mockRejectedValue(new TypeError("offline"));
    expect(await checkRejectedSession(session())).toBe("unavailable");
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("preserves login when checking the current session cannot reach Auth", async () => {
    auth.getSession.mockRejectedValue(new TypeError("offline"));
    expect(await checkRejectedSession(session())).toBe("unavailable");
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it.each([
    ["account-a", "new-login-token"],
    ["account-b", "other-account-token"],
    ["account-a", "refreshed-token"],
  ])("does not clear a replaced credential (%s / %s)", async (uid, token) => {
    const started = deferred<void>();
    const reply = deferred<unknown>();
    verifier.getUser.mockImplementationOnce(() => { started.resolve(); return reply.promise; });
    const check = checkRejectedSession(session());
    await started.promise;
    current = session(token, uid);
    reply.resolve({ data: { user: null }, error: new AuthSessionMissingError() });
    expect(await check).toBe("changed");
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(current.access_token).toBe(token);
  });

  it("still reports a confirmed ended session as expired when local cleanup fails", async () => {
    auth.signOut.mockResolvedValueOnce({ error: new AuthRetryableFetchError("offline", 0) });
    expect(await checkRejectedSession(session())).toBe("expired");
    expect(auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
  });

  it("coalesces the cleanup effect when concurrent requests reject the same session", async () => {
    expect(await Promise.all([
      checkRejectedSession(session()),
      checkRejectedSession(session()),
      checkRejectedSession(session()),
    ])).toEqual(["expired", "expired", "expired"]);
    expect(auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
  });
});
