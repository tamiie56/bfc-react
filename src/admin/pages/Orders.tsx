import { useMemo, useState } from "react";
import { FaBan, FaClipboardList, FaDownload, FaMapMarkerAlt, FaPhoneAlt, FaPrint, FaSearch, FaTrashAlt } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import { AREAS } from "../../data/content";
import { addDays, ago, csvEscape, dhakaDay, downloadFile, fmtDateTime, fmtTime, itemCount, money, todayDhaka } from "../format";
import { printReceipt } from "../receipt";
import { ORDER_STATUSES, isActiveOrder, nextOrderStep, orderLabel } from "../status";
import { deleteOrder, setOrderStatus, useOrders } from "../store";
import type { AdminOrder, OrderStatus } from "../store";
import { Drawer, Empty, PageHead, Pill, useConfirm, useToast } from "../ui";

type Period = "today" | "yesterday" | "7d" | "30d" | "all";
const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

const STATUS_TAB_LABEL: Record<OrderStatus | "all", string> = {
  all: "All",
  new: "New",
  preparing: "Preparing",
  ready: "Ready / out",
  completed: "Completed",
  cancelled: "Cancelled",
};

function inPeriod(o: AdminOrder, p: Period): boolean {
  if (p === "all") return true;
  const day = dhakaDay(o.placedAt);
  const today = todayDhaka();
  if (p === "today") return day === today;
  if (p === "yesterday") return day === addDays(today, -1);
  const from = addDays(today, p === "7d" ? -6 : -29);
  return day >= from && day <= today;
}

