import { useSyncExternalStore } from "react";

/** The bell's list. Kept per browser; each order / booking is announced once. */

export interface Notice {
  id: string; // same as refId - one notice per order / booking
  kind: "order" | "booking";
  title: string;
  sub: string;
  at: string; // ISO - when the order / booking was placed
  read: boolean;
}

const KEY = "bfc-admin-notices-v1";
const MAX = 40;
const listeners = new Set<() => void>();

function read(): Notice[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v: unknown = JSON.parse(raw);
      if (Array.isArray(v)) return v as Notice[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

let items: Notice[] = typeof window === "undefined" ? [] : read();

function put(next: Notice[]) {
  items = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      items = read();
      listeners.forEach((l) => l());
    }
  });
}

export function useNotices(): Notice[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => items,
    () => items
  );
}

/** Adds notices that are not in the list yet. */
export function addNotices(list: Notice[]): void {
  const have = new Set(items.map((n) => n.id));
  const fresh = list.filter((n) => !have.has(n.id));
  if (fresh.length === 0) return;
  put([...fresh, ...items].sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX));
}

export function markRead(id: string): void {
  if (items.some((n) => n.id === id && !n.read)) put(items.map((n) => (n.id === id ? { ...n, read: true } : n)));
}

export function markAllRead(): void {
  if (items.some((n) => !n.read)) put(items.map((n) => ({ ...n, read: true })));
}

export function clearNotices(): void {
  put([]);
}
