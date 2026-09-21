/**
 * PE Scheduler — Google Sheets backend (Google Apps Script Web App)
 * ---------------------------------------------------------------------------
 * Dán toàn bộ file này vào  Google Sheets ▸ Tiện ích mở rộng ▸ Apps Script  (Extensions ▸ Apps Script)
 * rồi làm theo hướng dẫn trong README (mục "Kết nối Google Sheets").
 *
 * Nguyên tắc lưu trữ
 *   • Mỗi loại dữ liệu là 1 tab:  Employees · Molds · Orders · Machines · Schedules
 *   • Mỗi dòng = 1 bản ghi.  Cột A:H là cột hệ thống (id, rev, deleted, updatedAt, updatedBy, json, json2, json3).
 *     Cột "json" là nguồn dữ liệu thật; các cột từ I trở đi chỉ để con người đọc cho dễ (app tự tạo/cập nhật).
 *     ⚠ Sửa tay ở các cột đọc-cho-dễ sẽ KHÔNG đồng bộ ngược vào app. Muốn sửa dữ liệu hãy làm trong app.
 *   • Xóa = đánh dấu deleted=1 (tombstone) để các máy khác biết mà xóa theo. Có thể dọn bằng purgeDeleted().
 *   • Mỗi lần ghi tăng "version" lên 1; app chỉ hỏi version (rất nhẹ) và tải phần thay đổi khi version đổi.
 *
 * API (JSON)
 *   GET  ?action=ping                    → kiểm tra kết nối
 *   GET  ?action=version                 → { version }
 *   GET  ?action=changes&since=<n>       → các bản ghi có rev > n  (since=0 ⇒ toàn bộ)
 *   POST {action:"save", ops:[...]}      → ghi hàng loạt (upsert / delete / clearAll)
 * ---------------------------------------------------------------------------
 */

// ===== CẤU HÌNH =============================================================
var API_TOKEN = '';        // (tuỳ chọn) chuỗi bí mật dùng chung; đặt giống ô "Token" trong app. Để trống = không kiểm tra.
var SPREADSHEET_ID = '';   // Để trống nếu script được mở từ chính file Google Sheets (khuyến nghị).
var LOCK_TIMEOUT_MS = 25000;
// ============================================================================

var SHEETS = { employees: 'Employees', molds: 'Molds', orders: 'Orders', machines: 'Machines', schedules: 'Schedules' };
var SYS_COLS = ['id', 'rev', 'deleted', 'updatedAt', 'updatedBy', 'json', 'json2', 'json3'];
var SYS_N = SYS_COLS.length;   // 8  (A:H)
var CHUNK = 45000;             // 1 ô Google Sheets tối đa 50.000 ký tự → cắt json thành tối đa 3 ô
var VERSION_KEY = 'PE_VERSION';

