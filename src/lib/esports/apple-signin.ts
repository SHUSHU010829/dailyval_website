"use client";

// Sign in with Apple（網頁版）→ Supabase 的 id_token 流程。
// 與 iOS 同一套 nonce 規則：raw nonce 只給 Supabase，Apple 拿到的是
// sha256(raw)；Apple 會把它原封放進 id_token 的 nonce claim，Supabase
// 以 raw 重算雜湊比對。popup 模式不會導頁，redirectURI 只需是
// Apple Developer 上註冊過的網域路徑。

const APPLE_JS_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

interface AppleSignInResponse {
  authorization: { id_token: string; code: string; state?: string };
}

interface AppleIDGlobal {
  auth: {
    init(config: {
      clientId: string;
      scope: string;
      redirectURI: string;
      nonce: string;
      usePopup: boolean;
    }): void;
    signIn(): Promise<AppleSignInResponse>;
  };
}

declare global {
  interface Window {
    AppleID?: AppleIDGlobal;
  }
}

let loadPromise: Promise<AppleIDGlobal> | null = null;

function loadAppleJS(): Promise<AppleIDGlobal> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    if (window.AppleID) {
      resolve(window.AppleID);
      return;
    }
    const script = document.createElement("script");
    script.src = APPLE_JS_SRC;
    script.async = true;
    script.onload = () => {
      if (window.AppleID) resolve(window.AppleID);
      else reject(new Error("appleid.auth.js 載入後 window.AppleID 不存在"));
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("appleid.auth.js 載入失敗"));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

function randomNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class AppleSignInCancelled extends Error {}

/**
 * 跑完 Apple popup，回傳 id_token 與 raw nonce（給 signInWithIdToken）。
 * 使用者關掉 popup 丟 AppleSignInCancelled（呼叫端安靜處理）。
 */
export async function runAppleSignIn(): Promise<{ idToken: string; rawNonce: string }> {
  const clientId = process.env.NEXT_PUBLIC_APPLE_SERVICES_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_APPLE_SERVICES_ID 未設定");

  const appleID = await loadAppleJS();
  const rawNonce = randomNonce();
  const hashedNonce = await sha256Hex(rawNonce);

  appleID.auth.init({
    clientId,
    scope: "email",
    // popup 模式不導頁；此路徑仍須在 Apple Developer 的 Return URLs 註冊
    redirectURI: `${window.location.origin}/auth/apple`,
    nonce: hashedNonce,
    usePopup: true,
  });

  try {
    const response = await appleID.auth.signIn();
    return { idToken: response.authorization.id_token, rawNonce };
  } catch (error) {
    const code =
      error && typeof error === "object" ? (error as { error?: string }).error : null;
    if (code === "popup_closed_by_user" || code === "user_cancelled_authorize") {
      throw new AppleSignInCancelled();
    }
    throw new Error(typeof code === "string" ? code : "apple_signin_failed");
  }
}
