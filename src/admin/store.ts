import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { DELIVERY_CHARGE, MENU, dishImage } from "../data/menu";
import type { Dish, MenuCategory } from "../data/menu";
import type { OrderType } from "../cart/order";
import { SbError, hasSession, isRemote, sb } from "./supabase";

/* =====================================================================
   BFC admin data layer
   ---------------------------------------------------------------------
   Everything is kept in this browser's localStorage and kept in sync
   between tabs (the customer site in one tab, the admin panel in another).

   To move to a real backend (Firebase / Supabase / your own API) only the
   `collection()` helper below has to change - every page uses the
   functions exported from this file and nothing else.
   ===================================================================== */

export type OrderStatus = "new" | "preparing" | "ready" | "completed" | "cancelled";
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface OrderLine {
  name: string;
  category: string;
  price: number;
  qty: number;
  from?: boolean;
}

export interface AdminOrder {
  id: string;
  type: OrderType;
  status: OrderStatus;
  name: string;
  phone: string;
  area: string;
  address: string;
  note: string;
  lines: OrderLine[];
  subtotal: number;
  fee: number;
  total: number;
  hasFrom: boolean;
  placedAt: string; // ISO
  updatedAt: string; // ISO
  /** set when an order is cancelled: by the customer on the website or by the team in the panel */
  cancelledBy?: "customer" | "team";
}

export interface AdminBooking {
  id: string;
  status: BookingStatus;
  name: string;
  phone: string;
  area: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  guests: number;
  note: string;
  lines: OrderLine[];
  subtotal: number;
  hasFrom: boolean;
  placedAt: string;
  updatedAt: string;
  cancelledBy?: "customer" | "team";
}

export interface AdminFeedback {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  rating: number; // 1-5 (0 = old feedback imported from the Google Sheet, no rating)
  /** the team switched it on for the website Reviews slider */
  featured: boolean;
  featuredAt?: string;
  placedAt: string;
  updatedAt: string;
}

/** What the public website is allowed to see of a feedback (no email / phone). */
export interface PublicReview {
  id: string;
  name: string;
  message: string;
  rating: number;
}

export interface ItemOverride {
  /** rename an original menu item */
  name?: string;
  /** move an original menu item to another category */
  categoryId?: string;
  price?: number;
  from?: boolean;
  desc?: string;
  image?: string;
  soldOut?: boolean;
  hidden?: boolean;
}

export interface CustomItem extends Dish {
  id: string;
  categoryId: string;
  soldOut?: boolean;
  hidden?: boolean;
}

export interface CustomCategory {
  id: string;
  title: string;
}

export interface MenuState {
  overrides: Record<string, ItemOverride>; // key = `${categoryId}::${itemName}`
  customItems: CustomItem[];
  customCategories: CustomCategory[];
}

export interface Settings {
  deliveryCharge: number;
  sound: boolean;
}

const KEYS = {
  orders: "bfc-admin-orders-v1",
  bookings: "bfc-admin-bookings-v1",
  menu: "bfc-admin-menu-v1",
  settings: "bfc-admin-settings-v1",
  feedback: "bfc-admin-feedback-v1",
} as const;

/* ---------- error channel (the layout shows these as toasts) ---------- */

const errorListeners = new Set<(msg: string) => void>();

export function onStoreError(cb: (msg: string) => void): () => void {
  errorListeners.add(cb);
  return () => {
    errorListeners.delete(cb);
  };
}

function reportError(e: unknown, what: string) {
  const detail = e instanceof SbError && e.status === 403 ? "not allowed - are you signed in?" : e instanceof Error ? e.message : "unknown error";
  errorListeners.forEach((l) => l(`${what}: ${detail}`));
}

/* ---------- collections ---------- */

