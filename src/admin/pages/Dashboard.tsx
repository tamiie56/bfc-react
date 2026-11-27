import { useMemo } from "react";
import { FaArrowDown, FaArrowUp, FaCalendarCheck, FaClipboardList, FaFire, FaMoneyBillWave, FaMagic } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { AREAS } from "../../data/content";
import { makeDemoData } from "../demo";
import { addDays, ago, dhakaDay, fmtClock, fmtDay, itemCount, money, todayDhaka } from "../format";
import { orderLabel } from "../status";
import { replaceOrdersAndBookings, useBookings, useOrders, useOrdersReady } from "../store";
import { isRemote } from "../supabase";
import { Pill, PageHead } from "../ui";

function delta(now: number, before: number): { pct: number; up: boolean } | null {
  if (before === 0) return now > 0 ? { pct: 100, up: true } : null;
  const pct = Math.round(((now - before) / before) * 100);
  return { pct: Math.abs(pct), up: pct >= 0 };
}

function Trend({ now, before }: { now: number; before: number }) {
  const d = delta(now, before);
  if (!d) return <small className="adm-kpi__trend">same as yesterday</small>;
  return (
    <small className={`adm-kpi__trend ${d.up ? "is-up" : "is-down"}`}>
      {d.up ? <FaArrowUp aria-hidden /> : <FaArrowDown aria-hidden />} {d.pct}% vs yesterday
    </small>
  );
}

const TYPE_COLORS: Record<string, string> = {
  "Online Delivery": "#c20d00",
  "Online Order": "#ffc80a",
  "Take Away": "#241915",
  "Dine-in": "#8a7b74",
};

