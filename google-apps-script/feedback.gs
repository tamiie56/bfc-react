/**
 * BFC feedback  <->  Google Sheet  <->  Admin panel (Supabase)
 *
 *  - Website feedback  -> this Sheet (doPost below) AND the admin panel (the website sends it to both).
 *  - Sheet -> admin panel: anything added to the Sheet (typed by hand, pasted, old rows) is copied
 *    into the admin panel automatically by syncToSupabase(), within a minute. Rows already copied
 *    are marked with an ID in column G, so nothing is ever added twice.
 *
 * SET UP (once)
 * 1. Sheet -> Extensions -> Apps Script, paste this whole file, fill SUPABASE_URL and
 *    SUPABASE_ANON_KEY below (the same two values as in .env), save.
 * 2. Deploy -> Manage deployments -> Edit -> Version: New version -> Deploy
 *    (keep: Execute as Me, Who has access Anyone). The Web app URL stays the same.
 * 3. In the editor pick the function  setupSync  and press Run. Allow the permissions it asks for.
 *    That adds the two headers (Rating, ID), starts the automatic sync and copies the old rows.
 *
 * The data must be on the FIRST tab of the Sheet.
 */

var SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
var SUPABASE_ANON_KEY = "YOUR-ANON-KEY";

var HEADERS = ["Time", "Name", "Email", "Phone", "Feedback", "Rating", "ID"];

function getSheet() {
  return SpreadsheetApp.getActive().getSheets()[0];
}

/* ---------------- website -> Sheet ---------------- */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var data = JSON.parse(e.postData.contents);

    // hidden "website" field: real people never fill it, bots do
    if (data.website) return reply({ ok: true });

    var name = clean(data.name, 80);
    var email = clean(data.email, 120);
    var phone = clean(data.phone, 25);
    var message = clean(data.message, 2000);
    if (!name || !email || !phone || !message) return reply({ ok: false, error: "missing fields" });

    var rating = Math.max(0, Math.min(5, parseInt(data.rating, 10) || 0));
    // the website already saved this feedback in the admin panel under this id; keeping it in column G
    // stops the sync from adding it a second time
    var id = /^FB-[A-Z0-9]{4,30}$/.test(String(data.id || "")) ? String(data.id) : "FB-" + Utilities.getUuid().slice(0, 8).toUpperCase();

    var sheet = getSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
      sheet.getRange("D:D").setNumberFormat("@"); // keep the leading 0 of phone numbers
    }
    var row = sheet.getLastRow() + 1;
    sheet.getRange(row, 1).setNumberFormat("MM/dd/yyyy HH:mm:ss"); // date and time, not just the date
    sheet.getRange(row, 4).setNumberFormat("@"); // the phone cell is always plain text
    sheet.getRange(row, 1, 1, HEADERS.length).setValues([[new Date(), name, email, phone, message, rating || "", id]]);

    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- Sheet -> admin panel ---------------- */

/** Copies every row that has no ID yet into the admin panel, then writes the ID next to it. */
function syncToSupabase() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    var sheet = getSheet();
    var last = sheet.getLastRow();
    if (last < 2) return;

    var values = sheet.getRange(2, 1, last - 1, 7).getValues();
    var batch = [];
    var rowsOf = []; // sheet row number for every item in batch

    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (String(v[6]).trim() !== "") continue; // already in the admin panel

      var name = String(v[1]).trim();
      var message = String(v[4]).trim();
      if (!name || !message) continue;

      var phone = String(v[3]).trim().replace(/^'/, "");
      if (/^1\d{9}$/.test(phone)) phone = "0" + phone; // a spreadsheet may drop the leading 0
      var when = v[0] instanceof Date ? v[0] : new Date(v[0]);
      if (isNaN(when.getTime())) when = new Date();

      var id = stableId(Utilities.formatDate(when, "Asia/Dhaka", "MM/dd/yyyy HH:mm:ss"), phone.replace(/\D/g, ""), message);
      var at = when.toISOString();
      batch.push({
        id: id,
        data: {
          id: id,
          name: name.slice(0, 80),
          email: String(v[2]).trim().slice(0, 120),
          phone: phone.slice(0, 25),
          message: message.slice(0, 2000),
          rating: Math.max(0, Math.min(5, parseInt(v[5], 10) || 0)),
          featured: false,
          placedAt: at,
          updatedAt: at,
        },
      });
      rowsOf.push(i + 2);
    }

    // 100 at a time
    for (var s = 0; s < batch.length; s += 100) {
      var part = batch.slice(s, s + 100);
      var res = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/feedbacks?on_conflict=id", {
        method: "post",
        contentType: "application/json",
        headers: { apikey: SUPABASE_ANON_KEY, Prefer: "resolution=ignore-duplicates,return=minimal" },
        payload: JSON.stringify(part),
        muteHttpExceptions: true,
      });
      var code = res.getResponseCode();
      if (code < 200 || code >= 300) {
        console.error("Supabase said " + code + ": " + res.getContentText());
        return; // try again on the next run
      }
      for (var k = 0; k < part.length; k++) sheet.getRange(rowsOf[s + k], 7).setValue(part[k].id);
    }
  } finally {
    lock.releaseLock();
  }
}

/** Run this ONCE: headers + automatic sync (on every edit, and every minute as a safety net). */
function setupSync() {
  var sheet = getSheet();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
  sheet.setFrozenRows(1);
  sheet.getRange("D:D").setNumberFormat("@");

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "syncToSupabase") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("syncToSupabase").forSpreadsheet(SpreadsheetApp.getActive()).onChange().create();
  ScriptApp.newTrigger("syncToSupabase").timeBased().everyMinutes(1).create();

  syncToSupabase();
}

/* ---------------- helpers ---------------- */

/** same id as the admin panel's CSV import, so nothing is doubled whichever way old rows come in */
function stableId(time, phoneDigits, message) {
  var s = [time, phoneDigits, message].join("|");
  var h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return "GS-" + (h >>> 0).toString(36).toUpperCase() + s.length.toString(36).toUpperCase();
}

/** trims, limits the length and stops a cell from being read as a formula */
function clean(value, max) {
  var s = String(value == null ? "" : value).trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