// ---------------------------------------------------------------- entry points
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var action = p.action || 'ping';
    if (action === 'login') return out_(login_(p.username, p.password, p.token));
    if (!authOk_(p.token)) return out_({ ok: false, error: 'unauthorized' });
    if (action === 'ping') return out_(ping_());
    if (action === 'version') return out_({ ok: true, version: getVersion_() });
    if (action === 'changes') return out_(changes_(Number(p.since) || 0));
    return out_({ ok: false, error: 'unknown action: ' + action });
  } catch (err) {
    return out_({ ok: false, error: String((err && err.message) || err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'login') return out_(login_(body.username, body.password, body.token));
    if (!authOk_(body.token)) return out_({ ok: false, error: 'unauthorized' });
    if (body.action === 'save') return out_(save_(body));
    return out_({ ok: false, error: 'unknown action: ' + body.action });
  } catch (err) {
    return out_({ ok: false, error: String((err && err.message) || err) });
  }
}

/** Chạy hàm này 1 lần trong trình soạn thảo để cấp quyền và tạo sẵn các tab. */
function setup() {
  Object.keys(SHEETS).forEach(function (k) { sheetFor_(k); });
  setupUsersSheet_();
  if (!PropertiesService.getScriptProperties().getProperty(VERSION_KEY)) setVersion_(0);
  try { ss_().toast('Đã tạo xong các tab: ' + Object.keys(SHEETS).map(function (k) { return SHEETS[k]; }).concat(['Users']).join(', '), 'PE Scheduler', 8); } catch (e) { /* toast không bắt buộc */ }
  Logger.log('OK – đã tạo các tab: ' + Object.keys(SHEETS).map(function (k) { return SHEETS[k]; }).concat(['Users']).join(', '));
}

/** Đảm bảo tab Users tồn tại (nếu chưa có sẽ tạo kèm tài khoản mẫu Intco/123). */
function setupUsersSheet_() {
  var s = ss_();
  var sh = s.getSheetByName('Users') || s.getSheetByName('users');
  if (!sh) sh = s.insertSheet('Users');
  if (sh.getLastRow() < 1) {
    var cols = ['id', 'username', 'password', 'name', 'role', 'active'];
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange(2, 1, 1, cols.length).setValues([['u_1', 'Intco', '123', 'Intco Admin', 'ADMIN', 1]]);
    sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@');
  }
}

/** (Tuỳ chọn) Xóa hẳn các dòng đã đánh dấu deleted. Chỉ chạy khi mọi máy đã đồng bộ. */
function purgeDeleted() {
  var lock = LockService.getScriptLock(); lock.waitLock(LOCK_TIMEOUT_MS);
  try {
    Object.keys(SHEETS).forEach(function (k) {
      var sh = sheetFor_(k), last = sh.getLastRow();
      if (last < 2) return;
      var del = sh.getRange(2, 3, last - 1, 1).getValues();
      for (var i = del.length - 1; i >= 0; i--) if (Number(del[i][0]) === 1) sh.deleteRow(i + 2);
    });
  } finally { lock.releaseLock(); }
}

// ---------------------------------------------------------------- helpers
function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function authOk_(token) { return !API_TOKEN || token === API_TOKEN; }
function ss_() {
  var s = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!s) throw new Error('Script chưa gắn với file Google Sheets. Hãy mở script từ TRONG file Sheets (Tiện ích mở rộng > Apps Script) hoặc điền SPREADSHEET_ID ở đầu file.');
  return s;
}
function getVersion_() { return Number(PropertiesService.getScriptProperties().getProperty(VERSION_KEY)) || 0; }
function setVersion_(v) { PropertiesService.getScriptProperties().setProperty(VERSION_KEY, String(v)); }
function ping_() {
  var s = ss_();
  Object.keys(SHEETS).forEach(function (k) { sheetFor_(k); });   // ping cũng tự tạo các tab còn thiếu
  var hasUsers = !!(s.getSheetByName('Users') || s.getSheetByName('users'));
  return {
    ok: true,
    version: getVersion_(),
    spreadsheet: s.getName(),
    sheets: Object.keys(SHEETS).map(function (k) { return SHEETS[k]; }).concat(hasUsers ? ['Users'] : []),
    hasUsersTab: hasUsers,
    time: new Date().toISOString()
  };
}

/** Lấy (hoặc tạo) tab + dòng tiêu đề chuẩn. */
function sheetFor_(key) {
  var name = SHEETS[key];
  if (!name) throw new Error('unknown sheet key: ' + key);
  var s = ss_(), sh = s.getSheetByName(name);
  if (!sh) sh = s.insertSheet(name);
  if (sh.getMaxColumns() < SYS_N) sh.insertColumnsAfter(sh.getMaxColumns(), SYS_N - sh.getMaxColumns());
  var head = sh.getRange(1, 1, 1, SYS_N).getValues()[0];
  if (String(head[0]) !== 'id') {
    sh.getRange(1, 1, 1, SYS_N).setValues([SYS_COLS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange(1, 1, sh.getMaxRows(), 1).setNumberFormat('@');   // id luôn là chữ
    sh.getRange(1, 4, sh.getMaxRows(), 1).setNumberFormat('@');   // updatedAt (ISO) không bị đổi thành ngày
    sh.getRange(1, 6, sh.getMaxRows(), 3).setNumberFormat('@');   // json
  }
  return sh;
}

function ensureGrid_(sh, needRows, needCols) {
  if (needRows > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), needRows - sh.getMaxRows());
  if (needCols > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), needCols - sh.getMaxColumns());
}