export default function Orders() {
  const orders = useOrders();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [period, setPeriod] = useState<Period>(params.get("open") ? "all" : "7d");
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const { ask, dialog } = useConfirm();
  const outlet = params.get("outlet") ?? "all";

  const rawStatus = params.get("status");
  const status = (ORDER_STATUSES as string[]).includes(rawStatus ?? "") ? (rawStatus as OrderStatus) : "all";
  const openId = params.get("open");
  const open = openId ? orders.find((o) => o.id === openId) ?? null : null;

  const setStatus = (s: OrderStatus | "all") =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (s === "all") n.delete("status");
        else n.set("status", s);
        return n;
      },
      { replace: true }
    );

  const setOutlet = (a: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (a === "all") n.delete("outlet");
        else n.set("outlet", a);
        return n;
      },
      { replace: true }
    );

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

  // everything except the status tab, so the tab counts stay meaningful
  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (!inPeriod(o, period)) return false;
      if (type !== "all" && o.type !== type) return false;
      if (outlet !== "all" && o.area !== outlet) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q) ||
        o.area.toLowerCase().includes(q) ||
        o.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "") || "\u0000") ||
        o.phone.includes(q)
      );
    });
  }, [orders, period, type, query, outlet]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: base.length };
    ORDER_STATUSES.forEach((s) => (c[s] = base.filter((o) => o.status === s).length));
    return c;
  }, [base]);

  // how many live orders each outlet has in the chosen period (shown inside the outlet dropdown)
  const outletCounts = useMemo(() => {
    const c: Record<string, number> = {};
    orders.forEach((o) => {
      if (!inPeriod(o, period) || o.status === "cancelled") return;
      if (type !== "all" && o.type !== type) return;
      c[o.area] = (c[o.area] ?? 0) + 1;
    });
    return c;
  }, [orders, period, type]);
  const knownAreas = useMemo(() => {
    const extra = Array.from(new Set(orders.map((o) => o.area))).filter((a) => a && !AREAS.includes(a));
    return [...AREAS, ...extra];
  }, [orders]);

  const rows = status === "all" ? base : base.filter((o) => o.status === status);
  const totalShown = rows.filter((o) => o.status !== "cancelled").reduce((n, o) => n + o.total, 0);

  const advance = (o: AdminOrder) => {
    const step = nextOrderStep(o);
    if (!step) return;
    setOrderStatus(o.id, step.to);
    toast(`${o.id} - ${orderLabel(step.to, o.type)}`);
  };

  const cancel = (o: AdminOrder) =>
    ask({
      title: `Cancel ${o.id}?`,
      text: `${o.name}'s order (${o.area}) will be marked as cancelled and won't count towards revenue.`,
      confirmLabel: "Cancel order",
      danger: true,
      onYes: () => {
        setOrderStatus(o.id, "cancelled");
        toast(`${o.id} cancelled`, "warn");
      },
    });

  const remove = (o: AdminOrder) =>
    ask({
      title: `Delete ${o.id}?`,
      text: "This removes the order from the panel for good. Use it for test orders only.",
      confirmLabel: "Delete",
      danger: true,
      onYes: () => {
        deleteOrder(o.id);
        setOpen(null);
        toast(`${o.id} deleted`, "warn");
      },
    });

  const exportCsv = () => {
    const head = ["Order ID", "Placed at", "Type", "Status", "Name", "Phone", "Outlet", "Address", "Items", "Subtotal", "Delivery", "Total", "Note"];
    const lines = rows.map((o) =>
      [
        o.id,
        fmtDateTime(o.placedAt),
        o.type,
        orderLabel(o.status, o.type),
        o.name,
        o.phone,
        o.area,
        o.address,
        o.lines.map((l) => `${l.qty}x ${l.name}`).join("; "),
        o.subtotal,
        o.fee,
        o.total,
        o.note,
      ]
        .map(csvEscape)
        .join(",")
    );
    downloadFile(`bfc-orders-${todayDhaka()}.csv`, [head.join(","), ...lines].join("\n"), "text/csv");
  };

  return (
    <>
      <PageHead
        title="Orders"
        sub={`${rows.length} ${rows.length === 1 ? "order" : "orders"} - ${money(totalShown)}`}
        actions={
          <button className="adm-btn adm-btn--ghost" onClick={exportCsv} disabled={rows.length === 0}>
            <FaDownload aria-hidden /> Export CSV
          </button>
        }
      />

      <div className="adm-toolbar">
        <label className="adm-search">
          <FaSearch aria-hidden />
          <input placeholder="Search order ID, name or phone" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search orders" />
        </label>
        <select className="adm-select" value={outlet} onChange={(e) => setOutlet(e.target.value)} aria-label="Outlet">
          <option value="all">All outlets ({knownAreas.length})</option>
          {knownAreas.map((a) => (
            <option key={a} value={a}>
              {a}
              {outletCounts[a] ? ` (${outletCounts[a]})` : ""}
            </option>
          ))}
        </select>
        <select className="adm-select" value={period} onChange={(e) => setPeriod(e.target.value as Period)} aria-label="Period">
          {PERIODS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select className="adm-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Order type">
          <option value="all">All types</option>
          <option>Online Delivery</option>
          <option>Online Order</option>
          <option>Take Away</option>
        </select>
      </div>

      <div className="adm-tabs" role="tablist">
        {(["all", ...ORDER_STATUSES] as (OrderStatus | "all")[]).map((s) => (
          <button key={s} role="tab" aria-selected={status === s} className={`adm-tab ${status === s ? "is-active" : ""}`} onClick={() => setStatus(s)}>
            {STATUS_TAB_LABEL[s]} <b>{counts[s] ?? 0}</b>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="adm-card">
          <Empty
            icon={FaClipboardList}
            title={orders.length === 0 ? "No orders yet" : "No orders match these filters"}
            text={
              orders.length === 0
                ? "When a customer places an order on the website it shows up here instantly."
                : "Try another period, status or search word."
            }
          />
        </div>
      ) : (
        <div className="adm-card adm-card--flush">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Outlet</th>
                <th>Customer</th>
                <th>Type</th>
                <th className="r">Items</th>
                <th className="r">Total</th>
                <th>Status</th>
                <th aria-label="Action" />
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const step = nextOrderStep(o);
                return (
                  <tr key={o.id} className={o.status === "new" ? "is-new" : ""} onClick={() => setOpen(o.id)}>
                    <td data-label="Order">
                      <b>{o.id}</b>
                      <small>
                        {fmtTime(o.placedAt)} - {ago(o.placedAt)}
                      </small>
                    </td>
                    <td data-label="Outlet">
                      <span className="adm-outlet">
                        <FaMapMarkerAlt aria-hidden /> {o.area}
                      </span>
                    </td>
                    <td data-label="Customer">
                      <b>{o.name}</b>
                      <small>{o.phone}</small>
                    </td>
                    <td data-label="Type">{o.type}</td>
                    <td data-label="Items" className="r">
                      {itemCount(o.lines)}
                    </td>
                    <td data-label="Total" className="r">
                      <b>{money(o.total)}</b>
                    </td>
                    <td data-label="Status">
                      <Pill tone={o.status}>{orderLabel(o.status, o.type)}</Pill>
                    </td>
                    <td className="adm-table__act" onClick={(e) => e.stopPropagation()}>
                      <div className="adm-act">
                        {step && (
                          <button className="adm-btn adm-btn--sm adm-btn--red" onClick={() => advance(o)}>
                            {step.label}
                          </button>
                        )}
                        {isActiveOrder(o) && (
                          <button className="adm-btn adm-btn--sm adm-btn--ghost adm-btn--text-danger" onClick={() => cancel(o)} title="Cancel this order">
                            <FaBan aria-hidden /> Cancel
                          </button>
                        )}
                      </div>
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
          sub={
            <>
              <Pill tone={open.status}>{orderLabel(open.status, open.type)}</Pill> <span>{open.type}</span>
              <span className="adm-outlet">
                <FaMapMarkerAlt aria-hidden /> {open.area}
              </span>
            </>
          }
          onClose={() => setOpen(null)}
          footer={
            <>
              {nextOrderStep(open) && (
                <button className="adm-btn adm-btn--red adm-btn--grow" onClick={() => advance(open)}>
                  {nextOrderStep(open)!.label}
                </button>
              )}
              {isActiveOrder(open) && (
                <button className="adm-btn adm-btn--danger" onClick={() => cancel(open)}>
                  Cancel order
                </button>
              )}
              {open.status === "cancelled" && (
                <button className="adm-btn adm-btn--ghost adm-btn--grow" onClick={() => setOrderStatus(open.id, "new")}>
                  Reopen as new
                </button>
              )}
            </>
          }
        >
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
            <p>
              <span className="adm-outlet adm-outlet--big">
                <FaMapMarkerAlt aria-hidden /> Outlet: {open.area}
              </span>
            </p>
            {open.address && <p>{open.address}</p>}
            {open.note && <p className="adm-note">&ldquo;{open.note}&rdquo;</p>}
          </section>

          <section className="adm-detail">
            <h4>Items</h4>
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
              <div>
                <dt>Subtotal</dt>
                <dd>{money(open.subtotal)}</dd>
              </div>
              {open.fee > 0 && (
                <div>
                  <dt>Delivery</dt>
                  <dd>{money(open.fee)}</dd>
                </div>
              )}
              <div className="is-total">
                <dt>Total</dt>
                <dd>{money(open.total)}</dd>
              </div>
            </dl>
            {open.hasFrom && <p className="adm-warn">Contains &ldquo;From&rdquo; priced items - confirm the final price with the customer by phone.</p>}
          </section>

          <section className="adm-detail">
            <h4>Timeline</h4>
            <p className="adm-muted">Placed {fmtDateTime(open.placedAt)}</p>
            <p className="adm-muted">Last update {fmtDateTime(open.updatedAt)}</p>
          </section>

          <div className="adm-detail__tools">
            <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => printReceipt(open)}>
              <FaPrint aria-hidden /> Print slip
            </button>
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
