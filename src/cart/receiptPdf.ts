import logo from "../assets/images/logo.png";
import { SITE } from "../data/content";

/**
 * Builds a one-page PDF receipt in the browser (no library, no server).
 * The receipt is drawn on a canvas - so Bangla names, the ৳ sign and the site fonts all render
 * correctly - then embedded as a JPEG inside a tiny hand-written PDF.
 */

export interface ReceiptLine {
  name: string;
  category: string;
  price: number;
  qty: number;
  from?: boolean;
}

export interface ReceiptData {
  id: string;
  kind: "order" | "booking";
  type: string; // "Online Delivery", "Take Away", "Dine-in" ...
  name: string;
  phone: string;
  area: string;
  address: string;
  note: string;
  lines: ReceiptLine[];
  subtotal: number;
  fee: number;
  total: number;
  hasFrom: boolean;
  placedAt: string; // ISO
  booking: { date: string; time: string; guests: number } | null;
}

const HEAD = '"Oswald", "Arial Narrow", Arial, "Hind Siliguri", sans-serif';
const BODY = '"Raleway", "Segoe UI", Arial, "Hind Siliguri", sans-serif';

const W = 760; // logical px; drawn at 2x for sharpness
const SCALE = 2;
const PAD = 48;

const RED = "#c20d00";
const YELLOW = "#ffc80a";
const INK = "#1b1210";
const MUTED = "#7a6d67";
const LINE = "#e8dfd8";

const taka = (n: number) => "৳" + Math.round(n).toLocaleString("en-US");

function fmtPlaced(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function fmtClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function ensureFonts() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load(`700 40px ${HEAD}`),
        document.fonts.load(`600 24px ${HEAD}`),
        document.fonts.load(`500 20px ${BODY}`),
        document.fonts.load(`700 20px ${BODY}`),
      ]),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch {
    /* fall back to system fonts */
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth || !line) {
        line = test;
      } else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

/** Draws the receipt and returns the height used. `dry` only measures. */
function paint(ctx: CanvasRenderingContext2D, d: ReceiptData, img: HTMLImageElement | null, dry: boolean): number {
  const isBooking = d.kind === "booking";
  let y = 0;

  const rect = (x: number, yy: number, w: number, h: number, color: string) => {
    if (dry) return;
    ctx.fillStyle = color;
    ctx.fillRect(x, yy, w, h);
  };
  const text = (t: string, x: number, yy: number, font: string, color: string, align: CanvasTextAlign = "left") => {
    ctx.font = font;
    if (dry) return;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(t, x, yy);
  };
  const hr = (yy: number, dashed = false) => {
    if (dry) return;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.setLineDash(dashed ? [6, 6] : []);
    ctx.beginPath();
    ctx.moveTo(PAD, yy);
    ctx.lineTo(W - PAD, yy);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  // ---- header band ----
  const headH = 128;
  rect(0, 0, W, headH, RED);
  rect(0, headH, W, 6, YELLOW);
  if (img && !dry) {
    const lh = 78;
    const lw = (img.width / img.height) * lh;
    ctx.fillStyle = "#fff";
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(PAD, 25, lw + 20, lh + 4, 14);
      ctx.fill();
    } else {
      ctx.fillRect(PAD, 25, lw + 20, lh + 4);
    }
    ctx.drawImage(img, PAD + 10, 27, lw, lh);
  }
  text("BFC", W - PAD, 66, `700 44px ${HEAD}`, YELLOW, "right");
  text("BEST FRIED CHICKEN", W - PAD, 96, `600 15px ${BODY}`, "#ffe9e6", "right");
  y = headH + 6 + 52;

  // ---- title ----
  text(isBooking ? "TABLE BOOKING REQUEST" : "ORDER RECEIPT", PAD, y, `600 28px ${HEAD}`, INK);
  y += 14;
  ctx.font = `500 15px ${BODY}`;
  text(`Received ${fmtPlaced(d.placedAt)}`, PAD, y + 18, `500 15px ${BODY}`, MUTED);
  y += 48;

  // ---- reference box ----
  rect(PAD, y, W - PAD * 2, 84, "#fff7df");
  if (!dry) {
    ctx.strokeStyle = YELLOW;
    ctx.lineWidth = 2;
    ctx.strokeRect(PAD + 1, y + 1, W - PAD * 2 - 2, 82);
  }
  text("REFERENCE", PAD + 22, y + 32, `700 13px ${BODY}`, MUTED);
  text(d.id, PAD + 22, y + 68, `700 34px ${HEAD}`, RED);
  text(d.type === "Dine-in" && isBooking ? "Dine-in" : d.type, W - PAD - 22, y + 66, `600 17px ${BODY}`, INK, "right");
  y += 84 + 38;

  // ---- details ----
  const row = (label: string, value: string) => {
    ctx.font = `600 17px ${BODY}`;
    const lines = wrap(ctx, value || "-", W - PAD * 2 - 170);
    text(label.toUpperCase(), PAD, y, `700 13px ${BODY}`, MUTED);
    lines.forEach((ln, i) => text(ln, PAD + 170, y + i * 25, `600 17px ${BODY}`, INK));
    y += Math.max(1, lines.length) * 25 + 11;
  };

  row("Name", d.name);
  row("Mobile", d.phone);
  if (isBooking && d.booking) {
    row("Outlet", d.area);
    row("Date", fmtDay(d.booking.date));
    row("Time", fmtClock(d.booking.time));
    row("Guests", String(d.booking.guests));
  } else {
    row(d.type === "Online Delivery" ? "Outlet area" : "Outlet", d.area);
    if (d.type === "Online Delivery" && d.address) row("Deliver to", d.address);
  }
  if (d.note) row("Note", d.note);

  y += 6;
  hr(y);
  y += 38;

  // ---- items ----
  text(isBooking ? "PRE-ORDERED ITEMS" : "ITEMS", PAD, y, `700 14px ${BODY}`, MUTED);
  y += 30;

  if (d.lines.length === 0) {
    text("No food pre-ordered - table only.", PAD, y, `500 17px ${BODY}`, MUTED);
    y += 34;
  }
  for (const l of d.lines) {
    ctx.font = `600 18px ${BODY}`;
    const lines = wrap(ctx, l.name, W - PAD * 2 - 160);
    text(`${l.qty} ×`, PAD, y, `700 18px ${BODY}`, RED);
    lines.forEach((ln, i) => text(ln, PAD + 52, y + i * 25, `600 18px ${BODY}`, INK));
    text(taka(l.qty * l.price), W - PAD, y, `700 18px ${BODY}`, INK, "right");
    if (l.from) text("starting price", PAD + 52, y + lines.length * 25 + 1, `500 13px ${BODY}`, MUTED);
    y += lines.length * 25 + (l.from ? 20 : 0) + 15;
  }

  y += 2;
  hr(y, true);
  y += 36;

  // ---- totals ----
  const sum = (label: string, value: string, strong = false) => {
    if (strong) {
      text(label, PAD, y, `600 26px ${HEAD}`, INK);
      text(value, W - PAD, y, `700 32px ${HEAD}`, RED, "right");
      y += 42;
    } else {
      text(label, PAD, y, `500 17px ${BODY}`, MUTED);
      text(value, W - PAD, y, `700 17px ${BODY}`, INK, "right");
      y += 32;
    }
  };

  sum(isBooking ? "Pre-order total" : "Subtotal", taka(d.subtotal));
  if (d.fee > 0) sum("Delivery charge", taka(d.fee));
  if (!isBooking) {
    y += 6;
    sum("TOTAL", taka(d.total), true);
  }

  y += 10;
  ctx.font = `500 15px ${BODY}`;
  const notes: string[] = [];
  notes.push(
    isBooking
      ? "Pay at the outlet. This is a booking request - we will call you to confirm your table. Please keep this reference."
      : d.type === "Online Delivery"
        ? "Payment: cash on delivery. We will call you to confirm your order."
        : "Payment: cash on pickup / at the outlet. We will call you to confirm your order."
  );
  if (d.hasFrom) notes.push("“From” prices are confirmed on the confirmation call.");
  for (const n of notes) {
    for (const ln of wrap(ctx, n, W - PAD * 2)) {
      text(ln, PAD, y, `500 15px ${BODY}`, MUTED);
      y += 22;
    }
    y += 4;
  }

  // ---- footer ----
  y += 20;
  rect(0, y, W, 96, INK);
  text("Thank you for choosing BFC!", W / 2, y + 42, `600 24px ${HEAD}`, YELLOW, "center");
  text(`${SITE.phone}  ·  ${SITE.email}`, W / 2, y + 72, `500 15px ${BODY}`, "#e8dcd5", "center");
  y += 96;

  return y;
}

