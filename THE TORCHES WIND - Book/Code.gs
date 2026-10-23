const SPREADSHEET_ID = '1we4udRf2CZPz2KH3vVT6gp6xQ7ZUdil96Ev-l3Ziv6w';
const SHEET_NAME = 'Reader Saves';

function getSaveSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['readerId', 'bookId', 'updatedAt', 'page', 'pageTitle', 'markedWord', 'bookmarks', 'notes', 'fontSize', 'nightMode', 'stateJson']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function setup() {
  getSaveSheet_();
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!payload.readerId || !payload.bookId || !payload.state) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Missing readerId or state' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const sheet = getSaveSheet_();
    const values = sheet.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(payload.readerId) && String(values[i][1]) === String(payload.bookId)) { row = i + 1; break; }
    }
    const state = payload.state;
    const record = [
      String(payload.readerId),
      String(payload.bookId),
      new Date(),
      Number(state.page || 0),
      String(state.pageTitle || ''),
      JSON.stringify(state.markedWord || null),
      JSON.stringify(state.bookmarks || []),
      JSON.stringify(state.notes || {}),
      Number(state.fontSize || 1.35),
      Boolean(state.night),
      JSON.stringify(state)
    ];
    if (row < 0) sheet.appendRow(record);
    else sheet.getRange(row, 1, 1, record.length).setValues([record]);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const readerId = String(params.readerId || '');
  const callback = String(params.callback || '');
  let result = { ok: true, state: null };
  try {
    if (readerId) {
      const sheet = getSaveSheet_();
      const values = sheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === readerId && String(values[i][1]) === String(params.bookId || '')) {
          const raw = values[i][10];
          result.state = raw ? JSON.parse(String(raw)) : null;
          break;
        }
      }
    }
  } catch (err) {
    result = { ok: false, error: String(err), state: null };
  }
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
