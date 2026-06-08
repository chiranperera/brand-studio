/**
 * Discovery Session — Google Sheets + Email endpoint (one connection, forever)
 * ---------------------------------------------------------------------------
 * WHAT IT DOES
 *  - Each NEW project (unique projectId from the tool) gets its OWN copy of a
 *    TEMPLATE Google Sheet, saved inside a subfolder named after the BUSINESS,
 *    created inside your PARENT folder (e.g. "webdevelopment").
 *  - Every question + answer is appended as a ROW in that project's Sheet, live.
 *  - You get an email with the new sheet's link the moment a project is created.
 *  - At the end, the tool can email the CLIENT a personalized acknowledgement
 *    with a PDF attached — sent from your verified "Send mail as" alias.
 *  - You deploy this ONCE. The template is never modified — only cloned.
 *
 * ============================ ONE-TIME SETUP ============================
 *  1. Create a TEMPLATE Google Sheet (blank, or with your branding). Copy its
 *     ID from the URL: docs.google.com/spreadsheets/d/<<<THIS_IS_THE_ID>>>/edit
 *  2. Pick the PARENT Drive folder (e.g. "webdevelopment"). Copy its ID from
 *     the URL: drive.google.com/drive/folders/<<<THIS_IS_THE_ID>>>
 *     A subfolder named after each business is auto-created inside it.
 *  3. Paste both IDs into the CONFIG block below. Optionally set AGENCY_NAME.
 *  4. Create any Google Sheet -> Extensions -> Apps Script -> paste this file.
 *  5. Deploy -> New deployment -> Web app:
 *        Execute as: Me      |     Who has access: Anyone
 *     Deploy, then AUTHORIZE (it asks for Sheets/Drive + Gmail access — needed
 *     to clone the sheet and send mail).
 *  6. Copy the Web app URL (ends in /exec) and paste it into the tool's
 *     "Google Drive sync URL" field.
 *
 *  If you edit this script later: Deploy -> Manage deployments -> edit (pencil)
 *  -> Version: New version -> Deploy. The /exec URL stays the same.
 * =======================================================================
 */

/* ============================== CONFIG ============================== */
var TEMPLATE_SHEET_ID = 'PASTE_YOUR_TEMPLATE_SHEET_ID_HERE';
var PARENT_FOLDER_ID = 'PASTE_YOUR_WEBDEVELOPMENT_FOLDER_ID_HERE'; // parent (e.g. "webdevelopment"); a business-name subfolder is created inside it per project
var OWNER_EMAIL = '';            // leave '' to use your own account's email
var AGENCY_NAME = 'Your Agency'; // default sign-off / sender name

/* --- Client-facing sender (the acknowledgement email) --- */
var SENDER_MODE = 'gmail';       // 'gmail' = send from a verified "Send mail as" alias | 'resend' = branded domain via API
var RESEND_API_KEY = '';         // only needed when SENDER_MODE = 'resend'
var FROM_EMAIL = 'creative@chiranperera.com'; // a VERIFIED Gmail "Send mail as" alias (confirmed in your dropdown)
var FROM_NAME = 'Chiran Perera'; // display name shown to the client

/* --- Branding for the acknowledgement (email + PDF) --- */
var BRAND_NAME = 'Chiran Perera';
var BRAND_TAGLINE = 'Digital Marketing & AI Development';
var BRAND_LOGO_URL = '';                       // PUBLIC logo image URL, e.g. https://chiranperera.com/logo.png (leave '' for a text header)
var BRAND_COLOR = '#0a0a0a';                    // header band + accent color
var BRAND_WEBSITE = 'chiranperera.com';
var BRAND_CONTACT_EMAIL = 'creative@chiranperera.com';
var BRAND_PHONE = '';                           // optional
var SAVE_ACK_PDF = true;                        // also save the acknowledgement PDF into the business folder
/* =================================================================== */

var DATA_SHEET = 'Discovery';     // tab name used inside each project's spreadsheet
var HEADERS = ['Timestamp', 'Section', 'Question', 'Answer', 'Note'];

function owner_() { return OWNER_EMAIL || Session.getEffectiveUser().getEmail(); }

