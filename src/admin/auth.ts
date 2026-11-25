import { useSyncExternalStore } from "react";

/**
 * Simple front-end login for the admin panel.
 *
 * IMPORTANT: this is a gate for a demo / internal tool, not real security -
 * the credentials below end up in the public JavaScript bundle. Before using
 * the panel with real customer data, move login to a backend
 * (Firebase Auth, Supabase Auth, Netlify Identity ...).
 */

const env = import.meta.env as Record<string, string | undefined>;
const USER = (env.VITE_ADMIN_USER ?? "").trim() || "admin";
const PASS = (env.VITE_ADMIN_PASS ?? "").trim() || "bfc@admin123";

const KEY = "bfc-admin-session";
const listeners = new Set<() => void>();

const read = (): boolean => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

let current = read();

function set(v: boolean) {
  current = v;
  try {
    if (v) sessionStorage.setItem(KEY, "1");
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function login(user: string, pass: string): boolean {
  const ok = user.trim().toLowerCase() === USER.toLowerCase() && pass === PASS;
  if (ok) set(true);
  return ok;
}

export const logout = () => set(false);

export function useAuthed(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => false
  );
}
