import { useMemo, useState } from "react";
import { FaCalendarCheck, FaPhoneAlt, FaSearch, FaTrashAlt } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import { ago, fmtClock, fmtDateTime, fmtDay, money, todayDhaka } from "../format";
import { BOOKING_STATUSES, bookingLabel, nextBookingStep } from "../status";
import { deleteBooking, setBookingStatus, useBookings } from "../store";
import type { AdminBooking, BookingStatus } from "../store";
import { Drawer, Empty, PageHead, Pill, useConfirm, useToast } from "../ui";

type When = "upcoming" | "today" | "past" | "all";

export default function Bookings() {
  const bookings = useBookings();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [when, setWhen] = useState<When>(params.get("open") ? "all" : "upcoming");
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const [query, setQuery] = useState("");
  const { ask, dialog } = useConfirm();

  const today = todayDhaka();
  const openId = params.get("open");
  const open = openId ? bookings.find((b) => b.id === openId) ?? null : null;

  const setOpen = (id: string | null) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (id) n.set("open", id);
        else n.delete("open");
        return n;
      },
      { replace: true }
    );

  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings
      .filter((b) => {
        if (when === "upcoming" && b.date < today) return false;
        if (when === "today" && b.date !== today) return false;
        if (when === "past" && b.date >= today) return false;
        if (!q) return true;
        return b.id.toLowerCase().includes(q) || b.area.toLowerCase().includes(q) || b.name.toLowerCase().includes(q) || b.phone.includes(q);
      })
      .sort((a, b) => (when === "past" ? (b.date + b.time).localeCompare(a.date + a.time) : (a.date + a.time).localeCompare(b.date + b.time)));
  }, [bookings, when, query, today]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: base.length };
    BOOKING_STATUSES.forEach((s) => (c[s] = base.filter((b) => b.status === s).length));
    return c;
  }, [base]);

  const rows = status === "all" ? base : base.filter((b) => b.status === status);

  const advance = (b: AdminBooking) => {
    const step = nextBookingStep(b);
    if (!step) return;
    setBookingStatus(b.id, step.to);
    toast(`${b.id} - ${bookingLabel(step.to)}`);
  };

  const cancel = (b: AdminBooking) =>
    ask({
      title: `Cancel ${b.id}?`,
      text: `${b.name}'s table booking for ${fmtDay(b.date)} will be marked as cancelled. Remember to let the customer know.`,
      confirmLabel: "Cancel booking",
      danger: true,
      onYes: () => {
        setBookingStatus(b.id, "cancelled");
        toast(`${b.id} cancelled`, "warn");
      },
    });

  const remove = (b: AdminBooking) =>
    ask({
      title: `Delete ${b.id}?`,
      text: "This removes the booking from the panel for good.",
      confirmLabel: "Delete",
      danger: true,
      onYes: () => {
        deleteBooking(b.id);
        setOpen(null);
        toast(`${b.id} deleted`, "warn");
      },
    });

  return (
    <>
      <PageHead title="Table Bookings" sub={`${rows.length} ${rows.length === 1 ? "booking" : "bookings"}`} />

      <div className="adm-toolbar">
        <label className="adm-search">
          <FaSearch aria-hidden />
          <input placeholder="Search booking ID, name or phone" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search bookings" />
        </label>
        <select className="adm-select" value={when} onChange={(e) => setWhen(e.target.value as When)} aria-label="When">
          <option value="upcoming">Today &amp; upcoming</option>
          <option value="today">Today only</option>
          <option value="past">Past</option>
          <option value="all">All time</option>
        </select>
      </div>

      <div className="adm-tabs" role="tablist">
        {(["all", ...BOOKING_STATUSES] as (BookingStatus | "all")[]).map((s) => (
          <button key={s} role="tab" aria-selected={status === s} className={`adm-tab ${status === s ? "is-active" : ""}`} onClick={() => setStatus(s)}>
            {s === "all" ? "All" : bookingLabel(s)} <b>{counts[s] ?? 0}</b>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="adm-card">
          <Empty
            icon={FaCalendarCheck}
            title={bookings.length === 0 ? "No table bookings yet" : "No bookings match these filters"}
            text={
              bookings.length === 0
                ? "Dine-in bookings made on the website appear here so you can confirm them."
                : "Try another time range, status or search word."
            }
          />
        </div>
      ) : (
        <div className="adm-card adm-card--flush">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Outlet</th>
                <th>Customer</th>
                <th>Date &amp; time</th>
                <th className="r">Guests</th>
                <th>Pre-order</th>
                <th>Status</th>
                <th aria-label="Action" />
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const step = nextBookingStep(b);
                return (
                  <tr key={b.id} className={b.status === "pending" ? "is-new" : ""} onClick={() => setOpen(b.id)}>
                    <td data-label="Booking">
                      <b>{b.id}</b>
                      <small>{ago(b.placedAt)}</small>
                    </td>
                    <td data-label="Outlet">
                      <b>{b.area}</b>
                    </td>
                    <td data-label="Customer">
                      <b>{b.name}</b>
                      <small>{b.phone}</small>
                    </td>
                    <td data-label="When">
                      <b>{b.date === today ? "Today" : fmtDay(b.date)}</b>
                      <small>{fmtClock(b.time)}</small>
                    </td>
                    <td data-label="Guests" className="r">
                      {b.guests}
                    </td>
                    <td data-label="Pre-order">{b.lines.length ? `${b.lines.length} item${b.lines.length > 1 ? "s" : ""}` : "-"}</td>
                    <td data-label="Status">
                      <Pill tone={b.status}>{bookingLabel(b.status)}</Pill>
                    </td>
                    <td className="adm-table__act" onClick={(e) => e.stopPropagation()}>
                      {step && (
                        <button className="adm-btn adm-btn--sm adm-btn--red" onClick={() => advance(b)}>
                          {step.label}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Drawer
          title={open.id}
          sub={<Pill tone={open.status}>{bookingLabel(open.status)}</Pill>}
          onClose={() => setOpen(null)}
          footer={
            <>
              {nextBookingStep(open) && (
                <button className="adm-btn adm-btn--red adm-btn--grow" onClick={() => advance(open)}>
                  {nextBookingStep(open)!.label}
                </button>
              )}
              {(open.status === "pending" || open.status === "confirmed") && (
                <button className="adm-btn adm-btn--ghost" onClick={() => cancel(open)}>
                  Cancel booking
                </button>
              )}
              {open.status === "cancelled" && (
                <button className="adm-btn adm-btn--ghost adm-btn--grow" onClick={() => setBookingStatus(open.id, "pending")}>
                  Reopen as pending
                </button>
              )}
            </>
          }
        >
          <section className="adm-detail adm-detail--hero">
            <p className="adm-detail__big">
              {open.date === today ? "Today" : fmtDay(open.date)} - {fmtClock(open.time)}
            </p>
            <p>
              {open.guests} {open.guests === 1 ? "guest" : "guests"}
            </p>
          </section>

          <section className="adm-detail">
            <h4>Customer</h4>
            <p>
              <b>{open.name}</b>
            </p>
            <p>
              <a className="adm-link" href={`tel:${open.phone}`}>
                <FaPhoneAlt aria-hidden /> {open.phone}
              </a>
            </p>
            <p>{open.area} outlet</p>
            {open.note && <p className="adm-note">&ldquo;{open.note}&rdquo;</p>}
          </section>

          {open.lines.length > 0 && (
            <section className="adm-detail">
              <h4>Pre-ordered items</h4>
              <ul className="adm-lines">
                {open.lines.map((l) => (
                  <li key={l.name}>
                    <span>
                      <b>{l.qty} &times;</b> {l.name}
                      {l.from && <em> (from)</em>}
                      <small>{l.category}</small>
                    </span>
                    <b>{money(l.qty * l.price)}</b>
                  </li>
                ))}
              </ul>
              <dl className="adm-totals">
                <div className="is-total">
                  <dt>Estimated</dt>
                  <dd>{money(open.subtotal)}</dd>
                </div>
              </dl>
              {open.hasFrom && <p className="adm-warn">Contains &ldquo;From&rdquo; priced items - final price is confirmed at the outlet.</p>}
            </section>
          )}

          <section className="adm-detail">
            <h4>Timeline</h4>
            <p className="adm-muted">Requested {fmtDateTime(open.placedAt)}</p>
            <p className="adm-muted">Last update {fmtDateTime(open.updatedAt)}</p>
          </section>

          <div className="adm-detail__tools">
            <button className="adm-btn adm-btn--ghost adm-btn--sm adm-btn--text-danger" onClick={() => remove(open)}>
              <FaTrashAlt aria-hidden /> Delete
            </button>
          </div>
        </Drawer>
      )}

      {dialog}
    </>
  );
}
