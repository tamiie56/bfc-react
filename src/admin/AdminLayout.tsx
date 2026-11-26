import { useEffect, useRef, useState } from "react";
import {
  FaBars,
  FaCalendarCheck,
  FaChartLine,
  FaClipboardList,
  FaCog,
  FaExternalLinkAlt,
  FaSignOutAlt,
  FaUsers,
  FaUtensils,
  FaVolumeMute,
  FaVolumeUp,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";
import { logout } from "./auth";
import { onStoreError, updateSettings, useBookings, useOrders, useOrdersReady, useSettings } from "./store";
import { ToastProvider, useToast } from "./ui";

const NAV: { to: string; label: string; icon: IconType; end?: boolean; badge?: "orders" | "bookings" }[] = [
  { to: "/admin", label: "Dashboard", icon: FaChartLine, end: true },
  { to: "/admin/orders", label: "Orders", icon: FaClipboardList, badge: "orders" },
  { to: "/admin/bookings", label: "Table Bookings", icon: FaCalendarCheck, badge: "bookings" },
  { to: "/admin/menu", label: "Menu", icon: FaUtensils },
  { to: "/admin/customers", label: "Customers", icon: FaUsers },
  { to: "/admin/settings", label: "Settings", icon: FaCog },
];

const TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/orders": "Orders",
  "/admin/bookings": "Table Bookings",
  "/admin/menu": "Menu",
  "/admin/customers": "Customers",
  "/admin/settings": "Settings",
};

function beep() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const play = (freq: number, at: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.28);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + at);
      o.stop(ctx.currentTime + at + 0.3);
    };
    play(880, 0);
    play(1175, 0.18);
    setTimeout(() => void ctx.close(), 900);
  } catch {
    /* audio blocked */
  }
}

/** Watches for orders / bookings that arrive while the panel is open. */
function useArrivalAlerts() {
  const orders = useOrders();
  const bookings = useBookings();
  const { sound } = useSettings();
  const ready = useOrdersReady();
  const toast = useToast();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => onStoreError((m) => toast(m, "warn")), [toast]);

  useEffect(() => {
    if (!ready) return; // wait for the first load, otherwise every old order would look "new"
    const ids = [...orders.map((o) => o.id), ...bookings.map((b) => b.id)];
    if (!seen.current) {
      seen.current = new Set(ids);
      return;
    }
    const fresh = [
      ...orders.filter((o) => !seen.current!.has(o.id)).map((o) => `New order ${o.id} - ${o.name}`),
      ...bookings.filter((b) => !seen.current!.has(b.id)).map((b) => `New table booking ${b.id} - ${b.name}`),
    ];
    ids.forEach((id) => seen.current!.add(id));
    if (fresh.length) {
      fresh.slice(0, 2).forEach((t) => toast(t));
      if (sound) beep();
    }
  }, [orders, bookings, ready, sound, toast]);
}

function Shell() {
  const orders = useOrders();
  const bookings = useBookings();
  const { sound } = useSettings();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useArrivalAlerts();

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  const newOrders = orders.filter((o) => o.status === "new").length;
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const badges = { orders: newOrders, bookings: pendingBookings };

  const title = TITLES[pathname.replace(/\/$/, "")] ?? "Admin";

  return (
    <div className="adm adm-shell">
      {open && <div className="adm-scrim" onClick={() => setOpen(false)} />}

      <aside className={`adm-side ${open ? "is-open" : ""}`}>
        <div className="adm-brand">
          <img src={logo} alt="" />
          <div>
            <strong>BFC</strong>
            <span>Team Panel</span>
          </div>
        </div>

        <nav className="adm-nav" aria-label="Admin">
          {NAV.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "is-active" : "")}>
              <Icon aria-hidden />
              <span>{label}</span>
              {badge && badges[badge] > 0 && <b className="adm-badge">{badges[badge]}</b>}
            </NavLink>
          ))}
        </nav>

        <div className="adm-side__foot">
          <a href="/" target="_blank" rel="noreferrer" className="adm-side__link">
            <FaExternalLinkAlt aria-hidden /> View website
          </a>
          <button
            className="adm-side__link"
            onClick={() => {
              logout();
              navigate("/admin", { replace: true });
            }}
          >
            <FaSignOutAlt aria-hidden /> Sign out
          </button>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-top">
          <button className="adm-icon-btn adm-top__menu" onClick={() => setOpen(true)} aria-label="Open menu">
            <FaBars />
          </button>
          <h2 className="adm-top__title">{title}</h2>
          <div className="adm-top__right">
            <button
              className="adm-icon-btn"
              onClick={() => updateSettings({ sound: !sound })}
              aria-label={sound ? "Mute new-order sound" : "Unmute new-order sound"}
              title={sound ? "New-order sound: on" : "New-order sound: off"}
            >
              {sound ? <FaVolumeUp /> : <FaVolumeMute />}
            </button>
            <span className="adm-avatar" title="Signed in as admin">
              A
            </span>
          </div>
        </header>

        <main className="adm-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}
