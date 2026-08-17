/**
 * Alexander Machine Shop — tool report collector
 *
 * 1. Open the Google Sheet you want reports in.
 * 2. Extensions → Apps Script, paste this over whatever's there, Save.
 * 3. Deploy → New deployment → type "Web app"
 *      Execute as:      Me
 *      Who has access:  Anyone            <- required; the phone posts anonymously
 * 4. Copy the /exec URL it gives you. That's what goes in the planner and the phone page.
 *
 * Re-deploy (Deploy → Manage deployments → edit → new version) after any edit,
 * or the old code keeps running.
 */

var SHEET_NAME = 'Tool Reports';

var COLS = ['ts','job','turret','machine','material','operator','station','tool',
            'sfm','rpm','ipr','ipm','doc','woc','parts','mins','outcome','notes'];

var HEADERS = ['Timestamp','Job / part','Turret','Machine','Material','Operator','Station','Tool',
               'SFM','RPM','Feed IPR','Feed IPM','DOC','WOC','Parts per edge','Minutes in cut',
               'Outcome','Notes'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);                       // two phones submitting at once must not interleave
  try {
    var body = JSON.parse(e.postData.contents);
    var rows = body.rows || [];
    if (!rows.length) return out({ ok: false, error: 'no rows' });

    var sh = sheet();
    var values = rows.map(function (r) {
      return COLS.map(function (c) {
        if (c === 'ts') return r.ts ? new Date(r.ts) : new Date();
        return r[c] == null ? '' : r[c];
      });
    });
    sh.getRange(sh.getLastRow() + 1, 1, values.length, COLS.length).setValues(values);
    return out({ ok: true, added: values.length });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// lets you sanity-check the deployment in a browser
function doGet() {
  return out({ ok: true, sheet: SHEET_NAME, rows: Math.max(0, sheet().getLastRow() - 1) });
}

function sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
      .setFontWeight('bold').setBackground('#004990').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange(2, 1, sh.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm');
    sh.setColumnWidth(8, 160); sh.setColumnWidth(18, 300);
  }
  return sh;
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
