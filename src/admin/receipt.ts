import { SITE } from "../data/content";
import { fmtDateTime, money } from "./format";
import type { AdminOrder } from "./store";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Opens a small printable receipt / kitchen slip for an order. */
export function printReceipt(o: AdminOrder): void {
  const w = window.open("", "_blank", "width=380,height=680");
  if (!w) return;

  const rows = o.lines
    .map(
      (l) =>
        `<tr><td>${l.qty} &times; ${esc(l.name)}${l.from ? " *" : ""}</td><td class="r">${money(l.qty * l.price)}</td></tr>`
    )
    .join("");

  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(o.id)}</title>
<style>
  body{font:13px/1.45 "Courier New",monospace;margin:0;padding:14px;color:#000;width:300px}
  h1{font-size:18px;margin:0;text-align:center} p{margin:2px 0;text-align:center}
  hr{border:0;border-top:1px dashed #000;margin:8px 0}
  table{width:100%;border-collapse:collapse} td{padding:2px 0;vertical-align:top} .r{text-align:right;white-space:nowrap}
  .b{font-weight:700} .tot td{font-size:15px;font-weight:700;padding-top:4px}
  .big{font-size:15px;font-weight:700}
</style></head><body>
<h1>BFC</h1><p>Best Fried Chicken</p><p>${esc(SITE.phone)}</p><hr>
<p class="big">${esc(o.id)}</p><p>${esc(o.type)}</p><p>${esc(fmtDateTime(o.placedAt))}</p><hr>
<div><span class="b">${esc(o.name)}</span><br>${esc(o.phone)}<br>${esc(o.area)}${o.address ? "<br>" + esc(o.address) : ""}</div>
${o.note ? `<hr><div><span class="b">Note:</span> ${esc(o.note)}</div>` : ""}
<hr><table>${rows}</table><hr>
<table>
  <tr><td>Subtotal</td><td class="r">${money(o.subtotal)}</td></tr>
  ${o.fee ? `<tr><td>Delivery</td><td class="r">${money(o.fee)}</td></tr>` : ""}
  <tr class="tot"><td>Total</td><td class="r">${money(o.total)}</td></tr>
</table>
${o.hasFrom ? "<p>* starting price - final amount confirmed by phone</p>" : ""}
<hr><p>Payment: cash on ${o.type === "Online Delivery" ? "delivery" : "pickup"}</p><p>Thank you for choosing BFC!</p>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
  w.document.close();
}