/** Đọc danh sách tên cột hiển thị (từ cột I). */
function displayHeader_(sh) {
  var n = sh.getLastColumn();
  if (n <= SYS_N) return [];
  return sh.getRange(1, SYS_N + 1, 1, n - SYS_N).getValues()[0].map(String).filter(function (x) { return x !== ''; });
}

/** Thêm cột hiển thị mới nếu ops có khoá chưa tồn tại. Trả về header hiển thị đầy đủ. */
function ensureDisplayCols_(sh, ops) {
  var header = displayHeader_(sh), seen = {};
  header.forEach(function (h) { seen[h] = true; });
  var add = [];
  ops.forEach(function (op) {
    if (op.op !== 'upsert' || !op.cols) return;
    Object.keys(op.cols).forEach(function (k) { if (!seen[k]) { seen[k] = true; add.push(k); } });
  });
  if (add.length) {
    ensureGrid_(sh, 2, SYS_N + header.length + add.length);
    sh.getRange(1, SYS_N + header.length + 1, 1, add.length).setValues([add]).setFontWeight('bold');
    sh.getRange(1, SYS_N + header.length + 1, sh.getMaxRows(), add.length).setNumberFormat('@');
    header = header.concat(add);
  }
  return header;
}

function idIndex_(sh) {
  var last = sh.getLastRow(), map = {};
  if (last < 2) return { map: map, last: 1 };
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) map[String(ids[i][0])] = i + 2;   // id → số dòng
  return { map: map, last: last };
}

function buildRow_(op, header, rev, user, now) {
  var s = JSON.stringify(op.record === undefined ? null : op.record);
  if (s.length > CHUNK * 3) throw new Error('Bản ghi quá lớn (' + s.length + ' ký tự): ' + op.id);
  var row = [String(op.id), rev, 0, now, user || '', s.slice(0, CHUNK), s.slice(CHUNK, CHUNK * 2), s.slice(CHUNK * 2, CHUNK * 3)];
  var cols = op.cols || {};
  for (var i = 0; i < header.length; i++) {
    var v = cols[header[i]];
    row.push(v === undefined || v === null ? '' : String(v));
  }
  return row;
}

// ---------------------------------------------------------------- save
function save_(body) {
  var ops = body.ops || [];
  if (!ops.length) return { ok: true, version: getVersion_(), prevVersion: getVersion_(), applied: 0 };
  var lock = LockService.getScriptLock();
  lock.waitLock(LOCK_TIMEOUT_MS);
  try {
    var prev = getVersion_(), rev = prev + 1, now = new Date().toISOString(), user = String(body.user || '');
    var bySheet = {};
    ops.forEach(function (op) {
      if (op.op === 'clearAll') { Object.keys(SHEETS).forEach(function (k) { (bySheet[k] = bySheet[k] || []).push({ op: 'clearAll' }); }); return; }
      if (!SHEETS[op.sheet]) throw new Error('unknown sheet: ' + op.sheet);
      (bySheet[op.sheet] = bySheet[op.sheet] || []).push(op);
    });
    var applied = 0;
    Object.keys(bySheet).forEach(function (k) { applied += applySheet_(k, bySheet[k], rev, user, now); });
    setVersion_(rev);
    SpreadsheetApp.flush();
    return { ok: true, version: rev, prevVersion: prev, applied: applied };
  } finally {
    lock.releaseLock();
  }
}

