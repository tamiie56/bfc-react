import { HOURS } from "../data/content";
import QtyStepper from "./QtyStepper";

/** Table-booking pieces used by the checkout drawer when "Dine-in" is selected. */

export interface Booking {
  date: string;
  time: string;
  guests: number;
}

export const MAX_GUESTS = 20;

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (h: number) => `${pad(h)}:00`;

export const todayInput = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function prettyDate(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Returns an error message per field (empty object when everything is fine). */
export function validateBooking(b: Booking): Record<string, string> {
  const e: Record<string, string> = {};
  const today = todayInput();

  if (!b.date || b.date < today) e.date = "Pick today or a future date";

  if (!b.time) {
    e.time = "Pick a time";
  } else {
    const [h, m] = b.time.split(":").map(Number);
    const mins = h * 60 + m;
    if (mins < HOURS.open * 60 || mins > (HOURS.close - 1) * 60) {
      e.time = `Pick a time between ${hhmm(HOURS.open)} and ${hhmm(HOURS.close - 1)}`;
    } else if (b.date === today) {
      const now = new Date();
      if (mins <= now.getHours() * 60 + now.getMinutes()) e.time = "That time has already passed today";
    }
  }
  return e;
}

interface Props {
  value: Booking;
  onChange: (next: Booking) => void;
  errors: Record<string, string>;
}

export function BookingFields({ value, onChange, errors }: Props) {
  return (
    <>
      <div className="book__row">
        <label className="field">
          <span>Date</span>
          <input
            type="date"
            min={todayInput()}
            value={value.date}
            onChange={(e) => onChange({ ...value, date: e.target.value })}
          />
          {errors.date && <em>{errors.date}</em>}
        </label>
        <label className="field">
          <span>Time</span>
          <input
            type="time"
            min={hhmm(HOURS.open)}
            max={hhmm(HOURS.close - 1)}
            value={value.time}
            onChange={(e) => onChange({ ...value, time: e.target.value })}
          />
          {errors.time && <em>{errors.time}</em>}
        </label>
      </div>

      <div className="field">
        <span>Guests</span>
        <QtyStepper value={value.guests} onChange={(g) => onChange({ ...value, guests: g })} min={1} max={MAX_GUESTS} />
      </div>
    </>
  );
}
