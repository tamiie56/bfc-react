import { useSyncExternalStore } from "react";
import { DELIVERY_CHARGE, MENU } from "../data/menu";
import type { Dish, MenuCategory } from "../data/menu";
import type { OrderType } from "../cart/order";

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
}

export interface ItemOverride {
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
} as const;

/* ---------- tiny reactive localStorage collection ---------- */

interface Collection<T> {
  get: () => T;
  set: (next: T) => void;
  subscribe: (cb: () => void) => () => void;
}

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

  return {
    get: () => {
      if (cache === undefined) cache = read();
      return cache;
    },
    set: (next) => {
      cache = next;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage full / blocked - keep the in-memory copy */
      }
      emit();
    },
    subscribe: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}

const isArray = (v: unknown): v is never[] => Array.isArray(v);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const EMPTY_MENU: MenuState = { overrides: {}, customItems: [], customCategories: [] };
const DEFAULT_SETTINGS: Settings = { deliveryCharge: DELIVERY_CHARGE, sound: true };

const ordersStore = collection<AdminOrder[]>(KEYS.orders, [], isArray as (v: unknown) => v is AdminOrder[]);
const bookingsStore = collection<AdminBooking[]>(KEYS.bookings, [], isArray as (v: unknown) => v is AdminBooking[]);
const menuStore = collection<MenuState>(KEYS.menu, EMPTY_MENU, (v): v is MenuState => isObject(v) && isObject(v.overrides));
const settingsStore = collection<Settings>(
  KEYS.settings,
  DEFAULT_SETTINGS,
  (v): v is Settings => isObject(v) && typeof v.deliveryCharge === "number"
);

function hook<T>(c: Collection<T>): T {
  return useSyncExternalStore(c.subscribe, c.get, c.get);
}

export const useOrders = () => hook(ordersStore);
export const useBookings = () => hook(bookingsStore);
export const useMenuState = () => hook(menuStore);
export const useSettings = () => hook(settingsStore);

const nowIso = () => new Date().toISOString();

/* ---------- orders ---------- */

export function recordOrder(
  o: Omit<AdminOrder, "status" | "placedAt" | "updatedAt"> & Partial<Pick<AdminOrder, "placedAt">>
): void {
  const at = nowIso();
  const order: AdminOrder = { ...o, status: "new", placedAt: o.placedAt ?? at, updatedAt: at };
  ordersStore.set([order, ...ordersStore.get().filter((x) => x.id !== order.id)]);
}

export function setOrderStatus(id: string, status: OrderStatus): void {
  ordersStore.set(ordersStore.get().map((o) => (o.id === id ? { ...o, status, updatedAt: nowIso() } : o)));
}

export function deleteOrder(id: string): void {
  ordersStore.set(ordersStore.get().filter((o) => o.id !== id));
}

/* ---------- bookings ---------- */

export function recordBooking(
  b: Omit<AdminBooking, "status" | "placedAt" | "updatedAt"> & Partial<Pick<AdminBooking, "placedAt">>
): void {
  const at = nowIso();
  const booking: AdminBooking = { ...b, status: "pending", placedAt: b.placedAt ?? at, updatedAt: at };
  bookingsStore.set([booking, ...bookingsStore.get().filter((x) => x.id !== booking.id)]);
}

export function setBookingStatus(id: string, status: BookingStatus): void {
  bookingsStore.set(bookingsStore.get().map((b) => (b.id === id ? { ...b, status, updatedAt: nowIso() } : b)));
}

export function deleteBooking(id: string): void {
  bookingsStore.set(bookingsStore.get().filter((b) => b.id !== id));
}

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
}

export interface LiveCategory extends Omit<MenuCategory, "items"> {
  items: LiveDish[];
  custom?: boolean;
}

/** Built-in menu + admin edits. `includeHidden` is for the admin screen; the customer site never sees hidden items. */
export function buildMenu(state: MenuState, includeHidden = false): LiveCategory[] {
  const cats: LiveCategory[] = [
    ...MENU.map<LiveCategory>((c) => ({
      id: c.id,
      title: c.title,
      items: c.items.map<LiveDish>((d) => {
        const o = state.overrides[itemKey(c.id, d.name)];
        if (!o) return { ...d };
        return {
          ...d,
          price: o.price ?? d.price,
          from: o.from ?? d.from,
          desc: o.desc ?? d.desc,
          image: o.image || d.image,
          soldOut: o.soldOut,
          hidden: o.hidden,
          edited: o.price !== undefined || o.from !== undefined || o.desc !== undefined || o.image !== undefined,
        };
      }),
    })),
    ...state.customCategories.map<LiveCategory>((c) => ({ id: c.id, title: c.title, items: [], custom: true })),
  ];

  for (const ci of state.customItems) {
    const cat = cats.find((c) => c.id === ci.categoryId);
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
  ordersStore.set(orders);
  bookingsStore.set(bookings);
}

export function clearOrdersAndBookings(): void {
  ordersStore.set([]);
  bookingsStore.set([]);
}

export function resetMenuEdits(): void {
  menuStore.set(EMPTY_MENU);
}
