/**
 * Minimal Supabase client (plain fetch - no extra npm package).
 *
 * Needs two public values in .env / Netlify environment variables:
 *   VITE_SUPABASE_URL        e.g. https://abcd1234.supabase.co
 *   VITE_SUPABASE_ANON_KEY   the "anon" / "publishable" key (safe to expose - Row Level
 *                            Security in supabase/schema.sql is what protects the data)
 *
 * When they are missing the whole panel falls back to browser-only storage.
 */

const env = import.meta.env as Record<string, string | undefined>;

export const SB_URL = (env.VITE_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
export const SB_KEY = (env.VITE_SUPABASE_ANON_KEY ?? "").trim();
export const isRemote = SB_URL !== "" && SB_KEY !== "";

export class SbError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/* ---------- admin session (Supabase Auth, email + password) ---------- */

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
}

const SESSION_KEY = "bfc-admin-sb-session";
const sessionListeners = new Set<() => void>();

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Session>;
    if (typeof s.access_token === "string" && typeof s.refresh_token === "string" && typeof s.expires_at === "number") {
      return s as Session;
    }
  } catch {
    /* ignore */
  }
  return null;
}

let session: Session | null = typeof window === "undefined" ? null : readSession();

function setSession(next: Session | null) {
  session = next;
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  sessionListeners.forEach((l) => l());
}

export const hasSession = () => session !== null;

export function subscribeSession(cb: () => void): () => void {
  sessionListeners.add(cb);
  return () => sessionListeners.delete(cb);
}

async function tokenCall(grant: "password" | "refresh_token", body: Record<string, string>): Promise<Session> {
  const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=${grant}`, {
    method: "POST",
    headers: { apikey: SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !json || typeof json.access_token !== "string") {
    const msg = (json && (json.error_description ?? json.msg ?? json.message)) as string | undefined;
    throw new SbError(res.status, msg ?? "Sign in failed");
  }
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
  return {
    access_token: json.access_token,
    refresh_token: String(json.refresh_token ?? ""),
    expires_at: typeof json.expires_at === "number" ? json.expires_at : Math.floor(Date.now() / 1000) + expiresIn,
  };
}

export async function signIn(email: string, password: string): Promise<void> {
  setSession(await tokenCall("password", { email: email.trim(), password }));
}

export function signOut(): void {
  setSession(null);
}

let refreshing: Promise<string | null> | null = null;

async function accessToken(): Promise<string | null> {
  if (!session) return null;
  if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;
  if (!refreshing) {
    const old = session;
    refreshing = tokenCall("refresh_token", { refresh_token: old.refresh_token })
      .then((s) => {
        setSession(s);
        return s.access_token;
      })
      .catch((e: unknown) => {
        // refresh token rejected -> really signed out; a network blip keeps the session
        if (e instanceof SbError && e.status >= 400 && e.status < 500) {
          setSession(null);
          return null;
        }
        return old.access_token;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

/* ---------- REST (PostgREST) ---------- */

interface Opts {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  prefer?: string;
}

export async function sb<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { apikey: SB_KEY };
  const token = await accessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.prefer) headers.Prefer = opts.prefer;

  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });

  if (!res.ok) {
    let msg = "";
    try {
      msg = ((await res.json()) as { message?: string }).message ?? "";
    } catch {
      /* not json */
    }
    throw new SbError(res.status, msg || `Request failed (${res.status})`);
  }
  if (res.status === 204 || (opts.prefer ?? "").includes("return=minimal")) return undefined as T;
  return (await res.json()) as T;
}
