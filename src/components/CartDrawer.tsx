import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { FaCheckCircle, FaPhoneAlt, FaShoppingBag, FaTimes, FaTrashAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useCart } from "../cart/CartContext";
import type { CartLine } from "../cart/CartContext";
import { ORDER_TYPES, itemsText, newOrderId, submitOrder, validPhone } from "../cart/order";
import type { OrderType } from "../cart/order";
import { AREAS, SITE } from "../data/content";
import { DELIVERY_CHARGE } from "../data/menu";
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
  const { lines, subtotal, hasFrom, setQty, remove, clear, isOpen, closeCart, toast } = useCart();

  const [step, setStep] = useState<Step>("cart");
  const [type, setType] = useState<OrderType>("Delivery");
  const [customer, setCustomer] = useState(loadCustomer);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const fee = type === "Delivery" ? DELIVERY_CHARGE : 0;
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
    if (!isOpen && step === "done") {
      setStep("cart");
      setDone(null);
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (step === "checkout" && lines.length === 0) setStep("cart");
  }, [step, lines.length]);

  const set = (field: "name" | "phone" | "address" | "area", value: string) => {
    setCustomer((c) => ({ ...c, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (customer.name.trim().length < 2) e.name = "Please enter your name";
    if (!validPhone(customer.phone)) e.phone = "Enter a valid mobile number (e.g. 01XXXXXXXXX)";
    if (type === "Delivery" && customer.address.trim().length < 8) e.address = "Please enter your full delivery address";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const place = async (ev: FormEvent) => {
    ev.preventDefault();
    if (busy || !validate()) return;

    const id = newOrderId();
    const payload: Record<string, string> = {
      "bot-field": "",
      orderId: id,
      orderType: type,
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      area: customer.area,
      address: type === "Delivery" ? customer.address.trim() : "",
      note: note.trim(),
      items: itemsText(lines),
      subtotal: String(subtotal),
      delivery: String(fee),
      total: String(total),
      hasFromItems: hasFrom ? "yes" : "no",
      placedAt: new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" }),
    };

    setBusy(true);
    setFailed(false);
    try {
      await submitOrder(payload);
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
      });
      clear();
      setNote("");
      setStep("done");
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
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
                {step === "checkout" && "Checkout"}
                {step === "done" && "Order Placed"}
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
                      <p className="drawer__hint">Delivery charge (৳{DELIVERY_CHARGE}) is added at checkout for home delivery.</p>
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
                    <span>{type === "Delivery" ? "Nearest outlet area" : "Outlet area"}</span>
                    <select value={customer.area} onChange={(e) => set("area", e.target.value)}>
                      {AREAS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </label>

                  {type === "Delivery" && (
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
                      placeholder="Spicy level, extra dip, size, etc."
                    />
                  </label>

                  <div className="drawer__summary">
                    <div className="sum"><span>Subtotal</span><strong>৳{subtotal}</strong></div>
                    <div className="sum"><span>Delivery charge</span><strong>{fee ? `৳${fee}` : "—"}</strong></div>
                    <div className="sum sum--total"><span>Total</span><strong>৳{total}</strong></div>
                    <p className="drawer__hint">Payment: cash on {type === "Delivery" ? "delivery" : "pickup / at the outlet"}.</p>
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
                    {busy ? "Placing order…" : `Place Order · ৳${total}`}
                  </button>
                  <button type="button" className="drawer__back" onClick={() => setStep("cart")} disabled={busy}>
                    ← Back to cart
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
                  Your order <strong>{done.id}</strong> has been received. We will call you on{" "}
                  <strong>{done.phone}</strong> to confirm.
                </p>

                <div className="done__box">
                  <div className="done__meta">
                    <span>{done.type}</span>
                    <span>{done.type === "Delivery" ? done.address : done.area}</span>
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
                  <div className="sum"><span>Subtotal</span><strong>৳{done.subtotal}</strong></div>
                  {done.fee > 0 && <div className="sum"><span>Delivery charge</span><strong>৳{done.fee}</strong></div>}
                  <div className="sum sum--total"><span>Total</span><strong>৳{done.total}</strong></div>
                  {done.hasFrom && <p className="drawer__hint">&ldquo;From&rdquo; prices will be confirmed on the call.</p>}
                </div>

                <div className="drawer__doneActions">
                  <a href={SITE.phoneHref} className="btn btn--ghost btn--sm">
                    <FaPhoneAlt aria-hidden /> {SITE.phone}
                  </a>
                  <Link to="/menu" className="btn btn--yellow btn--sm" onClick={closeCart}>
                    Back to Menu
                  </Link>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
