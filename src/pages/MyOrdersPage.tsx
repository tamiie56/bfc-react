import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FaMapMarkerAlt, FaPhoneAlt, FaSyncAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import { bookingLabel, orderLabel } from "../admin/status";
import { cancelMyOrder, findMyOrders } from "../admin/store";
import type { BookingStatus, MyOrder, OrderStatus } from "../admin/store";
import heroImg from "../assets/images/hero.jpg";
import { validPhone } from "../cart/order";
import { SITE } from "../data/content";

const CUSTOMER_KEY = "bfc-customer-v1";

const savedPhone = (): string => {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    if (raw) return String((JSON.parse(raw) as Record<string, string>).phone ?? "");
  } catch {
    /* ignore */
  }
  return "";
};

const taka = (n: number) => "৳" + Math.round(n).toLocaleString("en-US");

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

const prettyDay = (d?: string) => {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};

const prettyClock = (t?: string) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const canCancel = (o: MyOrder) => (o.kind === "booking" ? o.status === "pending" : o.status === "new");

function statusText(o: MyOrder): string {
  if (o.kind === "booking") return bookingLabel(o.status as BookingStatus);
  if (o.status === "new") return "Received";
  return orderLabel(o.status as OrderStatus, o.type ?? "Online Order");
}

export default function MyOrdersPage() {
  const [phone, setPhone] = useState(savedPhone);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<MyOrder[] | null>(null);
  const [searched, setSearched] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const searchedRef = useRef("");

  const load = useCallback(async (p: string, quiet = false) => {
    if (!quiet) setBusy(true);
    const rows = await findMyOrders(p);
    if (!quiet) setBusy(false);
    if (rows === null) {
      if (!quiet) setLoadFailed(true);
      return;
    }
    setLoadFailed(false);
    setList(rows);
    setSearched(p);
    searchedRef.current = p;
  }, []);

  // the phone used at checkout on this device: show the orders right away
  useEffect(() => {
    const p = savedPhone();
    if (validPhone(p)) void load(p);
  }, [load]);

  // keep the statuses fresh while the page is open
  useEffect(() => {
    const t = setInterval(() => {
      if (searchedRef.current && !document.hidden) void load(searchedRef.current, true);
    }, 15000);
    return () => clearInterval(t);
  }, [load]);

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (busy) return;
    if (!validPhone(phone)) {
      setError("Enter the mobile number you used (01XXXXXXXXX)");
      return;
    }
    setError("");
    setNotes({});
    setConfirmId(null);
    void load(phone.trim());
  };

  const cancel = async (o: MyOrder) => {
    setCancelBusy(o.id);
    const res = await cancelMyOrder(o.id, searched);
    setCancelBusy(null);
    setConfirmId(null);
    if (res === "ok" || res === "already_cancelled") {
      setNotes((n) => ({ ...n, [o.id]: "" }));
    } else {
      setNotes((n) => ({
        ...n,
        [o.id]:
          res === "too_late"
            ? `We have already started on it, so it can't be cancelled online. Please call ${SITE.phone}.`
            : `We could not cancel it right now. Please try again or call ${SITE.phone}.`,
      }));
    }
    void load(searched, true);
  };

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
            <span>My Orders</span>
          </nav>
          <h1 className="page-hero__title">My Orders</h1>
          <p className="page-hero__lead">See your orders and table bookings, and cancel one before we start preparing it.</p>
        </div>
      </section>

      <section className="feedback section">
        <div className="container myo">
          <div className="feedback__card myo__lookup">
            <form onSubmit={submit} noValidate>
              <label className="field">
                <span>Your mobile number</span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError("");
                  }}
                  placeholder="01XXXXXXXXX"
                  autoComplete="tel"
                  aria-invalid={!!error}
                />
                {error && <small className="field__err">{error}</small>}
              </label>
              <button type="submit" className="btn btn--red feedback__submit" disabled={busy}>
                {busy ? "Looking..." : "Show my orders"}
              </button>
            </form>
          </div>

          {loadFailed && (
            <p className="myo__msg myo__msg--err" role="alert">
              We could not load your orders right now. Please try again or call {SITE.phone}.
            </p>
          )}

          {list && !loadFailed && (
            <>
              <div className="myo__head">
                <h2>
                  {list.length === 0 ? "No recent orders" : `${list.length} recent ${list.length === 1 ? "order" : "orders"}`}
                </h2>
                <button type="button" className="myo__refresh" onClick={() => void load(searched)} disabled={busy}>
                  <FaSyncAlt aria-hidden /> Refresh
                </button>
              </div>

              {list.length === 0 && (
                <p className="myo__msg">
                  We found no orders or bookings for {searched} in the last 30 days. Check the number, or{" "}
                  <Link to="/menu">place an order</Link>.
                </p>
              )}

              <ul className="myo__list">
                {list.map((o) => (
                  <li key={o.id} className={`myo__card myo__card--${o.status}`}>
                    <div className="myo__top">
                      <div>
                        <b className="myo__id">{o.id}</b>
                        <small>{when(o.placedAt)}</small>
                      </div>
                      <span className={`myo__pill myo__pill--${o.status}`}>{statusText(o)}</span>
                    </div>

                    <p className="myo__meta">
                      <FaMapMarkerAlt aria-hidden /> {o.area}
                      {" · "}
                      {o.kind === "booking"
                        ? `Table · ${prettyDay(o.date)} ${prettyClock(o.time)} · ${o.guests} ${o.guests === 1 ? "guest" : "guests"}`
                        : o.type}
                    </p>

                    {o.lines.length > 0 && (
                      <ul className="myo__items">
                        {o.lines.map((l) => (
                          <li key={l.name}>
                            <span>
                              {l.qty} × {l.name}
                            </span>
                            <b>{taka(l.qty * l.price)}</b>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="myo__sum">
                      <span>{o.kind === "booking" ? "Pre-order total" : "Total"}</span>
                      <b>{taka(o.kind === "booking" ? o.subtotal : o.total ?? o.subtotal)}</b>
                    </div>

                    {o.status === "cancelled" && (
                      <p className="myo__cancelled">Cancelled{o.cancelledBy === "customer" ? " by you" : ""}.</p>
                    )}

                    {canCancel(o) &&
                      (confirmId === o.id ? (
                        <div className="myo__confirm">
                          <p>Cancel {o.id}?</p>
                          <div>
                            <button type="button" className="btn btn--red btn--sm" onClick={() => void cancel(o)} disabled={cancelBusy === o.id}>
                              {cancelBusy === o.id ? "Cancelling..." : "Yes, cancel"}
                            </button>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmId(null)} disabled={cancelBusy === o.id}>
                              Keep it
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" className="myo__cancelBtn" onClick={() => setConfirmId(o.id)}>
                          Cancel {o.kind === "booking" ? "booking" : "order"}
                        </button>
                      ))}

                    {!canCancel(o) && o.status !== "cancelled" && o.status !== "completed" && (
                      <p className="myo__hint">
                        Already in progress - to change it please call{" "}
                        <a href={SITE.phoneHref}>
                          <FaPhoneAlt aria-hidden /> {SITE.phone}
                        </a>
                      </p>
                    )}

                    {notes[o.id] && (
                      <p className="myo__msg myo__msg--err" role="alert">
                        {notes[o.id]}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </>
  );
}