function applySheet_(key, ops, rev, user, now) {
  var sh = sheetFor_(key);
  var applied = 0;
  // clearAll luôn chạy trước các upsert cùng lô
  var clear = ops.filter(function (o) { return o.op === 'clearAll'; });
  var rest = ops.filter(function (o) { return o.op !== 'clearAll'; });
  if (clear.length) {
    var last0 = sh.getLastRow();
    if (last0 >= 2) {
      var n0 = last0 - 1, vals = [];
      for (var i = 0; i < n0; i++) vals.push([rev, 1, now]);
      sh.getRange(2, 2, n0, 3).setValues(vals);     // rev, deleted, updatedAt
    }
  }
  if (!rest.length) return clear.length ? 1 : 0;

  // gộp theo id: thao tác sau cùng thắng
  var latest = {}, order = [];
  rest.forEach(function (op) { var id = String(op.id); if (!(id in latest)) order.push(id); latest[id] = op; });
  var finalOps = order.map(function (id) { return latest[id]; });

  var header = ensureDisplayCols_(sh, finalOps);
  var idx = idIndex_(sh), map = idx.map, nextRow = idx.last + 1;
  var updates = [], appends = [];
  finalOps.forEach(function (op) {
    var id = String(op.id), row = map[id];
    if (op.op === 'delete') { if (row) updates.push({ row: row, del: true }); return; }
    var values = buildRow_(op, header, rev, user, now);
    if (row) updates.push({ row: row, values: values }); else appends.push(values);
  });

  var width = SYS_N + header.length;
  // cập nhật dòng đã có
  if (updates.length > 30) {
    var last = sh.getLastRow();
    if (last >= 2) {
      var range = sh.getRange(2, 1, last - 1, width), data = range.getValues();
      updates.forEach(function (u) {
        var r = data[u.row - 2];
        if (u.del) { r[1] = rev; r[2] = 1; r[3] = now; r[4] = user; }
        else for (var c = 0; c < width; c++) r[c] = u.values[c];
      });
      range.setValues(data);
    }
  } else {
    updates.forEach(function (u) {
      if (u.del) sh.getRange(u.row, 2, 1, 4).setValues([[rev, 1, now, user]]);
      else sh.getRange(u.row, 1, 1, width).setValues([u.values]);
    });
  }
  applied += updates.length;
  // thêm dòng mới (1 lần ghi)
  if (appends.length) {
    ensureGrid_(sh, nextRow + appends.length - 1, width);
    sh.getRange(nextRow, 1, appends.length, width).setValues(appends);
    applied += appends.length;
  }
  return applied;
}

// ---------------------------------------------------------------- changes
function changes_(since) {
  var version = getVersion_();     // đọc TRƯỚC khi đọc dòng: nếu có ghi xen giữa, lần sau chỉ tải lại (an toàn)
  var res = { ok: true, version: version, since: since, empty: false, changes: {} };
  var live = 0;
  Object.keys(SHEETS).forEach(function (key) {
    var sh = sheetFor_(key), last = sh.getLastRow();
    var block = { upserts: [], deletes: [] };
    res.changes[key] = block;
    if (last < 2) return;
    var n = last - 1;
    var meta = sh.getRange(2, 1, n, 3).getValues();   // id, rev, deleted
    var hit = [];
    for (var i = 0; i < n; i++) {
      var isDel = Number(meta[i][2]) === 1;
      if (!isDel) live++;
      if (Number(meta[i][1]) > since) hit.push({ i: i, del: isDel });
    }
    if (!hit.length) return;
    var json = null;
    hit.forEach(function (h) {
      var id = String(meta[h.i][0]);
      if (h.del) { if (since > 0) block.deletes.push(id); return; }
      if (json === null) json = hit.length > 20 ? sh.getRange(2, 6, n, 3).getValues() : {};
      var parts = hit.length > 20 ? json[h.i] : sh.getRange(h.i + 2, 6, 1, 3).getValues()[0];
      var text = parts.map(function (p) { return p === null || p === undefined ? '' : String(p); }).join('');
      var record = text === '' ? null : JSON.parse(text);
      block.upserts.push(key === 'schedules' ? { key: id, record: record } : record);
    });
  });
  res.empty = since === 0 && live === 0;
  return res;
}

// ---------------------------------------------------------------- authentication
function hashSha256_(str) {
  if (!str) return '';
  if (typeof Utilities !== 'undefined' && Utilities.computeDigest) {
    var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(str), Utilities.Charset.UTF_8);
    var hex = '';
    for (var i = 0; i < raw.length; i++) {
      var byteVal = raw[i] < 0 ? raw[i] + 256 : raw[i];
      var b = byteVal.toString(16);
      if (b.length === 1) hex += '0';
      hex += b;
    }
    return hex.toLowerCase();
  }
  return String(str);
}

