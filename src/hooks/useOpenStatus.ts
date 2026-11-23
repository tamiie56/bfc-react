import { useEffect, useState } from "react";
import { HOURS } from "../data/content";

export function dhakaHour(): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      hour: "numeric",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const h = parts.find((p) => p.type === "hour");
    if (h) return Number(h.value) % 24;
  } catch {
    /* fall through to local time */
  }
  return new Date().getHours();
}

/** Live "open / closed" status based on Dhaka time and the outlet hours. */
export function useOpenStatus() {
  const [hour, setHour] = useState(dhakaHour);

  useEffect(() => {
    const id = setInterval(() => setHour(dhakaHour()), 60000);
    return () => clearInterval(id);
  }, []);

  const open = hour >= HOURS.open && hour < HOURS.close;
  return {
    open,
    label: open ? "Open now · until 11.00 pm" : "Closed now · opens 10.00 am",
  };
}