interface Collection<T> {
  get: () => T;
  /** `strict` makes a failed save throw (used when a customer places an order). */
  set: (next: T, strict?: boolean) => Promise<void>;
  subscribe: (cb: () => void) => () => void;
  /** false until the first load from the shared database finished */
  loaded: () => boolean;
  clear?: () => Promise<void>;
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Runs `run` right away and then every `ms` while at least one component is subscribed. */
function poller(run: () => Promise<void>, ms: number) {
  let subs = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  const wake = () => {
    if (!document.hidden) void run();
  };
  return {
    start() {
      subs += 1;
      if (subs === 1) {
        void run();
        timer = setInterval(wake, ms);
        document.addEventListener("visibilitychange", wake);
      }
    },
    stop() {
      subs -= 1;
      if (subs === 0) {
        clearInterval(timer);
        document.removeEventListener("visibilitychange", wake);
      }
    },
  };
}

/** Browser-only storage (demo mode, no Supabase). Synced between tabs. */
function collection<T>(key: string, fallback: T, valid: (v: unknown) => v is T): Collection<T> {
  let cache: T | undefined;
  const listeners = new Set<() => void>();

  const read = (): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (valid(parsed)) return parsed;
      }
    } catch {
      /* storage unavailable or corrupted - fall back */
    }
    return fallback;
  };

  const emit = () => listeners.forEach((l) => l());

  if (typeof window !== "undefined") {
    // another tab (e.g. the customer site) wrote something
    window.addEventListener("storage", (e) => {
      if (e.key === key || e.key === null) {
        cache = undefined;
        emit();
      }
    });
  }

  const set = (next: T): Promise<void> => {
    cache = next;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* storage full / blocked - keep the in-memory copy */
    }
    emit();
    return Promise.resolve();
  };

  return {
    get: () => {
      if (cache === undefined) cache = read();
      return cache;
    },
    set,
    subscribe: (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    loaded: () => true,
    clear: () => set(fallback),
  };
}

interface Row {
  id: string;
  placedAt: string;
  updatedAt: string;
}

/**
 * Orders / bookings in the shared Supabase table. Only signed-in team members can read them
 * (Row Level Security); customers can only insert. `set()` diffs old vs new and sends the changes.
 */
function remoteTable<T extends Row>(table: string): Collection<T[]> {
  let items: T[] = [];
  let isLoaded = false;
  let pending = 0;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  const same = (a: T[], b: T[]) => a.length === b.length && a.every((x, i) => x.id === b[i].id && x.updatedAt === b[i].updatedAt);

  async function pull() {
    if (pending > 0 || !hasSession()) return;
    try {
      const rows = await sb<{ data: T }[]>(`${table}?select=data&order=created_at.desc&limit=1000`);
      if (pending > 0) return; // a save started meanwhile - its result is newer
      const list = rows.map((r) => r.data).sort((a, b) => b.placedAt.localeCompare(a.placedAt));
      const first = !isLoaded;
      isLoaded = true;
      if (first || !same(list, items)) {
        items = list;
        emit();
      }
    } catch {
      /* offline or signed out - try again on the next tick */
    }
  }

  const p = poller(pull, 4000);

  return {
    get: () => items,
    set: async (next, strict = false) => {
      const prev = items;
      const prevMap = new Map(prev.map((x) => [x.id, x]));
      const nextIds = new Set(next.map((x) => x.id));
      items = next;
      emit();

      const jobs: Promise<unknown>[] = [];
      for (const x of next) {
        const old = prevMap.get(x.id);
        if (!old) {
          jobs.push(
            sb(table, { method: "POST", body: { id: x.id, data: x }, prefer: "return=minimal" }).catch((e: unknown) => {
              if (e instanceof SbError && e.status === 409) return; // already saved (retry)
              throw e;
            })
          );
        } else if (old !== x) {
          jobs.push(sb(`${table}?id=eq.${encodeURIComponent(x.id)}`, { method: "PATCH", body: { data: x }, prefer: "return=minimal" }));
        }
      }
      for (const old of prev) {
        if (!nextIds.has(old.id)) jobs.push(sb(`${table}?id=eq.${encodeURIComponent(old.id)}`, { method: "DELETE" }));
      }
      if (jobs.length === 0) return;

      pending += 1;
      try {
        await Promise.all(jobs);
      } catch (e) {
        items = prev;
        emit();
        reportError(e, "Could not save");
        if (strict) throw e;
      } finally {
        pending -= 1;
      }
      if (hasSession()) void pull();
    },
    subscribe: (cb) => {
      listeners.add(cb);
      p.start();
      return () => {
        listeners.delete(cb);
        p.stop();
      };
    },
    loaded: () => isLoaded,
    clear: async () => {
      const prev = items;
      items = [];
      emit();
      pending += 1;
      try {
        await sb(`${table}?id=not.is.null`, { method: "DELETE" });
      } catch (e) {
        items = prev;
        emit();
        reportError(e, "Could not clear");
      } finally {
        pending -= 1;
      }
    },
  };
}

