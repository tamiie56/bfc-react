import { useState } from "react";
import type { FormEvent } from "react";
import { FaCalendarCheck, FaCheckCircle, FaPhoneAlt } from "react-icons/fa";
import { newBookingId, submitOrder, validPhone } from "../cart/order";
import { AREAS, HOURS, SITE } from "../data/content";
import QtyStepper from "./QtyStepper";

const CUSTOMER_KEY = "bfc-customer-v1";
const MAX_GUESTS = 20;

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hhmm = (h: number) => `${pad(h)}:00`;

function loadCustomer() {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    if (raw) {
      const c = JSON.parse(raw) as Record<string, string>;
      return { name: c.name ?? "", phone: c.phone ?? "", area: c.area ?? AREAS[0] };
    }
  } catch {
    /* ignore */
  }
  return { name: "", phone: "", area: AREAS[0] };
}

function saveCustomer(name: string, phone: string, area: string) {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    const old = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ ...old, name, phone, area }));
  } catch {
    /* ignore */
  }
}

function prettyDate(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  dishName: string;
  onBack: () => void;
  onClose: () => void;
}

interface Done {
  id: string;
  name: string;
  phone: string;
  area: string;
  date: string;
  time: string;
  guests: number;
}

export default function BookingForm({ dishName, onBack, onClose }: Props) {
  const today = toDateInput(new Date());
  const [form, setForm] = useState({ ...loadCustomer(), date: today, time: "", note: "" });
  const [guests, setGuests] = useState(2);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const set = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Please enter your name";
    if (!validPhone(form.phone)) e.phone = "Enter a valid mobile number (e.g. 01XXXXXXXXX)";
    if (!form.date || form.date < today) e.date = "Pick today or a future date";
    if (!form.time) {
      e.time = "Pick a time";
    } else {
      const [h, m] = form.time.split(":").map(Number);
      const mins = h * 60 + m;
      if (mins < HOURS.open * 60 || mins > (HOURS.close - 1) * 60) {
        e.time = `We are open ${hhmm(HOURS.open)} - ${hhmm(HOURS.close)}, pick a time between ${hhmm(HOURS.open)} and ${hhmm(HOURS.close - 1)}`;
      } else if (form.date === today) {
        const now = new Date();
        if (mins <= now.getHours() * 60 + now.getMinutes()) e.time = "That time has already passed today";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (busy || !validate()) return;

    const id = newBookingId();
    const payload: Record<string, string> = {
      "bot-field": "",
      bookingId: id,
      name: form.name.trim(),
      phone: form.phone.trim(),
      area: form.area,
      date: form.date,
      time: form.time,
      guests: String(guests),
      dish: dishName,
      note: form.note.trim(),
      placedAt: new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" }),
    };

    setBusy(true);
    setFailed(false);
    try {
      await submitOrder(payload, "booking");
      saveCustomer(form.name, form.phone, form.area);
      setDone({
        id,
        name: form.name.trim(),
        phone: form.phone.trim(),
        area: form.area,
        date: form.date,
        time: form.time,
        guests,
      });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="book book--done">
        <FaCheckCircle className="book__tick" aria-hidden />
        <h3>Table request received</h3>
        <p>
          Thank you, {done.name}! Your booking <strong>{done.id}</strong> has been received. We will call you on{" "}
          <strong>{done.phone}</strong> to confirm your table.
        </p>
        <ul className="book__summary">
          <li><span>Outlet</span><strong>{done.area}</strong></li>
          <li><span>Date</span><strong>{prettyDate(done.date)}</strong></li>
          <li><span>Time</span><strong>{done.time}</strong></li>
          <li><span>Guests</span><strong>{done.guests}</strong></li>
        </ul>
        <button type="button" className="btn btn--yellow btn--sm" onClick={onClose}>
          Done
        </button>
      </div>
    );
  }

  return (
    <form className="book" onSubmit={submit} noValidate>
      <div className="book__head">
        <h3>Book a Table</h3>
        <p>Reserve your seat and enjoy {dishName} at the outlet.</p>
      </div>

      <label className="field">
        <span>Full name</span>
        <input value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
        {errors.name && <em>{errors.name}</em>}
      </label>

      <label className="field">
        <span>Mobile number</span>
        <input
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          inputMode="tel"
          placeholder="01XXXXXXXXX"
          autoComplete="tel"
        />
        {errors.phone && <em>{errors.phone}</em>}
      </label>

      <label className="field">
        <span>Outlet</span>
        <select value={form.area} onChange={(e) => set("area", e.target.value)}>
          {AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>

      <div className="book__row">
        <label className="field">
          <span>Date</span>
          <input type="date" min={today} value={form.date} onChange={(e) => set("date", e.target.value)} />
          {errors.date && <em>{errors.date}</em>}
        </label>
        <label className="field">
          <span>Time</span>
          <input
            type="time"
            min={hhmm(HOURS.open)}
            max={hhmm(HOURS.close - 1)}
            value={form.time}
            onChange={(e) => set("time", e.target.value)}
          />
          {errors.time && <em>{errors.time}</em>}
        </label>
      </div>

      <div className="field">
        <span>Guests</span>
        <QtyStepper value={guests} onChange={setGuests} min={1} max={MAX_GUESTS} />
      </div>

      <label className="field">
        <span>Note (optional)</span>
        <textarea
          rows={2}
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="Birthday, high chair, window seat, etc."
        />
      </label>

      {failed && (
        <p className="drawer__error" role="alert">
          Sorry, we could not send your request. Please try again or call {SITE.phone}.
        </p>
      )}

      <div className="modal__actions">
        <button type="button" className="btn modal__btn modal__btn--cart" onClick={onBack} disabled={busy}>
          Back
        </button>
        <button type="submit" className="btn modal__btn modal__btn--now" disabled={busy}>
          <FaCalendarCheck aria-hidden /> {busy ? "Sending…" : "Book Table"}
        </button>
      </div>

      <div className="modal__foot">
        <a href={SITE.phoneHref}>
          <FaPhoneAlt aria-hidden /> Prefer to call? {SITE.phone}
        </a>
        <span>We confirm by call</span>
      </div>
    </form>
  );
}
