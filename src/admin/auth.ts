import { useSyncExternalStore } from "react";
import { hasSession, isRemote, signIn, signOut, subscribeSession } from "./supabase";

/**
 * Admin login.
 *
 * - With Supabase configured: real email + password login (Supabase Auth). The database
 *   itself only lets a signed-in team member read orders - this is real security.
 * - Without Supabase (local demo mode): a simple front-end gate using VITE_ADMIN_USER /
 *   VITE_ADMIN_PASS. Those end up in the public JS bundle, so it is NOT secure - demo only.
 */

export const LOGIN_USES_EMAIL = isRemote;

const env = import.meta.env as Record<string, string | undefined>;
const USER = (env.VITE_ADMIN_USER ?? "").trim() || "admin";
const PASS = (env.VITE_ADMIN_PASS ?? "").trim() || "bfc@admin123";

const KEY = "bfc-admin-session";
const listeners = new Set<() => void>();

const readLocal = (): boolean => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

let localAuthed = readLocal();

function setLocal(v: boolean) {
  localAuthed = v;
  try {
    if (v) sessionStorage.setItem(KEY, "1");
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

/** Resolves to an error message, or null when the login worked. */
export async function login(user: string, pass: string): Promise<string | null> {
  if (isRemote) {
    try {
      await signIn(user, pass);
      return null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      return /invalid login/i.test(msg) || !msg ? "Wrong email or password" : msg;
    }
  }
  if (user.trim().toLowerCase() === USER.toLowerCase() && pass === PASS) {
    setLocal(true);
    return null;
  }
  return "Wrong username or password";
}

export function logout(): void {
  if (isRemote) signOut();
  else setLocal(false);
}

function useRemoteAuthed(): boolean {
  return useSyncExternalStore(subscribeSession, hasSession, () => false);
}

function useLocalAuthed(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => localAuthed,
    () => false
  );
}

export const useAuthed: () => boolean = isRemote ? useRemoteAuthed : useLocalAuthed;