export default function Dashboard() {
  const orders = useOrders();
  const bookings = useBookings();
  const ready = useOrdersReady();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const today = todayDhaka();
    const yesterday = addDays(today, -1);
    const valid = orders.filter((o) => o.status !== "cancelled");

    const sumDay = (day: string) => valid.filter((o) => dhakaDay(o.placedAt) === day).reduce((n, o) => n + o.total, 0);
    const countDay = (day: string) => orders.filter((o) => dhakaDay(o.placedAt) === day).length;

    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    const series = days.map((d) => ({ day: d, value: sumDay(d), count: countDay(d) }));

    const week = new Set(days);
    const weekOrders = valid.filter((o) => week.has(dhakaDay(o.placedAt)));

    const byType: Record<string, number> = {};
    weekOrders.forEach((o) => (byType[o.type] = (byType[o.type] ?? 0) + 1));

    const items: Record<string, { qty: number; revenue: number }> = {};
    weekOrders.forEach((o) =>
      o.lines.forEach((l) => {
        const e = (items[l.name] ??= { qty: 0, revenue: 0 });
        e.qty += l.qty;
        e.revenue += l.qty * l.price;
      })
    );
    const top = Object.entries(items)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 6);

    const upcoming = bookings
      .filter((b) => (b.status === "pending" || b.status === "confirmed") && b.date >= today)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 4);

    // outlet-wise numbers for today (all 24 outlets, busiest first)
    const outletMap = new Map<string, { orders: number; revenue: number; fresh: number }>();
    AREAS.forEach((a) => outletMap.set(a, { orders: 0, revenue: 0, fresh: 0 }));
    orders.forEach((o) => {
      const e = outletMap.get(o.area) ?? { orders: 0, revenue: 0, fresh: 0 };
      if (o.status === "new") e.fresh += 1; // waiting orders from any day
      if (dhakaDay(o.placedAt) === today && o.status !== "cancelled") {
        e.orders += 1;
        e.revenue += o.total;
      }
      outletMap.set(o.area, e);
    });
    const outlets = [...outletMap.entries()].sort((a, b) => b[1].fresh - a[1].fresh || b[1].orders - a[1].orders || a[0].localeCompare(b[0]));

    return {
      outlets,
      revenueToday: sumDay(today),
      revenueYesterday: sumDay(yesterday),
      ordersToday: countDay(today),
      ordersYesterday: countDay(yesterday),
      newCount: orders.filter((o) => o.status === "new").length,
      preparing: orders.filter((o) => o.status === "preparing").length,
      ready: orders.filter((o) => o.status === "ready").length,
      bookingsToday: bookings.filter((b) => b.date === today && b.status !== "cancelled").length,
      pendingBookings: bookings.filter((b) => b.status === "pending").length,
      series,
      weekTotal: series.reduce((n, s) => n + s.value, 0),
      byType,
      weekCount: weekOrders.length,
      top,
      upcoming,
      today,
    };
  }, [orders, bookings]);

  const empty = ready && orders.length === 0 && bookings.length === 0;
  const max = Math.max(...stats.series.map((s) => s.value), 1);
  const topMax = Math.max(...stats.top.map(([, v]) => v.qty), 1);
  const recent = orders.slice(0, 6);

  return (
    <>
      <PageHead
        title="Dashboard"
        sub={`Today, ${fmtDay(stats.today)} - live numbers from the website`}
        actions={
          <Link to="/admin/orders" className="adm-btn adm-btn--red">
            <FaClipboardList aria-hidden /> Open orders
          </Link>
        }
      />

      {empty && (
        <div className="adm-card adm-callout">
          <div>
            <h3>No orders yet</h3>
            <p className="adm-muted">
              {isRemote
                ? "Orders and table bookings placed on the website appear here live, on every device that is signed in."
                : "Orders and table bookings placed on the website appear here live. Want to see how the panel looks with data? Load some sample orders - you can clear them anytime from Settings."}
            </p>
          </div>
          {!isRemote && (
            <button
              className="adm-btn adm-btn--dark"
              onClick={() => {
                const d = makeDemoData();
                replaceOrdersAndBookings(d.orders, d.bookings);
              }}
            >
              <FaMagic aria-hidden /> Load sample data
            </button>
          )}
        </div>
      )}

      <section className="adm-kpis">
        <article className="adm-kpi adm-kpi--hero">
          <span className="adm-kpi__icon">
            <FaMoneyBillWave aria-hidden />
          </span>
          <p>Revenue today</p>
          <strong>{money(stats.revenueToday)}</strong>
          <Trend now={stats.revenueToday} before={stats.revenueYesterday} />
        </article>

        <article className="adm-kpi">
          <span className="adm-kpi__icon">
            <FaClipboardList aria-hidden />
          </span>
          <p>Orders today</p>
          <strong>{stats.ordersToday}</strong>
          <Trend now={stats.ordersToday} before={stats.ordersYesterday} />
        </article>

        <article className="adm-kpi">
          <span className="adm-kpi__icon">
            <FaFire aria-hidden />
          </span>
          <p>Needs attention</p>
          <strong>{stats.newCount}</strong>
          <small className="adm-kpi__trend">new orders waiting</small>
        </article>

        <article className="adm-kpi">
          <span className="adm-kpi__icon">
            <FaCalendarCheck aria-hidden />
          </span>
          <p>Bookings today</p>
          <strong>{stats.bookingsToday}</strong>
          <small className="adm-kpi__trend">{stats.pendingBookings} waiting for confirmation</small>
        </article>
      </section>

      <div className="adm-grid adm-grid--2-1">
        <section className="adm-card">
          <header className="adm-card__head">
            <div>
              <h3>Revenue - last 7 days</h3>
              <p className="adm-muted">{money(stats.weekTotal)} total (cancelled orders excluded)</p>
            </div>
          </header>
          <div className="adm-chart" role="img" aria-label="Revenue for the last 7 days">
            {stats.series.map((s, i) => {
              const last = i === stats.series.length - 1;
              return (
                <div className={`adm-chart__col ${last ? "is-today" : ""}`} key={s.day} title={`${fmtDay(s.day)}: ${money(s.value)} (${s.count} orders)`}>
                  <span className="adm-chart__val">{s.value ? money(s.value) : "-"}</span>
                  <div className="adm-chart__track">
                    <div className="adm-chart__bar" style={{ height: `${Math.max((s.value / max) * 100, s.value ? 3 : 0)}%` }} />
                  </div>
                  <span className="adm-chart__lbl">{last ? "Today" : fmtDay(s.day).split(" ")[0]}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="adm-card">
          <header className="adm-card__head">
            <h3>Live queue</h3>
          </header>
          <div className="adm-queue">
            <button onClick={() => navigate("/admin/orders?status=new")}>
              <strong>{stats.newCount}</strong>
              <span>New</span>
            </button>
            <button onClick={() => navigate("/admin/orders?status=preparing")}>
              <strong>{stats.preparing}</strong>
              <span>Preparing</span>
            </button>
            <button onClick={() => navigate("/admin/orders?status=ready")}>
              <strong>{stats.ready}</strong>
              <span>Ready / out</span>
            </button>
          </div>

          <h4 className="adm-sub">Orders by type (7 days)</h4>
          {stats.weekCount === 0 ? (
            <p className="adm-muted">No orders in the last 7 days.</p>
          ) : (
            <>
              <div className="adm-split" aria-hidden>
                {Object.entries(stats.byType).map(([t, n]) => (
                  <span key={t} style={{ width: `${(n / stats.weekCount) * 100}%`, background: TYPE_COLORS[t] ?? "#999" }} />
                ))}
              </div>
              <ul className="adm-legend">
                {Object.entries(stats.byType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([t, n]) => (
                    <li key={t}>
                      <i style={{ background: TYPE_COLORS[t] ?? "#999" }} />
                      {t}
                      <b>
                        {n} <small>({Math.round((n / stats.weekCount) * 100)}%)</small>
                      </b>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <section className="adm-card">
        <header className="adm-card__head">
          <div>
            <h3>Outlet-wise orders - today</h3>
            <p className="adm-muted">Which outlet each order belongs to. Click a row to see only that outlet's orders.</p>
          </div>
        </header>
        <div className="adm-outlets__scroll">
          <table className="adm-outlets">
            <thead>
              <tr>
                <th>Outlet</th>
                <th className="r">New</th>
                <th className="r">Orders today</th>
                <th className="r">Revenue today</th>
              </tr>
            </thead>
            <tbody>
              {stats.outlets.map(([name, v]) => (
                <tr key={name} onClick={() => navigate(`/admin/orders?outlet=${encodeURIComponent(name)}`)}>
                  <td>
                    <b>{name}</b>
                  </td>
                  <td className="r">{v.fresh > 0 ? <span className="adm-outlets__new">{v.fresh}</span> : "-"}</td>
                  <td className="r">{v.orders || "-"}</td>
                  <td className="r">{v.revenue ? money(v.revenue) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="adm-grid adm-grid--2">
        <section className="adm-card">
          <header className="adm-card__head">
            <h3>Recent orders</h3>
            <Link to="/admin/orders" className="adm-link">
              View all
            </Link>
          </header>
          {recent.length === 0 ? (
            <p className="adm-muted">Nothing yet.</p>
          ) : (
            <ul className="adm-list">
              {recent.map((o) => (
                <li key={o.id}>
                  <button className="adm-list__row" onClick={() => navigate(`/admin/orders?open=${encodeURIComponent(o.id)}`)}>
                    <span className="adm-list__main">
                      <b>{o.name}</b>
                      <small>
                        {o.id} - {o.area} - {o.type} - {itemCount(o.lines)} {itemCount(o.lines) === 1 ? "item" : "items"} - {ago(o.placedAt)}
                      </small>
                    </span>
                    <span className="adm-list__end">
                      <b>{money(o.total)}</b>
                      <Pill tone={o.status}>{orderLabel(o.status, o.type)}</Pill>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="adm-stack">
          <section className="adm-card">
            <header className="adm-card__head">
              <h3>Best sellers (7 days)</h3>
            </header>
            {stats.top.length === 0 ? (
              <p className="adm-muted">No sales yet.</p>
            ) : (
              <ul className="adm-bars">
                {stats.top.map(([name, v]) => (
                  <li key={name}>
                    <div>
                      <span>{name}</span>
                      <b>{v.qty} sold</b>
                    </div>
                    <i style={{ width: `${(v.qty / topMax) * 100}%` }} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="adm-card">
            <header className="adm-card__head">
              <h3>Upcoming bookings</h3>
              <Link to="/admin/bookings" className="adm-link">
                View all
              </Link>
            </header>
            {stats.upcoming.length === 0 ? (
              <p className="adm-muted">No upcoming table bookings.</p>
            ) : (
              <ul className="adm-list">
                {stats.upcoming.map((b) => (
                  <li key={b.id}>
                    <button className="adm-list__row" onClick={() => navigate(`/admin/bookings?open=${encodeURIComponent(b.id)}`)}>
                      <span className="adm-list__main">
                        <b>{b.name}</b>
                        <small>
                          {b.date === stats.today ? "Today" : fmtDay(b.date)}, {fmtClock(b.time)} - {b.guests} guests
                        </small>
                      </span>
                      <Pill tone={b.status}>{b.status === "pending" ? "Pending" : "Confirmed"}</Pill>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

    </>
  );
}
