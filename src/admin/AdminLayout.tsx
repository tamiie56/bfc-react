import { useEffect, useRef, useState } from "react";
import {
  FaBars,
  FaBell,
  FaCalendarCheck,
  FaChartLine,
  FaClipboardList,
  FaCog,
  FaExternalLinkAlt,
  FaSignOutAlt,
  FaCommentDots,
  FaUsers,
  FaUtensils,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import type { Notice } from "./notifications";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";
import { logout } from "./auth";
import { ago, fmtClock, fmtDay, money } from "./format";
import { addNotices, clearNotices, markAllRead, markRead, useNotices } from "./notifications";
import { onStoreError, updateSettings, useBookings, useOrders, useOrdersReady, useSettings } from "./store";
import { Switch, ToastProvider, useToast } from "./ui";

const NAV: { to: string; label: string; icon: IconType; end?: boolean; badge?: "orders" | "bookings" }[] = [
  { to: "/admin", label: "Dashboard", icon: FaChartLine, end: true },
  { to: "/admin/orders", label: "Orders", icon: FaClipboardList, badge: "orders" },
  { to: "/admin/bookings", label: "Table Bookings", icon: FaCalendarCheck, badge: "bookings" },
  { to: "/admin/menu", label: "Menu", icon: FaUtensils },
  { to: "/admin/customers", label: "Customers", icon: FaUsers },
  { to: "/admin/feedback", label: "Feedback", icon: FaCommentDots },
  { to: "/admin/settings", label: "Settings", icon: FaCog },
];

const TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/orders": "Orders",
  "/admin/bookings": "Table Bookings",
  "/admin/menu": "Menu",
  "/admin/customers": "Customers",
  "/admin/feedback": "Feedback",
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

/** Watches for orders / bookings: fills the bell and alerts when something arrives while the panel is open. */
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

    const orderNotice = (o: (typeof orders)[number]): Notice => ({
      id: o.id,
      kind: "order",
      title: `New order ${o.id} - ${o.area}`,
      sub: `${o.name} - ${o.type} - ${money(o.total)}`,
      at: o.placedAt,
      read: false,
    });
    const bookingNotice = (b: (typeof bookings)[number]): Notice => ({
      id: b.id,
      kind: "booking",
      title: `New table booking ${b.id} - ${b.area}`,
      sub: `${b.name} - ${fmtDay(b.date)}, ${fmtClock(b.time)} - ${b.guests} guests`,
      at: b.placedAt,
      read: false,
    });

    const ids = [...orders.map((o) => o.id), ...bookings.map((b) => b.id)];
    if (!seen.current) {
      // first load: whatever is still waiting for the team shows up in the bell
      seen.current = new Set(ids);
      addNotices([...orders.filter((o) => o.status === "new").map(orderNotice), ...bookings.filter((b) => b.status === "pending").map(bookingNotice)]);
      return;
    }

    const freshOrders = orders.filter((o) => !seen.current!.has(o.id));
    const freshBookings = bookings.filter((b) => !seen.current!.has(b.id));
    ids.forEach((id) => seen.current!.add(id));
    if (freshOrders.length + freshBookings.length === 0) return;

    const notices = [...freshOrders.map(orderNotice), ...freshBookings.map(bookingNotice)];
    addNotices(notices);
    notices.slice(0, 2).forEach((n) => toast(n.title));
    if (sound) beep();
  }, [orders, bookings, ready, sound, toast]);
}

function Bell() {
  const notices = useNotices();
  const { sound } = useSettings();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const unread = notices.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const go = (n: Notice) => {
    markRead(n.id);
    setOpen(false);
    navigate(`/admin/${n.kind === "order" ? "orders" : "bookings"}?open=${encodeURIComponent(n.id)}`);
  };

  return (
    <div className="adm-bell" ref={box}>
      <button
        className={`adm-icon-btn ${unread ? "has-unread" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <FaBell />
        {unread > 0 && <b className="adm-bell__count">{unread > 9 ? "9+" : unread}</b>}
      </button>

      {open && (
        <>
          <div className="adm-bell__panel" role="dialog" aria-label="Notifications">
            <header>
              <h3>Notifications</h3>
              <button className="adm-link" onClick={markAllRead} disabled={unread === 0}>
                Mark all read
              </button>
            </header>

            {notices.length === 0 ? (
              <p className="adm-bell__empty">No notifications yet. New orders and table bookings will show up here.</p>
            ) : (
              <ul className="adm-bell__list">
                {notices.map((n) => (
                  <li key={n.id}>
                    <button className={n.read ? "" : "is-unread"} onClick={() => go(n)}>
                      <span className={`adm-bell__ico adm-bell__ico--${n.kind}`} aria-hidden>
                        {n.kind === "order" ? <FaClipboardList /> : <FaCalendarCheck />}
                      </span>
                      <span className="adm-bell__text">
                        <b>{n.title}</b>
                        <small>{n.sub}</small>
                        <small className="adm-bell__time">{ago(n.at)}</small>
                      </span>
                      {!n.read && <i className="adm-bell__dot" aria-label="Unread" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <footer>
              <label className="adm-bell__sound">
                <span>New-order sound</span>
                <Switch checked={sound} onChange={(v) => updateSettings({ sound: v })} label="New-order sound" />
              </label>
              {notices.length > 0 && (
                <button className="adm-link" onClick={clearNotices}>
                  Clear all
                </button>
              )}
            </footer>
          </div>
        </>
      )}
    </div>
  );
}

function Shell() {
  const orders = useOrders();
  const bookings = useBookings();
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
            <Bell />
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
