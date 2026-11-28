/**
 * Import of the old feedback that was saved in the Google Sheet (columns: Time, Name, Email, Phone, Feedback).
 * The team downloads the sheet as CSV (File -> Download -> Comma Separated Values) and picks the file in the
 * panel. Nothing is read from the sheet by the website itself, so the customers' phone / email stay private.
 */

export interface ImportedFeedback {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  placedAt: string;
}

/** small CSV reader: quotes, commas and line breaks inside quotes, BOM, \r\n */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

/** "11/27/2026 15:30:12" (sheet time, Dhaka) -> ISO string */
function toIso(raw: string): string {
  const t = raw.trim();
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const [, mo, d, y, h = "0", mi = "0", s = "0"] = m;
    // the sheet writes Dhaka time (UTC+6)
    const ms = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s) - 6 * 3600 * 1000;
    if (!Number.isNaN(ms)) return new Date(ms).toISOString();
  }
  const p = Date.parse(t);
  return Number.isNaN(p) ? new Date().toISOString() : new Date(p).toISOString();
}

/** same input always gives the same id, so importing the same sheet twice never duplicates */
function stableId(...parts: string[]): string {
  let h = 5381;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return "GS-" + (h >>> 0).toString(36).toUpperCase() + s.length.toString(36).toUpperCase();
}

const col = (head: string[], ...names: string[]) => head.findIndex((h) => names.some((n) => h.includes(n)));

export function feedbackFromCsv(text: string): ImportedFeedback[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const head = rows[0].map((h) => h.trim().toLowerCase());
  const hasHead = head.some((h) => h.includes("name")) && head.some((h) => h.includes("feedback") || h.includes("message"));
  const idx = hasHead
    ? {
        time: col(head, "time", "date"),
        name: col(head, "name"),
        email: col(head, "email"),
        phone: col(head, "phone", "mobile"),
        message: col(head, "feedback", "message"),
      }
    : { time: 0, name: 1, email: 2, phone: 3, message: 4 };

  const seen = new Set<string>();
  const out: ImportedFeedback[] = [];
  for (const r of hasHead ? rows.slice(1) : rows) {
    const get = (i: number) => (i >= 0 && i < r.length ? r[i].trim() : "");
    const message = get(idx.message);
    const name = get(idx.name);
    if (!message || !name) continue;

    let phone = get(idx.phone).replace(/^'/, "");
    if (/^1\d{9}$/.test(phone)) phone = "0" + phone; // a spreadsheet may drop the leading 0
    const time = get(idx.time);
    const id = stableId(time, phone.replace(/\D/g, ""), message);
    if (seen.has(id)) continue;
    seen.add(id);

    out.push({ id, name, email: get(idx.email), phone, message, placedAt: toIso(time) });
  }
  return out;
}