/**
 * Small shared settings (menu edits, delivery charge) in the `kv` table. Everyone can read them
 * (the public website needs the live menu), only signed-in team members can write.
 */
function remoteKv<T>(key: string, fallback: T, valid: (v: unknown) => v is T): Collection<T> {
  const cacheKey = `bfc-kv-${key}`;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  let isLoaded = false;
  let pending = 0;
  let asked = false;

  const readCache = (): T => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (valid(parsed)) return parsed;
      }
    } catch {
      /* ignore */
    }
    return fallback;
  };
  const writeCache = (v: T) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  };

  // paint instantly from the last known value, then refresh from the database
  let value: T = typeof window === "undefined" ? fallback : readCache();

  async function pull() {
    if (pending > 0) return;
    try {
      const rows = await sb<{ value: unknown }[]>(`kv?select=value&key=eq.${encodeURIComponent(key)}`);
      if (pending > 0) return;
      isLoaded = true;
      const row = rows[0];
      if (row && valid(row.value) && !sameJson(row.value, value)) {
        value = row.value;
        writeCache(value);
        emit();
      }
    } catch {
      /* offline - keep the cached value */
    }
  }

  const p = poller(pull, 30000);

  return {
    get: () => {
      if (!asked && typeof window !== "undefined") {
        asked = true;
        void pull();
      }
      return value;
    },
    set: async (next, strict = false) => {
      const prev = value;
      value = next;
      writeCache(next);
      emit();
      pending += 1;
      try {
        await sb("kv?on_conflict=key", {
          method: "POST",
          body: { key, value: next, updated_at: new Date().toISOString() },
          prefer: "resolution=merge-duplicates,return=minimal",
        });
      } catch (e) {
        value = prev;
        writeCache(prev);
        emit();
        reportError(e, "Could not save");
        if (strict) throw e;
      } finally {
        pending -= 1;
      }
    },
    subscribe: (cb) => {
      listeners.add(cb);
      p.start();
      return () => {
        listeners.delete(cb);
        p.stop();
      };
    },
    loaded: () => isLoaded,
  };
}

const isArray = (v: unknown): v is never[] => Array.isArray(v);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const EMPTY_MENU: MenuState = { overrides: {}, customItems: [], customCategories: [] };
const DEFAULT_SETTINGS: Settings = { deliveryCharge: DELIVERY_CHARGE, sound: true };

const validMenu = (v: unknown): v is MenuState => isObject(v) && isObject(v.overrides) && Array.isArray(v.customItems) && Array.isArray(v.customCategories);
const validSettings = (v: unknown): v is Settings => isObject(v) && typeof v.deliveryCharge === "number";

const ordersStore: Collection<AdminOrder[]> = isRemote
  ? remoteTable<AdminOrder>("orders")
  : collection<AdminOrder[]>(KEYS.orders, [], isArray as (v: unknown) => v is AdminOrder[]);
const bookingsStore: Collection<AdminBooking[]> = isRemote
  ? remoteTable<AdminBooking>("bookings")
  : collection<AdminBooking[]>(KEYS.bookings, [], isArray as (v: unknown) => v is AdminBooking[]);
const feedbackStore: Collection<AdminFeedback[]> = isRemote
  ? remoteTable<AdminFeedback>("feedbacks")
  : collection<AdminFeedback[]>(KEYS.feedback, [], isArray as (v: unknown) => v is AdminFeedback[]);
const menuStore: Collection<MenuState> = isRemote
  ? remoteKv<MenuState>("menu", EMPTY_MENU, validMenu)
  : collection<MenuState>(KEYS.menu, EMPTY_MENU, validMenu);
const settingsStore: Collection<Settings> = isRemote
  ? remoteKv<Settings>("settings", DEFAULT_SETTINGS, validSettings)
  : collection<Settings>(KEYS.settings, DEFAULT_SETTINGS, validSettings);

function hook<T>(c: Collection<T>): T {
  return useSyncExternalStore(c.subscribe, c.get, c.get);
}

/** true once orders have been loaded (always true in browser-only mode) */
export function useOrdersReady(): boolean {
  return useSyncExternalStore(ordersStore.subscribe, ordersStore.loaded, () => false);
}