/* Find (or create) a subfolder by name inside a parent folder. */
function getOrCreateFolder_(parent, name) {
  name = String(name || 'Client').trim() || 'Client';
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/* The business folder that already holds this project's spreadsheet. */
function ackFolder_(projectId) {
  try {
    var ssId = PropertiesService.getScriptProperties().getProperty('proj_' + projectId);
    if (ssId) { var p = DriveApp.getFileById(ssId).getParents(); if (p.hasNext()) return p.next(); }
  } catch (ignore) {}
  return null;
}

/* Fetch the logo and inline it as a data URI (renders reliably inside the PDF). */
function logoDataUri_() {
  try {
    if (!BRAND_LOGO_URL) return '';
    var res = UrlFetchApp.fetch(BRAND_LOGO_URL, { muteHttpExceptions: true });
    if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) {
      var b = res.getBlob();
      return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
    }
  } catch (ignore) {}
  return '';
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function esc_(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function plain_(s) { return String(s || '').replace(/\*\*/g, ''); }

function doGet() { return ContentService.createTextOutput('Discovery endpoint is live.'); }

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || 'row';
    if (action === 'sendAck') return sendAck_(data);
    return writeRow_(data);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* ---- Get (or create) the per-project Sheet, keyed by projectId ---- */
function projectSheet_(data) {
  var props = PropertiesService.getScriptProperties();
  var key = 'proj_' + data.projectId;
  var ssId = props.getProperty(key);
  if (ssId) {
    try { return dataSheet_(SpreadsheetApp.openById(ssId), data); } catch (ignore) { /* recreate below */ }
  }

  var template = DriveApp.getFileById(TEMPLATE_SHEET_ID);
  var parent = DriveApp.getFolderById(PARENT_FOLDER_ID);
  var folder = getOrCreateFolder_(parent, data.client || 'Client');   // business-name subfolder inside the parent
  var name = (data.client || 'Client') + ' — Discovery — ' + new Date().toISOString().slice(0, 10);
  var copy = template.makeCopy(name, folder);
  ssId = copy.getId();
  props.setProperty(key, ssId);

  var sh = dataSheet_(SpreadsheetApp.openById(ssId), data);

  // Notify you (folder + email = "Both").
  try {
    GmailApp.sendEmail(owner_(), 'New discovery project: ' + name,
      'A new project sheet was created:\n' + copy.getUrl() +
      '\n\nBusiness folder: ' + folder.getUrl(),
      { name: AGENCY_NAME });
  } catch (ignore) {}

  return sh;
}

/* ---- Return the data tab, creating header + project info on first use ---- */
function dataSheet_(ss, data) {
  var sh = ss.getSheetByName(DATA_SHEET) || ss.insertSheet(DATA_SHEET);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Client', data.client || '', 'Contact', data.contact || '', 'Email', data.clientEmail || '', 'Industry', data.industry || '']);
    sh.appendRow([]);
    sh.appendRow(HEADERS);
    sh.getRange(3, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(3);
  }
  return sh;
}

/* ---- Append one question + answer as a row ---- */
function writeRow_(data) {
  var sh = projectSheet_(data);
  sh.appendRow([
    data.ts || new Date().toISOString(),
    data.section || '',
    data.question || '',
    data.answer || '',
    data.note || ''
  ]);
  return json_({ ok: true });
}

/* ---- Email the client a BRANDED acknowledgement + PDF (also saved to the business folder) ---- */
function sendAck_(data) {
  var emailHtml = ackHtml_(data, BRAND_LOGO_URL);          // external logo URL renders in inboxes
  var pdfHtml   = ackHtml_(data, logoDataUri_());          // inlined logo renders in the PDF
  var pdf = Utilities.newBlob(pdfHtml, 'text/html', 'acknowledgement.html')
              .getAs('application/pdf')
              .setName('Acknowledgement — ' + (data.clientName || 'Client') + ' — ' + new Date().toISOString().slice(0, 10) + '.pdf');

  // Save a copy into the same business folder as the project spreadsheet.
  if (SAVE_ACK_PDF) { var f = ackFolder_(data.projectId); if (f) { try { f.createFile(pdf); } catch (ignore) {} } }

  var subject = data.subject || 'Thank you for your time';
  var fromName = FROM_NAME || data.agencyName || AGENCY_NAME;
  var sender = data.fromEmail || FROM_EMAIL;   // the tool's "Send from" dropdown choice
  var cc = [owner_()];

  if (SENDER_MODE === 'resend') {
    return sendViaResend_(data, emailHtml, pdf, subject, fromName, cc, sender);
  }

  // Gmail mode: sends from a verified "Send mail as" alias if the chosen address is one.
  var opts = { htmlBody: emailHtml, attachments: [pdf], name: fromName, cc: cc.join(',') };
  try {
    if (sender && GmailApp.getAliases().indexOf(sender) !== -1) { opts.from = sender; }
  } catch (ignore) {}
  GmailApp.sendEmail(data.clientEmail, subject, plain_(data.bodyText || ''), opts);
  return json_({ ok: true, via: 'gmail', from: opts.from || owner_() });
}

/* ---- Branded send via Resend (your own domain) ---- */
function sendViaResend_(data, html, pdf, subject, fromName, cc, sender) {
  var payload = {
    from: fromName + ' <' + (sender || FROM_EMAIL) + '>',
    to: [data.clientEmail],
    cc: cc,
    subject: subject,
    html: html,
    text: plain_(data.bodyText || ''),
    attachments: [{ filename: 'Discovery-Acknowledgement.pdf', content: Utilities.base64Encode(pdf.getBytes()) }]
  };
  var res = UrlFetchApp.fetch('https://api.resend.com/emails', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + RESEND_API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  if (code >= 200 && code < 300) return json_({ ok: true, via: 'resend' });
  return json_({ ok: false, via: 'resend', error: 'Resend ' + code + ': ' + res.getContentText() });
}

/* ---- Build a BRANDED, table-based HTML letter (works in email + the PDF) ---- */
function ackHtml_(data, logoSrc) {
  var bodyHtml = esc_(data.bodyText || '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')   // **bold**
    .replace(/\n{2,}/g, '</p><p style="margin:0 0 12px">')
    .replace(/\n/g, '<br>');

  var logoCell = logoSrc
    ? '<td width="48" style="padding-right:14px;vertical-align:middle"><img src="' + logoSrc + '" alt="' + esc_(BRAND_NAME) + '" width="44" style="display:block;border:0"></td>'
    : '';

  var contactBits = [];
  if (BRAND_WEBSITE) contactBits.push(esc_(BRAND_WEBSITE));
  if (BRAND_CONTACT_EMAIL) contactBits.push(esc_(BRAND_CONTACT_EMAIL));
  if (BRAND_PHONE) contactBits.push(esc_(BRAND_PHONE));
  var contact = contactBits.join('&nbsp;&nbsp;&middot;&nbsp;&nbsp;');

  return '' +
  '<table width="600" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:600px;max-width:100%;margin:0 auto;font-family:Helvetica,Arial,sans-serif;color:#0a0a0a;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden">' +
    '<tr><td bgcolor="' + BRAND_COLOR + '" style="background:' + BRAND_COLOR + ';padding:22px 28px">' +
      '<table cellpadding="0" cellspacing="0" border="0"><tr>' + logoCell +
        '<td style="vertical-align:middle">' +
          '<div style="color:#ffffff;font-size:17px;font-weight:700;line-height:1.2">' + esc_(BRAND_NAME) + '</div>' +
          '<div style="color:#ffffff;opacity:.8;font-size:12px;margin-top:2px">' + esc_(BRAND_TAGLINE) + '</div>' +
        '</td>' +
      '</tr></table>' +
    '</td></tr>' +
    '<tr><td style="padding:28px;font-size:14px;line-height:1.65"><p style="margin:0 0 12px">' + bodyHtml + '</p>' +
      '<table cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-top:1px solid #e5e5e5;width:100%"><tr><td style="padding-top:16px">' +
        '<div style="font-weight:700">' + esc_(BRAND_NAME) + '</div>' +
        '<div style="color:#737373;font-size:13px">' + esc_(BRAND_TAGLINE) + '</div>' +
        (contact ? '<div style="color:#737373;font-size:12px;margin-top:6px">' + contact + '</div>' : '') +
      '</td></tr></table>' +
    '</td></tr>' +
    '<tr><td bgcolor="#fafafa" style="background:#fafafa;border-top:1px solid #e5e5e5;padding:12px 28px;font-size:11px;color:#9a9a9a">Prepared through our AI-assisted discovery process.</td></tr>' +
  '</table>';
}

/* ---- Run this from the Apps Script editor to send yourself a test ---- */
function testAck() {
  var out = sendAck_({
    clientEmail: owner_(), clientName: 'Test Client', contact: 'Test',
    agencyName: AGENCY_NAME, fromEmail: FROM_EMAIL,
    subject: 'Test acknowledgement',
    bodyText: 'Hi Test,\n\nThis is a **test** acknowledgement from the discovery tool.\n\nThanks!'
  });
  Logger.log(out.getContent());
}