/* ---------- JPEG -> one-page PDF ---------- */

function buildPdf(jpeg: Uint8Array, pxW: number, pxH: number, title: string): Blob {
  const ptW = 420; // A5 width
  const ptH = Math.round((ptW * pxH) / pxW);
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let size = 0;
  const push = (b: Uint8Array | string) => {
    const u = typeof b === "string" ? enc.encode(b) : b;
    chunks.push(u);
    size += u.length;
  };
  const obj = (n: number, body: () => void) => {
    offsets[n] = size;
    push(`${n} 0 obj\n`);
    body();
    push("\nendobj\n");
  };

  push("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n");
  obj(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
  obj(3, () =>
    push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`)
  );
  obj(4, () => {
    push(
      `<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
    );
    push(jpeg);
    push("\nendstream");
  });
  const content = `q\n${ptW} 0 0 ${ptH} 0 0 cm\n/Im0 Do\nQ`;
  obj(5, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
  const safeTitle = title.replace(/[^\x20-\x7e]/g, "").replace(/[()\\]/g, "");
  obj(6, () => push(`<< /Title (${safeTitle}) /Producer (BFC) >>`));

  const xref = size;
  let table = `xref\n0 7\n0000000000 65535 f \n`;
  for (let i = 1; i <= 6; i++) table += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  push(table);
  push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

export async function createReceiptPdf(d: ReceiptData): Promise<Blob> {
  await ensureFonts();
  const img = await loadImage(logo);

  const scratch = document.createElement("canvas").getContext("2d");
  if (!scratch) throw new Error("Canvas is not available");
  const height = Math.ceil(paint(scratch, d, img, true));

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, height);
  paint(ctx, d, img, false);

  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!jpeg) throw new Error("Could not create the receipt image");
  return buildPdf(new Uint8Array(await jpeg.arrayBuffer()), canvas.width, canvas.height, `BFC receipt ${d.id}`);
}

export async function downloadReceiptPdf(d: ReceiptData): Promise<void> {
  const blob = await createReceiptPdf(d);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${d.id.startsWith("BFC") || d.id.startsWith("TBL") ? "" : "BFC-"}${d.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