export const useOrders = () => hook(ordersStore);
export const useBookings = () => hook(bookingsStore);
export const useFeedbacks = () => hook(feedbackStore);
export const useMenuState = () => hook(menuStore);
export const useSettings = () => hook(settingsStore);

const nowIso = () => new Date().toISOString();

/* ---------- orders ---------- */

/** Saves a new customer order. With Supabase this throws when the order could not be saved. */
export function recordOrder(
  o: Omit<AdminOrder, "status" | "placedAt" | "updatedAt"> & Partial<Pick<AdminOrder, "placedAt">>
): Promise<void> {
  const at = nowIso();
  const order: AdminOrder = { ...o, status: "new", placedAt: o.placedAt ?? at, updatedAt: at };
  return ordersStore.set([order, ...ordersStore.get().filter((x) => x.id !== order.id)], true);
}

export function setOrderStatus(id: string, status: OrderStatus): void {
  ordersStore.set(ordersStore.get().map((o) => (o.id === id ? { ...o, status, updatedAt: nowIso(), cancelledBy: status === "cancelled" ? "team" : undefined } : o)));
}

export function deleteOrder(id: string): void {
  ordersStore.set(ordersStore.get().filter((o) => o.id !== id));
}

/* ---------- bookings ---------- */

export function recordBooking(
  b: Omit<AdminBooking, "status" | "placedAt" | "updatedAt"> & Partial<Pick<AdminBooking, "placedAt">>
): Promise<void> {
  const at = nowIso();
  const booking: AdminBooking = { ...b, status: "pending", placedAt: b.placedAt ?? at, updatedAt: at };
  return bookingsStore.set([booking, ...bookingsStore.get().filter((x) => x.id !== booking.id)], true);
}

export function setBookingStatus(id: string, status: BookingStatus): void {
  bookingsStore.set(bookingsStore.get().map((b) => (b.id === id ? { ...b, status, updatedAt: nowIso(), cancelledBy: status === "cancelled" ? "team" : undefined } : b)));
}

export function deleteBooking(id: string): void {
  bookingsStore.set(bookingsStore.get().filter((b) => b.id !== id));
}


/* ---------- customer self-cancel (website) ---------- */

export type CancelResult = "ok" | "already_cancelled" | "too_late" | "not_found" | "error";

const last10 = (v: string) => v.replace(/\D/g, "").slice(-10);

/**
 * A customer cancels their own order / table booking with the order ID + the phone number used.
 * Only works while it is still "new" (booking: "pending"). With Supabase this calls the
 * `cancel_my_order` database function (see supabase/schema.sql) - customers never get read access.
 */
export async function cancelMyOrder(id: string, phone: string): Promise<CancelResult> {
  const cleanId = id.trim().toUpperCase();
  if (!cleanId || last10(phone).length < 10) return "not_found";

  if (isRemote) {
    try {
      const res = await sb<string>("rpc/cancel_my_order", { method: "POST", body: { p_id: cleanId, p_phone: phone } });
      return res === "ok" || res === "already_cancelled" || res === "too_late" || res === "not_found" ? res : "error";
    } catch {
      return "error";
    }
  }

  // browser-only (demo) mode
  const isBooking = cleanId.startsWith("TBL-");
  const list: (AdminOrder | AdminBooking)[] = isBooking ? bookingsStore.get() : ordersStore.get();
  const hit = list.find((x) => x.id === cleanId && last10(x.phone) === last10(phone));
  if (!hit) return "not_found";
  if (hit.status === "cancelled") return "already_cancelled";
  if (hit.status !== (isBooking ? "pending" : "new")) return "too_late";
  if (isBooking) setBookingStatus(hit.id, "cancelled");
  else setOrderStatus(hit.id, "cancelled");
  // mark who cancelled
  const mark = <T extends { id: string }>(arr: T[]) => arr.map((x) => (x.id === hit.id ? { ...x, cancelledBy: "customer" as const } : x));
  if (isBooking) void bookingsStore.set(mark(bookingsStore.get() as AdminBooking[]));
  else void ordersStore.set(mark(ordersStore.get() as AdminOrder[]));
  return "ok";
}

export interface MyOrder {
  id: string;
  kind: "order" | "booking";
  type?: OrderType;
  status: string;
  area: string;
  lines: OrderLine[];
  subtotal: number;
  fee?: number;
  total?: number;
  placedAt: string;
  date?: string;
  time?: string;
  guests?: number;
  cancelledBy?: "customer" | "team";
}

