import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FaCheckCircle, FaDownload, FaPhoneAlt, FaShoppingBag, FaTimes, FaTrashAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import { cancelMyOrder, recordBooking, recordOrder, useSettings } from "../admin/store";
import { isRemote } from "../admin/supabase";
import { useCart } from "../cart/CartContext";
import type { CartLine } from "../cart/CartContext";
import { ORDER_TYPES, isDelivery, itemsText, newBookingId, newOrderId, submitOrder, validPhone } from "../cart/order";
import type { OrderType } from "../cart/order";
import { AREAS, SITE } from "../data/content";
import { BookingFields, prettyDate, todayInput, validateBooking } from "./BookingForm";
import type { Booking } from "./BookingForm";
import QtyStepper from "./QtyStepper";

type Step = "cart" | "checkout" | "done";

interface Done {
  id: string;
  type: OrderType;
  name: string;
  phone: string;
  area: string;
  address: string;
  lines: CartLine[];
  subtotal: number;
  fee: number;
  total: number;
  hasFrom: boolean;
  note: string;
  placedAtIso: string;
  booking: Booking | null;
}

const CUSTOMER_KEY = "bfc-customer-v1";

function loadCustomer() {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    if (raw) {
      const c = JSON.parse(raw) as Record<string, string>;
      return {
        name: c.name ?? "",
        phone: c.phone ?? "",
        address: c.address ?? "",
        area: c.area ?? AREAS[0],
      };
    }
  } catch {
    /* ignore */
  }
  return { name: "", phone: "", address: "", area: AREAS[0] };
}

