import { useState, type FormEvent } from "react";
import { FaCheckCircle } from "react-icons/fa";
import { Link } from "react-router-dom";
import { cancelMyOrder } from "../admin/store";
import type { CancelResult } from "../admin/store";
import heroImg from "../assets/images/hero.jpg";
import { SITE } from "../data/content";
import { validPhone } from "../cart/order";

const MESSAGES: Record<Exclude<CancelResult, "ok" | "already_cancelled">, string> = {
  too_late: `We have already started on it, so it can't be cancelled online. Please call ${SITE.phone}.`,
  not_found: "We could not find an order with this ID and phone number. Please check both and try again.",
  error: `We could not cancel it right now. Please try again in a moment or call ${SITE.phone}.`,
};

export default function CancelOrderPage() {
  const [id, setId] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CancelResult | null>(null);
  const [cancelledId, setCancelledId] = useState("");

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (busy) return;
    const e: Record<string, string> = {};
    if (!/^(BFC|TBL)-[A-Z0-9]{4,}$/i.test(id.trim())) e.id = "Enter your order ID, e.g. BFC-1A2B3C";
    if (!validPhone(phone)) e.phone = "Enter the mobile number you used (01XXXXXXXXX)";
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    setResult(null);
    const res = await cancelMyOrder(id, phone);
    setBusy(false);
    setResult(res);
    if (res === "ok" || res === "already_cancelled") setCancelledId(id.trim().toUpperCase());
  }

  const done = result === "ok" || result === "already_cancelled";

  return (
    <>
      <section className="page-hero">
        <div className="page-hero__bg">
          <img src={heroImg} alt="" />
        </div>
        <div className="container page-hero__inner">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to={{ pathname: "/", hash: "#home" }}>Home</Link>
            <span>/</span>
            <span>Cancel Order</span>
          </nav>
          <h1 className="page-hero__title">Cancel Your Order</h1>
          <p className="page-hero__lead">Changed your mind? You can cancel until we start preparing your order.</p>
        </div>
      </section>

      <section className="feedback section">
        <div className="container">
          <div className="feedback__card">
            {done ? (
              <div className="feedback__done" role="status">
                <FaCheckCircle aria-hidden />
                <h2>Order cancelled</h2>
                <p>
                  {cancelledId} has been cancelled. We hope to serve you again soon!
                </p>
                <Link to="/menu" className="btn btn--yellow">
                  Back to Menu
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <label className="field">
                  <span>Order ID</span>
                  <input value={id} onChange={(ev) => { setId(ev.target.value); setErrors((x) => ({ ...x, id: "" })); }} placeholder="BFC-1A2B3C" autoCapitalize="characters" autoComplete="off" aria-invalid={!!errors.id} />
                  {errors.id && <small className="field__err">{errors.id}</small>}
                </label>

                <label className="field">
                  <span>Mobile number used for the order</span>
                  <input type="tel" inputMode="tel" value={phone} onChange={(ev) => { setPhone(ev.target.value); setErrors((x) => ({ ...x, phone: "" })); }} placeholder="01XXXXXXXXX" autoComplete="tel" aria-invalid={!!errors.phone} />
                  {errors.phone && <small className="field__err">{errors.phone}</small>}
                </label>

                {result && !done && (
                  <p className="feedback__error" role="alert">
                    {MESSAGES[result as keyof typeof MESSAGES]}
                  </p>
                )}

                <button type="submit" className="btn btn--red feedback__submit" disabled={busy}>
                  {busy ? "Cancelling..." : "Cancel Order"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