/** Everything this phone number ordered / booked recently (customer "My Orders"). null = could not load. */
export async function findMyOrders(phone: string): Promise<MyOrder[] | null> {
  if (last10(phone).length < 10) return [];

  if (isRemote) {
    try {
      const rows = await sb<MyOrder[]>("rpc/my_orders", { method: "POST", body: { p_phone: phone } });
      return Array.isArray(rows) ? rows : [];
    } catch {
      return null;
    }
  }

  // browser-only (demo) mode
  const orders: MyOrder[] = ordersStore
    .get()
    .filter((o) => last10(o.phone) === last10(phone))
    .map((o) => ({ id: o.id, kind: "order", type: o.type, status: o.status, area: o.area, lines: o.lines, subtotal: o.subtotal, fee: o.fee, total: o.total, placedAt: o.placedAt, cancelledBy: o.cancelledBy }));
  const bookings: MyOrder[] = bookingsStore
    .get()
    .filter((b) => last10(b.phone) === last10(phone))
    .map((b) => ({ id: b.id, kind: "booking", status: b.status, area: b.area, lines: b.lines, subtotal: b.subtotal, placedAt: b.placedAt, date: b.date, time: b.time, guests: b.guests, cancelledBy: b.cancelledBy }));
  return [...orders, ...bookings].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

/* ---------- feedback ---------- */

/** Saves a feedback from the website form. With Supabase this throws when it could not be saved. */
export const newFeedbackId = (): string => "FB-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

export function recordFeedback(f: Pick<AdminFeedback, "id" | "name" | "email" | "phone" | "message" | "rating">): Promise<void> {
  const at = nowIso();
  const item: AdminFeedback = { ...f, featured: false, placedAt: at, updatedAt: at };
  return feedbackStore.set([item, ...feedbackStore.get()], true);
}

/** Adds feedback imported from the old Google Sheet (no rating). Already imported ones are skipped. */
export function importFeedbacks(rows: Pick<AdminFeedback, "id" | "name" | "email" | "phone" | "message" | "placedAt">[]): { added: number; skipped: number } {
  const current = feedbackStore.get();
  const have = new Set(current.map((f) => f.id));
  const fresh: AdminFeedback[] = rows
    .filter((r) => !have.has(r.id))
    .map((r) => ({ ...r, rating: 0, featured: false, updatedAt: r.placedAt }));
  if (fresh.length > 0) {
    void feedbackStore.set([...current, ...fresh].sort((a, b) => b.placedAt.localeCompare(a.placedAt)));
  }
  return { added: fresh.length, skipped: rows.length - fresh.length };
}

export function setFeedbackFeatured(id: string, featured: boolean): void {
  const at = nowIso();
  void feedbackStore.set(
    feedbackStore.get().map((f) => (f.id === id ? { ...f, featured, featuredAt: featured ? at : undefined, updatedAt: at } : f))
  );
}

export function deleteFeedback(id: string): void {
  void feedbackStore.set(feedbackStore.get().filter((f) => f.id !== id));
}

const REVIEWS_CACHE = "bfc-public-reviews-v1";

const validReviews = (v: unknown): v is PublicReview[] =>
  Array.isArray(v) && v.every((r) => isObject(r) && typeof r.id === "string" && typeof r.message === "string");

function useRemoteReviews(): PublicReview[] | null {
  const [list, setList] = useState<PublicReview[] | null>(() => {
    try {
      const raw = localStorage.getItem(REVIEWS_CACHE);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      return validReviews(parsed) ? parsed : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let alive = true;
    sb<unknown>("rpc/public_feedbacks", { method: "POST", body: {} })
      .then((rows) => {
        if (!alive || !validReviews(rows)) return;
        setList(rows);
        try {
          localStorage.setItem(REVIEWS_CACHE, JSON.stringify(rows));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* offline - keep what we have */
      });
    return () => {
      alive = false;
    };
  }, []);

  return list;
}

function useLocalReviews(): PublicReview[] | null {
  const all = hook(feedbackStore);
  return useMemo(
    () =>
      all
        .filter((f) => f.featured)
        .sort((a, b) => (b.featuredAt ?? b.placedAt).localeCompare(a.featuredAt ?? a.placedAt))
        .slice(0, 12)
        .map((f) => ({ id: f.id, name: f.name, message: f.message, rating: f.rating })),
    [all]
  );
}

/** The feedback the team picked for the website slider (null = still loading). */
export const usePublicReviews = isRemote ? useRemoteReviews : useLocalReviews;

/* ---------- settings ---------- */

export function getSettings(): Settings {
  return settingsStore.get();
}

export function updateSettings(patch: Partial<Settings>): void {
  settingsStore.set({ ...settingsStore.get(), ...patch });
}

/* ---------- menu ---------- */

export const itemKey = (categoryId: string, name: string) => `${categoryId}::${name}`;

export interface LiveDish extends Dish {
  soldOut?: boolean;
  custom?: boolean;
  customId?: string;
  edited?: boolean;
  hidden?: boolean;
  /** original identity of a built-in item (stays the same after a rename / move) */
  origCat?: string;
  origName?: string;
}

export interface LiveCategory extends Omit<MenuCategory, "items"> {
  items: LiveDish[];
  custom?: boolean;
}

/** Built-in menu + admin edits. `includeHidden` is for the admin screen; the customer site never sees hidden items. */
export function buildMenu(state: MenuState, includeHidden = false): LiveCategory[] {
  const moved: { to: string; dish: LiveDish }[] = [];

  const cats: LiveCategory[] = [
    ...MENU.map<LiveCategory>((c) => ({
      id: c.id,
      title: c.title,
      items: [],
    })),
    ...state.customCategories.map<LiveCategory>((c) => ({ id: c.id, title: c.title, items: [], custom: true })),
  ];
  const byId = new Map(cats.map((c) => [c.id, c]));

  for (const c of MENU) {
    for (const d of c.items) {
      const o = state.overrides[itemKey(c.id, d.name)];
      const name = o?.name || d.name;
      const dish: LiveDish = {
        ...d,
        name,
        // a renamed item would lose its bundled photo (matched by name), so resolve it first
        image: o?.image || (name !== d.name ? dishImage(d) : d.image),
        origCat: c.id,
        origName: d.name,
      };
      if (o) {
        dish.price = o.price ?? d.price;
        dish.from = o.from ?? d.from;
        dish.desc = o.desc ?? d.desc;
        dish.soldOut = o.soldOut;
        dish.hidden = o.hidden;
        dish.edited =
          o.price !== undefined ||
          o.from !== undefined ||
          o.desc !== undefined ||
          o.image !== undefined ||
          o.name !== undefined ||
          o.categoryId !== undefined;
      }
      const target = o?.categoryId && o.categoryId !== c.id && byId.has(o.categoryId) ? o.categoryId : c.id;
      if (target === c.id) byId.get(c.id)!.items.push(dish);
      else moved.push({ to: target, dish });
    }
  }
  for (const m of moved) byId.get(m.to)!.items.push(m.dish);

  for (const ci of state.customItems) {
    const cat = byId.get(ci.categoryId);
    if (!cat) continue;
    cat.items.push({
      name: ci.name,
      price: ci.price,
      from: ci.from,
      desc: ci.desc,
      image: ci.image,
      soldOut: ci.soldOut,
      hidden: ci.hidden,
      custom: true,
      customId: ci.id,
    });
  }

  return cats
    .map((c) => (includeHidden ? c : { ...c, items: c.items.filter((d) => !d.hidden) }))
    .filter((c) => includeHidden || c.items.length > 0);
}

export function getLiveMenu(): LiveCategory[] {
  return buildMenu(menuStore.get());
}

export function useLiveMenu(): LiveCategory[] {
  const state = useMenuState();
  // `state` is referentially stable between writes, so this only recomputes after an edit
  return memoMenu(state);
}

let lastState: MenuState | null = null;
let lastMenu: LiveCategory[] = [];
function memoMenu(state: MenuState): LiveCategory[] {
  if (state !== lastState) {
    lastState = state;
    lastMenu = buildMenu(state);
  }
  return lastMenu;
}

export function patchOverride(categoryId: string, name: string, patch: ItemOverride): void {
  const s = menuStore.get();
  const key = itemKey(categoryId, name);
  const original = MENU.find((c) => c.id === categoryId)?.items.find((d) => d.name === name);
  const merged: ItemOverride = { ...s.overrides[key], ...patch };

  // keep only what really differs from the built-in menu, so "edited" stays meaningful
  const clean: ItemOverride = {};
  if (merged.name && merged.name !== name) clean.name = merged.name;
  if (merged.categoryId && merged.categoryId !== categoryId) clean.categoryId = merged.categoryId;
  if (merged.price !== undefined && merged.price !== original?.price) clean.price = merged.price;
  if (merged.from !== undefined && Boolean(merged.from) !== Boolean(original?.from)) clean.from = merged.from;
  if (merged.desc !== undefined && merged.desc !== (original?.desc ?? "")) clean.desc = merged.desc;
  if (merged.image && merged.image !== original?.image) clean.image = merged.image;
  if (merged.soldOut) clean.soldOut = true;
  if (merged.hidden) clean.hidden = true;

  const overrides = { ...s.overrides };
  if (Object.keys(clean).length) overrides[key] = clean;
  else delete overrides[key];
  menuStore.set({ ...s, overrides });
}

export function resetOverride(categoryId: string, name: string): void {
  const s = menuStore.get();
  const next = { ...s.overrides };
  delete next[itemKey(categoryId, name)];
  menuStore.set({ ...s, overrides: next });
}

export function addCustomCategory(title: string): string {
  const s = menuStore.get();
  const base = "c-" + (title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "category");
  let id = base;
  const taken = new Set([...MENU.map((c) => c.id), ...s.customCategories.map((c) => c.id)]);
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  menuStore.set({ ...s, customCategories: [...s.customCategories, { id, title }] });
  return id;
}

export function deleteCustomCategory(id: string): void {
  const s = menuStore.get();
  menuStore.set({
    ...s,
    customCategories: s.customCategories.filter((c) => c.id !== id),
    customItems: s.customItems.filter((i) => i.categoryId !== id),
  });
}

export function saveCustomItem(item: Omit<CustomItem, "id"> & { id?: string }): void {
  const s = menuStore.get();
  if (item.id) {
    menuStore.set({ ...s, customItems: s.customItems.map((i) => (i.id === item.id ? ({ ...i, ...item } as CustomItem) : i)) });
  } else {
    const id = "i-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    menuStore.set({ ...s, customItems: [...s.customItems, { ...item, id } as CustomItem] });
  }
}

export function patchCustomItem(id: string, patch: Partial<CustomItem>): void {
  const s = menuStore.get();
  menuStore.set({ ...s, customItems: s.customItems.map((i) => (i.id === id ? ({ ...i, ...patch } as CustomItem) : i)) });
}

export function deleteCustomItem(id: string): void {
  const s = menuStore.get();
  menuStore.set({ ...s, customItems: s.customItems.filter((i) => i.id !== id) });
}

/* ---------- backup / maintenance ---------- */

export interface Backup {
  app: "bfc-admin";
  version: 1;
  exportedAt: string;
  orders: AdminOrder[];
  bookings: AdminBooking[];
  menu: MenuState;
  settings: Settings;
}

export function exportBackup(): Backup {
  return {
    app: "bfc-admin",
    version: 1,
    exportedAt: nowIso(),
    orders: ordersStore.get(),
    bookings: bookingsStore.get(),
    menu: menuStore.get(),
    settings: settingsStore.get(),
  };
}

export function importBackup(data: unknown): boolean {
  if (isRemote) return false; // restoring would overwrite the shared database
  if (!isObject(data) || data.app !== "bfc-admin") return false;
  if (!Array.isArray(data.orders) || !Array.isArray(data.bookings)) return false;
  ordersStore.set(data.orders as AdminOrder[]);
  bookingsStore.set(data.bookings as AdminBooking[]);
  if (isObject(data.menu) && isObject((data.menu as Record<string, unknown>).overrides)) menuStore.set(data.menu as unknown as MenuState);
  if (isObject(data.settings) && typeof (data.settings as Record<string, unknown>).deliveryCharge === "number") {
    settingsStore.set({ ...DEFAULT_SETTINGS, ...(data.settings as unknown as Settings) });
  }
  return true;
}

export function replaceOrdersAndBookings(orders: AdminOrder[], bookings: AdminBooking[]): void {
  if (isRemote) return; // sample data is only for browser-only mode
  ordersStore.set(orders);
  bookingsStore.set(bookings);
}

export function clearOrdersAndBookings(): void {
  void ordersStore.clear?.();
  void bookingsStore.clear?.();
}

export function resetMenuEdits(): void {
  menuStore.set(EMPTY_MENU);
}
