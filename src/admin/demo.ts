import { AREAS } from "../data/content";
import { MENU } from "../data/menu";
import { addDays, todayDhaka } from "./format";
import type { AdminBooking, AdminOrder, BookingStatus, OrderLine, OrderStatus } from "./store";

/** Sample data so the dashboard has something to show before real orders arrive. */

const NAMES = [
  "Rakib Hasan", "Nusrat Jahan", "Tanvir Ahmed", "Sadia Islam", "Imran Hossain", "Farhana Akter",
  "Mahmudul Karim", "Jannat Ara", "Shakib Rahman", "Tasnim Sultana", "Arif Chowdhury", "Mim Khan",
  "Sohel Rana", "Nabila Haque", "Rafi Uddin", "Lamia Noor",
];

const rand = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};

function pickLines(r: () => number): OrderLine[] {
  const flat = MENU.flatMap((c) => c.items.map((d) => ({ c: c.title, d })));
  const n = 1 + Math.floor(r() * 3);
  const out: OrderLine[] = [];
  for (let i = 0; i < n; i++) {
    const { c, d } = flat[Math.floor(r() * flat.length)];
    if (out.some((l) => l.name === d.name)) continue;
    out.push({ name: d.name, category: c, price: d.price, qty: 1 + Math.floor(r() * 3), from: d.from });
  }
  return out;
}

export function makeDemoData(): { orders: AdminOrder[]; bookings: AdminBooking[] } {
  const r = rand(20261125);
  const orders: AdminOrder[] = [];
  const bookings: AdminBooking[] = [];
  const types: AdminOrder["type"][] = ["Online Delivery", "Online Delivery", "Online Order", "Take Away"];
  const today = todayDhaka();
  let seq = 0;

  for (let day = 6; day >= 0; day--) {
    const count = day === 0 ? 7 : 5 + Math.floor(r() * 6);
    for (let i = 0; i < count; i++) {
      const lines = pickLines(r);
      const type = types[Math.floor(r() * types.length)];
      const subtotal = lines.reduce((n, l) => n + l.qty * l.price, 0);
      const fee = type === "Online Delivery" ? 60 : 0;
      const hour = 11 + Math.floor(r() * 11);
      const minute = Math.floor(r() * 60);
      // Dhaka is UTC+6
      const base = new Date(`${addDays(today, -day)}T00:00:00+06:00`).getTime();
      // today's orders are spread over the last hours so they never sit in the future
      const placed = day === 0 ? new Date(Date.now() - (i * 42 + 4) * 60000) : new Date(base + (hour * 60 + minute) * 60000);
      let status: OrderStatus = "completed";
      if (day === 0) status = (["new", "new", "preparing", "ready", "completed"] as OrderStatus[])[i % 5];
      else if (r() < 0.08) status = "cancelled";
      const person = NAMES[Math.floor(r() * NAMES.length)];
      orders.push({
        id: `BFC-D${String(++seq).padStart(4, "0")}`,
        type,
        status,
        name: person,
        phone: "017" + String(10000000 + Math.floor(r() * 89999999)),
        area: AREAS[Math.floor(r() * AREAS.length)],
        address: type === "Online Delivery" ? `House ${1 + Math.floor(r() * 90)}, Road ${1 + Math.floor(r() * 20)}` : "",
        note: r() < 0.2 ? "Extra spicy please" : "",
        lines,
        subtotal,
        fee,
        total: subtotal + fee,
        hasFrom: lines.some((l) => l.from),
        placedAt: placed.toISOString(),
        updatedAt: placed.toISOString(),
      });
    }
  }

  const bStatus: BookingStatus[] = ["pending", "confirmed", "confirmed", "pending", "completed"];
  for (let i = 0; i < 6; i++) {
    const lines = r() < 0.5 ? pickLines(r) : [];
    const offset = i - 1;
    bookings.push({
      id: `TBL-D${String(i + 1).padStart(3, "0")}`,
      status: offset < 0 ? "completed" : bStatus[i % bStatus.length],
      name: NAMES[Math.floor(r() * NAMES.length)],
      phone: "018" + String(10000000 + Math.floor(r() * 89999999)),
      area: AREAS[Math.floor(r() * AREAS.length)],
      date: addDays(today, offset),
      time: `${String(12 + Math.floor(r() * 9)).padStart(2, "0")}:${r() < 0.5 ? "00" : "30"}`,
      guests: 2 + Math.floor(r() * 7),
      note: "",
      lines,
      subtotal: lines.reduce((n, l) => n + l.qty * l.price, 0),
      hasFrom: lines.some((l) => l.from),
      placedAt: new Date(Date.now() - (i + 1) * 3600_000 * 5).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return { orders: orders.sort((a, b) => b.placedAt.localeCompare(a.placedAt)), bookings };
}
