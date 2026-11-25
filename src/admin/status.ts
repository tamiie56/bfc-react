import type { AdminBooking, AdminOrder, BookingStatus, OrderStatus } from "./store";

export const ORDER_STATUSES: OrderStatus[] = ["new", "preparing", "ready", "completed", "cancelled"];
export const BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "completed", "cancelled"];

/** Label depends on how the order is fulfilled (delivery / pickup). */
export function orderLabel(status: OrderStatus, type: AdminOrder["type"]): string {
  switch (status) {
    case "new":
      return "New";
    case "preparing":
      return "Preparing";
    case "ready":
      return type === "Online Delivery" ? "Out for delivery" : type === "Take Away" ? "Ready for pickup" : "Ready";
    case "completed":
      return type === "Online Delivery" ? "Delivered" : "Completed";
    case "cancelled":
      return "Cancelled";
  }
}

export const bookingLabel = (s: BookingStatus): string =>
  ({ pending: "Pending", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled" })[s];

/** The one step forward from a status (null when the order is finished). */
export function nextOrderStep(o: AdminOrder): { to: OrderStatus; label: string } | null {
  switch (o.status) {
    case "new":
      return { to: "preparing", label: "Accept & start preparing" };
    case "preparing":
      return { to: "ready", label: o.type === "Online Delivery" ? "Out for delivery" : "Mark ready" };
    case "ready":
      return { to: "completed", label: o.type === "Online Delivery" ? "Mark delivered" : "Mark completed" };
    default:
      return null;
  }
}

export function nextBookingStep(b: AdminBooking): { to: BookingStatus; label: string } | null {
  switch (b.status) {
    case "pending":
      return { to: "confirmed", label: "Confirm booking" };
    case "confirmed":
      return { to: "completed", label: "Mark as seated / done" };
    default:
      return null;
  }
}

export const isActiveOrder = (o: AdminOrder) => o.status === "new" || o.status === "preparing" || o.status === "ready";
