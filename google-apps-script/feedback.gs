/**
 * BFC feedback -> Google Sheet
 *
 * 1. Open your Google Sheet -> Extensions -> Apps Script, paste this whole file, save.
 * 2. Deploy -> New deployment -> type "Web app"
 *      Execute as: Me
 *      Who has access: Anyone
 * 3. Copy the "Web app URL" and put it in .env as VITE_FEEDBACK_SHEET_URL, then rebuild the site.
 *
 * After you change this script, use Deploy -> Manage deployments -> Edit -> New version.
 */

var HEADERS = ["Time", "Name", "Email", "Phone", "Feedback"];

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

    var sheet = SpreadsheetApp.getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
      sheet.getRange("D:D").setNumberFormat("@"); // keep the leading 0 of phone numbers
    }
    // the phone cell is always plain text, so 01791136081 keeps its leading 0
    var row = sheet.getLastRow() + 1;
    sheet.getRange(row, 4).setNumberFormat("@");
    sheet.getRange(row, 1, 1, HEADERS.length).setValues([[new Date(), name, email, phone, message]]);

    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** trims, limits the length and stops a cell from being read as a formula */
function clean(value, max) {
  var s = String(value == null ? "" : value).trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
