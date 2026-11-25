import { useMemo, useState } from "react";
import { FaDownload, FaPhoneAlt, FaSearch, FaUsers } from "react-icons/fa";
import { ago, csvEscape, downloadFile, fmtDateTime, fmtDay, money, todayDhaka } from "../format";
import { orderLabel } from "../status";
import { useBookings, useOrders } from "../store";
import { Drawer, Empty, PageHead, Pill } from "../ui";

interface Customer {
  key: string;
  name: string;
  phone: string;
  area: string;
  orders: number;
  bookings: number;
  spent: number;
  last: string;
}

/** Same person = same mobile number (last 10 digits, so 017.. and +88017.. match). */
const phoneKey = (p: string) => p.replace(/\D/g, "").slice(-10);

export default function Customers() {
  const orders = useOrders();
  const bookings = useBookings();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"spent" | "orders" | "recent">("spent");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const customers = useMemo(() => {
    const map = new Map<string, Customer>();
    const touch = (name: string, phone: string, area: string, at: string) => {
      const key = phoneKey(phone) || phone;
      let c = map.get(key);
      if (!c) {
        c = { key, name, phone, area, orders: 0, bookings: 0, spent: 0, last: at };
        map.set(key, c);
      }
      if (at >= c.last) {
        c.last = at;
        c.name = name;
        c.area = area;
        c.phone = phone;
      }
      return c;
    };
    orders.forEach((o) => {
      const c = touch(o.name, o.phone, o.area, o.placedAt);
      c.orders += 1;
      if (o.status !== "cancelled") c.spent += o.total;
    });
    bookings.forEach((b) => {
      const c = touch(b.name, b.phone, b.area, b.placedAt);
      c.bookings += 1;
    });
    return [...map.values()];
  }, [orders, bookings]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = customers.filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q));
    return list.sort((a, b) =>
      sort === "spent" ? b.spent - a.spent : sort === "orders" ? b.orders + b.bookings - (a.orders + a.bookings) : b.last.localeCompare(a.last)
    );
  }, [customers, query, sort]);

  const open = openKey ? customers.find((c) => c.key === openKey) ?? null : null;
  const openOrders = open ? orders.filter((o) => (phoneKey(o.phone) || o.phone) === open.key) : [];
  const openBookings = open ? bookings.filter((b) => (phoneKey(b.phone) || b.phone) === open.key) : [];

  const exportCsv = () => {
    const head = ["Name", "Phone", "Area", "Orders", "Bookings", "Total spent", "Last activity"];
    const lines = rows.map((c) => [c.name, c.phone, c.area, c.orders, c.bookings, c.spent, fmtDateTime(c.last)].map(csvEscape).join(","));
    downloadFile(`bfc-customers-${todayDhaka()}.csv`, [head.join(","), ...lines].join("\n"), "text/csv");
  };

  return (
    <>
      <PageHead
        title="Customers"
        sub={`${customers.length} ${customers.length === 1 ? "customer" : "customers"} - built automatically from orders and bookings`}
        actions={
          <button className="adm-btn adm-btn--ghost" onClick={exportCsv} disabled={rows.length === 0}>
            <FaDownload aria-hidden /> Export CSV
          </button>
        }
      />

      <div className="adm-toolbar">
        <label className="adm-search">
          <FaSearch aria-hidden />
          <input placeholder="Search name or phone" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search customers" />
        </label>
        <select className="adm-select" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort by">
          <option value="spent">Top spenders</option>
          <option value="orders">Most orders</option>
          <option value="recent">Most recent</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="adm-card">
          <Empty
            icon={FaUsers}
            title={customers.length === 0 ? "No customers yet" : "No customer matches"}
            text={customers.length === 0 ? "Customers appear here after their first order or table booking." : "Try another name or number."}
          />
        </div>
      ) : (
        <div className="adm-card adm-card--flush">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Area</th>
                <th className="r">Orders</th>
                <th className="r">Bookings</th>
                <th className="r">Total spent</th>
                <th>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.key} onClick={() => setOpenKey(c.key)}>
                  <td data-label="Customer">
                    <b>{c.name}</b>
                    <small>{c.phone}</small>
                  </td>
                  <td data-label="Area">{c.area}</td>
                  <td data-label="Orders" className="r">
                    {c.orders}
                  </td>
                  <td data-label="Bookings" className="r">
                    {c.bookings}
                  </td>
                  <td data-label="Spent" className="r">
                    <b>{money(c.spent)}</b>
                  </td>
                  <td data-label="Last">{ago(c.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Drawer
          title={open.name}
          sub={
            <a className="adm-link" href={`tel:${open.phone}`}>
              <FaPhoneAlt aria-hidden /> {open.phone}
            </a>
          }
          onClose={() => setOpenKey(null)}
        >
          <div className="adm-mini-kpis">
            <div>
              <strong>{money(open.spent)}</strong>
              <span>Total spent</span>
            </div>
            <div>
              <strong>{open.orders}</strong>
              <span>Orders</span>
            </div>
            <div>
              <strong>{open.orders ? money(open.spent / Math.max(1, openOrders.filter((o) => o.status !== "cancelled").length)) : "-"}</strong>
              <span>Avg. order</span>
            </div>
          </div>

          <section className="adm-detail">
            <h4>Order history</h4>
            {openOrders.length === 0 ? (
              <p className="adm-muted">No orders.</p>
            ) : (
              <ul className="adm-list">
                {openOrders.map((o) => (
                  <li key={o.id} className="adm-list__row adm-list__row--static">
                    <span className="adm-list__main">
                      <b>{o.id}</b>
                      <small>
                        {fmtDateTime(o.placedAt)} - {o.type}
                      </small>
                    </span>
                    <span className="adm-list__end">
                      <b>{money(o.total)}</b>
                      <Pill tone={o.status}>{orderLabel(o.status, o.type)}</Pill>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {openBookings.length > 0 && (
            <section className="adm-detail">
              <h4>Table bookings</h4>
              <ul className="adm-list">
                {openBookings.map((b) => (
                  <li key={b.id} className="adm-list__row adm-list__row--static">
                    <span className="adm-list__main">
                      <b>{b.id}</b>
                      <small>
                        {fmtDay(b.date)} - {b.guests} guests
                      </small>
                    </span>
                    <Pill tone={b.status}>{b.status[0].toUpperCase() + b.status.slice(1)}</Pill>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </Drawer>
      )}
    </>
  );
}