function login_(username, password, token) {
  if (!authOk_(token)) return { ok: false, error: 'Sai token kết nối (unauthorized)' };
  var u = String(username || '').trim().toLowerCase();
  var p = String(password || '');
  if (!u || !p) {
    return { ok: false, error: 'Vui lòng nhập đầy đủ tài khoản và mật khẩu / 请输入账号和密码' };
  }

  var s = ss_();
  var sh = s.getSheetByName('Users') || s.getSheetByName('users') || s.getSheetByName('USERS');
  if (!sh) {
    return { ok: false, error: 'Không tìm thấy tab "Users" trên Google Sheets / 未找到 Users 工作表' };
  }

  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) {
    return { ok: false, error: 'Tab Users chưa có dữ liệu tài khoản / Users 表无数据' };
  }

  // Đọc hàng tiêu đề (dòng 1)
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
    return String(h || '').trim().toLowerCase().replace(/[\s_\-]/g, '');
  });

  // Tìm vị trí các cột
  var colUser = -1, colId = -1, colPass = -1, colName = -1, colRole = -1, colActive = -1, colJson = -1;
  for (var c = 0; c < headers.length; c++) {
    var h = headers[c];
    if (colUser === -1 && (h === 'username' || h === 'user' || h === 'taikhoan' || h === 'account')) colUser = c;
    if (colId === -1 && h === 'id') colId = c;
    if (colPass === -1 && (h === 'password' || h === 'pass' || h === 'matkhau' || h === 'pwd')) colPass = c;
    if (colName === -1 && (h === 'name' || h === 'fullname' || h === 'hoten' || h === 'ten' || h === 'displayname')) colName = c;
    if (colRole === -1 && (h === 'role' || h === 'vaitro' || h === 'quyen')) colRole = c;
    if (colActive === -1 && (h === 'active' || h === 'status' || h === 'trangthai' || h === 'enabled')) colActive = c;
    if (colJson === -1 && h === 'json') colJson = c;
  }

  // Mặc định nếu không tìm thấy tiêu đề chuẩn: ưu tiên username, sau đó id, hoặc cột đầu tiên
  if (colUser === -1) colUser = colId !== -1 ? colId : 0;
  if (colPass === -1) colPass = (colUser === 0 ? 1 : (colUser === 1 ? 2 : 1));

  var pHash = hashSha256_(p);
  var rows = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowUser = '', rowPass = '', rowName = '', rowRole = 'VIEWER', rowActive = 1;

    // Hỗ trợ nếu bản ghi được lưu dạng JSON trong cột json
    if (colJson !== -1 && row[colJson]) {
      try {
        var obj = JSON.parse(String(row[colJson]));
        if (obj) {
          rowUser = obj.username || obj.user || obj.id || '';
          rowPass = obj.password || obj.pass || '';
          rowName = obj.name || obj.fullName || '';
          rowRole = obj.role || 'VIEWER';
          rowActive = obj.active !== undefined ? obj.active : 1;
        }
      } catch (e) {}
    }

    if (!rowUser && colUser < row.length) rowUser = String(row[colUser] || '').trim();
    if (!rowPass && colPass < row.length) rowPass = String(row[colPass] || '').trim();
    if (!rowName && colName !== -1 && colName < row.length) rowName = String(row[colName] || '').trim();
    if (colRole !== -1 && colRole < row.length && row[colRole]) rowRole = String(row[colRole]).trim().toUpperCase();
    if (colActive !== -1 && colActive < row.length) {
      var actVal = String(row[colActive] || '').trim().toLowerCase();
      if (actVal === '0' || actVal === 'false' || actVal === 'khoa' || actVal === 'inactive' || actVal === 'block') {
        rowActive = 0;
      }
    }

    if (rowUser.toLowerCase() === u) {
      if (Number(rowActive) === 0) {
        return { ok: false, error: 'Tài khoản đang bị khóa / 账号已被禁用' };
      }
      var passMatch = (rowPass === p) || (rowPass.toLowerCase() === pHash) || (hashSha256_(rowPass) === pHash);
      if (passMatch) {
        var cleanRole = (rowRole === 'ADMIN' || rowRole === 'MANAGER' || rowRole === 'VIEWER') ? rowRole : 'VIEWER';
        return {
          ok: true,
          user: {
            username: rowUser,
            name: rowName || rowUser,
            role: cleanRole
          }
        };
      } else {
        return { ok: false, error: 'Sai mật khẩu / 密码错误' };
      }
    }
  }

  return { ok: false, error: 'Tài khoản không tồn tại / 账号不存在' };
}

