import type { CartLine } from "./CartContext";

export type OrderType = "Delivery" | "Take Away" | "Dine-in";
export const ORDER_TYPES: OrderType[] = ["Delivery", "Take Away", "Dine-in"];

const PHONE_RE = /^(?:\+?88)?01[3-9]\d{8}$/;

export function validPhone(value: string): boolean {
  return PHONE_RE.test(value.replace(/[\s-]/g, ""));
}

export function newOrderId(): string {
  return "BFC-" + Date.now().toString(36).toUpperCase().slice(-6);
}

export function itemsText(lines: CartLine[]): string {
  return lines
    .map(
      (l) =>
        `${l.qty} x ${l.name} (${l.category})${l.from ? ` - from ৳${l.price}` : ` - ৳${l.price}`} = ৳${l.qty * l.price}`
    )
    .join("\n");
}

/**
 * Sends the order.
 * - On Netlify the order goes to Netlify Forms (form name: "order", declared in index.html),
 *   so it shows up in Site -> Forms and can be e-mailed to the restaurant.
 * - In `npm run dev` there is no Netlify, so the order is simulated.
 */
export async function submitOrder(payload: Record<string, string>): Promise<void> {
  if (import.meta.env.DEV) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.info("[BFC demo order - not sent, dev mode]", payload);
    return;
  }

  const res = await fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ "form-name": "order", ...payload }).toString(),
  });
  if (!res.ok) throw new Error(`Order request failed (${res.status})`);
}