export default function CartDrawer() {
  const cart = useCart();
  const { deliveryCharge } = useSettings();
  const { setQty, remove, clear, isOpen, closeCart, toast, orderType: type, setOrderType: setType, direct } = cart;

  // "Order Now" checks out just that one item; otherwise the whole cart
  const lines = direct ? [direct] : cart.lines;
  const subtotal = direct ? direct.qty * direct.price : cart.subtotal;
  const hasFrom = direct ? Boolean(direct.from) : cart.hasFrom;

  const wasDirect = useRef(false);
  const [step, setStep] = useState<Step>("cart");
  const [customer, setCustomer] = useState(loadCustomer);
  const [booking, setBooking] = useState<Booking>(() => ({ date: todayInput(), time: "", guests: 2 }));
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);
  const [cancelStep, setCancelStep] = useState<"idle" | "confirm" | "busy" | "done">("idle");
  const [cancelMsg, setCancelMsg] = useState("");

  const dine = type === "Dine-in";
  const fee = isDelivery(type) ? deliveryCharge : 0;
  const total = subtotal + fee;

  // lock page scroll + Esc to close while open
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, closeCart]);

  // reset the flow when the drawer is closed after an order / when the cart empties
  useEffect(() => {
    if (isOpen) return;
    if (step === "done" || wasDirect.current) {
      setStep("cart");
      setDone(null);
      setCancelStep("idle");
      setCancelMsg("");
    }
    wasDirect.current = false;
  }, [isOpen, step]);

  useEffect(() => {
    if (step === "checkout" && lines.length === 0) setStep("cart");
  }, [step, lines.length]);

  // Order Now: jump straight to checkout
  useEffect(() => {
    if (direct) {
      wasDirect.current = true;
      setStep("checkout");
    }
  }, [direct]);

  const set = (field: "name" | "phone" | "address" | "area", value: string) => {
    setCustomer((c) => ({ ...c, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (customer.name.trim().length < 2) e.name = "Please enter your name";
    if (!validPhone(customer.phone)) e.phone = "Enter a valid mobile number (e.g. 01XXXXXXXXX)";
    if (isDelivery(type) && customer.address.trim().length < 8) e.address = "Please enter your full delivery address";
    if (dine) Object.assign(e, validateBooking(booking));
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const place = async (ev: FormEvent) => {
    ev.preventDefault();
    if (busy || !validate()) return;

    const id = dine ? newBookingId() : newOrderId();
    const placedAtIso = new Date().toISOString();
    const placedAt = new Date(placedAtIso).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" });
    const payload: Record<string, string> = dine
      ? {
          "bot-field": "",
          bookingId: id,
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          area: customer.area,
          date: booking.date,
          time: booking.time,
          guests: String(booking.guests),
          note: note.trim(),
          items: itemsText(lines),
          subtotal: String(subtotal),
          hasFromItems: hasFrom ? "yes" : "no",
          placedAt,
        }
      : {
          "bot-field": "",
          orderId: id,
          orderType: type,
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          area: customer.area,
          address: isDelivery(type) ? customer.address.trim() : "",
          note: note.trim(),
          items: itemsText(lines),
          subtotal: String(subtotal),
          delivery: String(fee),
          total: String(total),
          hasFromItems: hasFrom ? "yes" : "no",
          placedAt,
        };

    setBusy(true);
    setFailed(false);
    try {
      const saved = lines.map((l) => ({ name: l.name, category: l.category, price: l.price, qty: l.qty, from: l.from }));
      const save = () =>
        dine
          ? recordBooking({
              id,
              name: customer.name.trim(),
              phone: customer.phone.trim(),
              area: customer.area,
              date: booking.date,
              time: booking.time,
              guests: booking.guests,
              note: note.trim(),
              lines: saved,
              subtotal,
              hasFrom,
            })
          : recordOrder({
              id,
              type,
              name: customer.name.trim(),
              phone: customer.phone.trim(),
              area: customer.area,
              address: isDelivery(type) ? customer.address.trim() : "",
              note: note.trim(),
              lines: saved,
              subtotal,
              fee,
              total,
              hasFrom,
            });

      if (isRemote) {
        // shared database: the order goes straight to Supabase (throws -> "could not send")
        await save();
      } else {
        await submitOrder(payload, dine ? "booking" : "order");
        // browser-only mode: keep a copy for the team panel (/admin), never blocking the order
        try {
          await save();
        } catch (err) {
          console.warn("Could not save a copy for the admin panel", err);
        }
      }
      try {
        localStorage.setItem(
          CUSTOMER_KEY,
          JSON.stringify({ name: customer.name, phone: customer.phone, address: customer.address, area: customer.area })
        );
      } catch {
        /* ignore */
      }
      setDone({
        id,
        type,
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        area: customer.area,
        address: customer.address.trim(),
        lines,
        subtotal,
        fee,
        total,
        hasFrom,
        note: note.trim(),
        placedAtIso,
        booking: dine ? booking : null,
      });
      setPdfFailed(false);
      setCancelStep("idle");
      setCancelMsg("");
      if (!direct) clear();
      setNote("");
      if (dine) setBooking((b) => ({ ...b, time: "" }));
      setStep("done");
    } catch (err) {
      console.error("Order could not be sent", err);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const cancelNow = async () => {
    if (!done || cancelStep === "busy") return;
    setCancelStep("busy");
    setCancelMsg("");
    const res = await cancelMyOrder(done.id, done.phone);
    if (res === "ok" || res === "already_cancelled") {
      setCancelStep("done");
    } else {
      setCancelStep("idle");
      setCancelMsg(
        res === "too_late"
          ? `We have already started on your ${done.booking ? "booking" : "order"}, so it can't be cancelled online. Please call ${SITE.phone}.`
          : `We could not cancel it right now. Please try again or call ${SITE.phone}.`
      );
    }
  };

  const downloadReceipt = async () => {
    if (!done || pdfBusy) return;
    setPdfBusy(true);
    setPdfFailed(false);
    try {
      const { downloadReceiptPdf } = await import("../cart/receiptPdf");
      await downloadReceiptPdf({
        id: done.id,
        kind: done.booking ? "booking" : "order",
        type: done.type,
        name: done.name,
        phone: done.phone,
        area: done.area,
        address: done.address,
        note: done.note,
        lines: done.lines.map((l) => ({ name: l.name, category: l.category, price: l.price, qty: l.qty, from: l.from })),
        subtotal: done.subtotal,
        fee: done.fee,
        total: done.total,
        hasFrom: done.hasFrom,
        placedAt: done.placedAtIso,
        booking: done.booking ? { date: done.booking.date, time: done.booking.time, guests: done.booking.guests } : null,
      });
    } catch (err) {
      console.error("Receipt PDF failed", err);
      setPdfFailed(true);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <>
      {toast && (
        <div className="toast" role="status">
          <FaCheckCircle aria-hidden /> {toast}
        </div>
      )}

      {isOpen && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label="Your order" onClick={closeCart}>
          <aside className="drawer__panel" onClick={(e) => e.stopPropagation()}>
            <header className="drawer__head">
              <h2>
                {step === "cart" && "Your Order"}
                {step === "checkout" && (dine ? "Book a Table" : "Checkout")}
                {step === "done" && (cancelStep === "done" ? (done?.booking ? "Booking Cancelled" : "Order Cancelled") : done?.booking ? "Booking Received" : "Order Placed")}
              </h2>
              <button className="drawer__close" onClick={closeCart} aria-label="Close cart">
                <FaTimes />
              </button>
            </header>

            {/* ---------- step 1: cart ---------- */}
            {step === "cart" && (
              <>
                {lines.length === 0 ? (
                  <div className="drawer__empty">
                    <FaShoppingBag aria-hidden />
                    <p>Your cart is empty.</p>
                    <Link to="/menu" className="btn btn--red btn--sm" onClick={closeCart}>
                      Browse Menu
                    </Link>
                  </div>
                ) : (
                  <>
                    <ul className="drawer__lines">
                      {lines.map((l) => (
                        <li className="cline" key={l.key}>
                          {l.image && <img src={l.image} alt="" referrerPolicy="no-referrer" />}
                          <div className="cline__info">
                            <h3>{l.name}</h3>
                            <span>
                              {l.from && "From "}৳{l.price}
                            </span>
                            <QtyStepper value={l.qty} onChange={(q) => setQty(l.key, q)} />
                          </div>
                          <div className="cline__side">
                            <strong>৳{l.qty * l.price}</strong>
                            <button onClick={() => remove(l.key)} aria-label={`Remove ${l.name}`}>
                              <FaTrashAlt />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <footer className="drawer__foot">
                      <div className="sum">
                        <span>Subtotal</span>
                        <strong>৳{subtotal}</strong>
                      </div>
                      <p className="drawer__hint">Delivery charge (৳{deliveryCharge}) is added at checkout for home delivery.</p>
                      {hasFrom && (
                        <p className="drawer__hint">
                          Items marked &ldquo;From&rdquo; start at that price. We confirm the final price when we call you.
                        </p>
                      )}
                      <button className="btn btn--red drawer__btn" onClick={() => setStep("checkout")}>
                        Checkout · ৳{subtotal}
                      </button>
                    </footer>
                  </>
                )}
              </>
            )}

            {/* ---------- step 2: checkout ---------- */}
            {step === "checkout" && (
              <form className="drawer__form" onSubmit={place} noValidate>
                <div className="drawer__scroll">
                  <fieldset className="otype">
                    <legend>Order type</legend>
                    {ORDER_TYPES.map((t) => (
                      <label key={t} className={type === t ? "is-active" : ""}>
                        <input type="radio" name="orderType" value={t} checked={type === t} onChange={() => setType(t)} />
                        {t}
                      </label>
                    ))}
                  </fieldset>

                  <label className="field">
                    <span>Full name</span>
                    <input value={customer.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
                    {errors.name && <em>{errors.name}</em>}
                  </label>

                  <label className="field">
                    <span>Mobile number</span>
                    <input
                      value={customer.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      inputMode="tel"
                      placeholder="01XXXXXXXXX"
                      autoComplete="tel"
                    />
                    {errors.phone && <em>{errors.phone}</em>}
                  </label>

                  <label className="field">
                    <span>{isDelivery(type) ? "Nearest outlet area" : dine ? "Outlet" : "Outlet area"}</span>
                    <select value={customer.area} onChange={(e) => set("area", e.target.value)}>
                      {AREAS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </label>

                  {dine && (
                    <BookingFields
                      value={booking}
                      onChange={(b) => {
                        setBooking(b);
                        setErrors((e) => ({ ...e, date: "", time: "" }));
                      }}
                      errors={errors}
                    />
                  )}

                  {isDelivery(type) && (
                    <label className="field">
                      <span>Delivery address</span>
                      <textarea
                        rows={3}
                        value={customer.address}
                        onChange={(e) => set("address", e.target.value)}
                        placeholder="House, road, block, area"
                        autoComplete="street-address"
                      />
                      {errors.address && <em>{errors.address}</em>}
                    </label>
                  )}

                  <label className="field">
                    <span>Note (optional)</span>
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={dine ? "Birthday, high chair, window seat, etc." : "Spicy level, extra dip, size, etc."}
                    />
                  </label>

                  {dine && (
                    <ul className="book__items">
                      {lines.map((l) => (
                        <li key={l.key}>
                          <span>
                            {l.qty} × {l.name}
                          </span>
                          <strong>৳{l.qty * l.price}</strong>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="drawer__summary">
                    <div className="sum"><span>{dine ? "Pre-order total" : "Subtotal"}</span><strong>৳{subtotal}</strong></div>
                    {!dine && <div className="sum"><span>Delivery charge</span><strong>{fee ? `৳${fee}` : "—"}</strong></div>}
                    {!dine && <div className="sum sum--total"><span>Total</span><strong>৳{total}</strong></div>}
                    <p className="drawer__hint">
                      {dine
                        ? "Pay at the outlet. We will prepare your pre-ordered items for your visit."
                        : `Payment: cash on ${isDelivery(type) ? "delivery" : "pickup / at the outlet"}.`}
                    </p>
                    {hasFrom && (
                      <p className="drawer__hint">&ldquo;From&rdquo; prices are confirmed on the confirmation call.</p>
                    )}
                  </div>

                  {failed && (
                    <p className="drawer__error" role="alert">
                      Sorry, we could not send your order. Please try again or call {SITE.phone}.
                    </p>
                  )}
                </div>

                <footer className="drawer__foot">
                  <button type="submit" className="btn btn--red drawer__btn" disabled={busy}>
                    {busy ? (dine ? "Booking…" : "Placing order…") : dine ? "Book Table" : `Place Order · ৳${total}`}
                  </button>
                  <button
                    type="button"
                    className="drawer__back"
                    onClick={() => (direct ? closeCart() : setStep("cart"))}
                    disabled={busy}
                  >
                    {direct ? "Cancel" : "Back to cart"}
                  </button>
                </footer>
              </form>
            )}

            {/* ---------- step 3: confirmation ---------- */}
            {step === "done" && done && (
              <div className="drawer__done">
                <FaCheckCircle className="drawer__tick" aria-hidden />
                <h3>Thank you, {done.name}!</h3>
                <p>
                  Your {done.booking ? "table booking" : "order"} <strong>{done.id}</strong> has been received. We
                  will call you on <strong>{done.phone}</strong> to confirm.
                </p>

                <div className="done__box">
                  <div className="done__meta">
                    <span>{done.booking ? `Table · ${done.area}` : done.type}</span>
                    <span>
                      {done.booking
                        ? `${prettyDate(done.booking.date)} · ${done.booking.time} · ${done.booking.guests} ${done.booking.guests === 1 ? "guest" : "guests"}`
                        : isDelivery(done.type)
                          ? done.address
                          : done.area}
                    </span>
                  </div>
                  <ul>
                    {done.lines.map((l) => (
                      <li key={l.key}>
                        <span>
                          {l.qty} × {l.name}
                        </span>
                        <strong>৳{l.qty * l.price}</strong>
                      </li>
                    ))}
                  </ul>
                  <div className="sum"><span>{done.booking ? "Pre-order total" : "Subtotal"}</span><strong>৳{done.subtotal}</strong></div>
                  {done.fee > 0 && <div className="sum"><span>Delivery charge</span><strong>৳{done.fee}</strong></div>}
                  {!done.booking && <div className="sum sum--total"><span>Total</span><strong>৳{done.total}</strong></div>}
                  {done.hasFrom && <p className="drawer__hint">&ldquo;From&rdquo; prices will be confirmed on the call.</p>}
                </div>

                {cancelStep === "done" ? (
                  <p className="drawer__cancelled" role="status">
                    Your {done.booking ? "booking" : "order"} <strong>{done.id}</strong> has been cancelled.
                  </p>
                ) : (
                  <div className="drawer__cancel">
                    {cancelStep === "idle" && (
                      <button type="button" className="drawer__cancelLink" onClick={() => setCancelStep("confirm")}>
                        Cancel this {done.booking ? "booking" : "order"}
                      </button>
                    )}
                    {(cancelStep === "confirm" || cancelStep === "busy") && (
                      <div className="drawer__cancelConfirm">
                        <p>Cancel {done.id}? This works only until we start on it.</p>
                        <div>
                          <button type="button" className="btn btn--red btn--sm" onClick={cancelNow} disabled={cancelStep === "busy"}>
                            {cancelStep === "busy" ? "Cancelling..." : "Yes, cancel"}
                          </button>
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCancelStep("idle")} disabled={cancelStep === "busy"}>
                            Keep it
                          </button>
                        </div>
                      </div>
                    )}
                    {cancelMsg && (
                      <p className="drawer__error" role="alert">
                        {cancelMsg}
                      </p>
                    )}
                  </div>
                )}

                <div className="drawer__doneActions">
                  <button type="button" className="btn btn--red btn--sm" onClick={downloadReceipt} disabled={pdfBusy}>
                    <FaDownload aria-hidden /> {pdfBusy ? "Preparing PDF..." : "Download receipt (PDF)"}
                  </button>
                  <a href={SITE.phoneHref} className="btn btn--ghost btn--sm">
                    <FaPhoneAlt aria-hidden /> {SITE.phone}
                  </a>
                  <Link to="/menu" className="btn btn--yellow btn--sm" onClick={closeCart}>
                    Back to Menu
                  </Link>
                  <Link to="/my-orders" className="btn btn--ghost btn--sm" onClick={closeCart}>
                    My Orders
                  </Link>
                </div>
                {pdfFailed && <p className="drawer__hint">Could not create the PDF on this device. Please take a screenshot of this screen instead.</p>}
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
