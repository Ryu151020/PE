/**
 * Máy chủ giả lập Google Apps Script — chạy NGUYÊN VĂN file code.gs với một "Google Sheets" giả trong bộ nhớ.
 * Dùng để thử đồng bộ khi chưa có Google Sheets thật:
 *
 *     npm run mock:gas          →  http://localhost:8787/exec
 *
 * Dán URL đó vào ô "Web App URL" trong app (bấm vào chip đồng bộ ở góc trên bên phải).
 * Tuỳ chọn:  PORT=8787  MOCK_LATENCY_MS=400 (giả lập độ trễ của Google)  MOCK_FILE=./gas/.mock-data.json (giữ dữ liệu giữa các lần chạy)
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import crypto from "node:crypto";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8787;
const LATENCY = Number(process.env.MOCK_LATENCY_MS) || 0;
const FILE = process.env.MOCK_FILE || "";

// ---------------------------------------------------------------- fake Google Sheets
const store = { sheets: {}, props: {} };
if (FILE && fs.existsSync(FILE)) Object.assign(store, JSON.parse(fs.readFileSync(FILE, "utf8")));
if (!store.sheets.Users) {
  store.sheets.Users = {
    cells: [
      ["id", "username", "password", "name", "role", "active"],
      ["u_1", "Intco", "123", "Intco Admin", "ADMIN", 1],
    ],
    maxRows: 100,
    maxCols: 10,
  };
}
const persist = () => { if (FILE) fs.writeFileSync(FILE, JSON.stringify(store)); };

class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  _check() {
    if (this.r < 1 || this.c < 1 || this.r + this.nr - 1 > this.sh.maxRows || this.c + this.nc - 1 > this.sh.maxCols)
      throw new Error(`The coordinates of the range are outside the dimensions of the sheet (${this.r},${this.c},${this.nr},${this.nc})`);
  }
  getValues() {
    this._check(); const out = [];
    for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) { const v = (this.sh.cells[this.r + i - 1] || [])[this.c + j - 1]; row.push(v === undefined ? "" : v); } out.push(row); }
    return out;
  }
  setValues(vals) {
    this._check();
    if (vals.length !== this.nr || (vals[0] || []).length !== this.nc) throw new Error(`The number of rows/columns in the data does not match the range (${vals.length}x${(vals[0] || []).length} vs ${this.nr}x${this.nc})`);
    for (let i = 0; i < this.nr; i++) { const row = (this.sh.cells[this.r + i - 1] = this.sh.cells[this.r + i - 1] || []); for (let j = 0; j < this.nc; j++) row[this.c + j - 1] = vals[i][j]; }
    return this;
  }
  setValue(v) { return this.setValues(Array.from({ length: this.nr }, () => Array(this.nc).fill(v))); }
  setNumberFormat() { this._check(); return this; }
  setFontWeight() { return this; }
}
class Sheet {
  constructor(name) { const s = (store.sheets[name] = store.sheets[name] || { cells: [], maxRows: 1000, maxCols: 26 }); this.name = name; this.s = s; }
  get cells() { return this.s.cells; } get maxRows() { return this.s.maxRows; } get maxCols() { return this.s.maxCols; }
  getName() { return this.name; }
  getMaxRows() { return this.s.maxRows; } getMaxColumns() { return this.s.maxCols; }
  insertRowsAfter(_p, n) { this.s.maxRows += n; } insertColumnsAfter(_p, n) { this.s.maxCols += n; }
  getLastRow() { let last = 0; this.s.cells.forEach((row, i) => { if (row && row.some((v) => v !== "" && v !== undefined)) last = i + 1; }); return last; }
  getLastColumn() { let last = 0; this.s.cells.forEach((row) => (row || []).forEach((v, j) => { if (v !== "" && v !== undefined) last = Math.max(last, j + 1); })); return last; }
  getRange(r, c, nr = 1, nc = 1) { return new Range(this, r, c, nr, nc); }
  setFrozenRows() {}
  deleteRow(n) { this.s.cells.splice(n - 1, 1); }
}
const spreadsheet = {
  getName: () => "Mock PE Scheduler DB",
  getSheetByName: (n) => (store.sheets[n] ? new Sheet(n) : null),
  insertSheet: (n) => new Sheet(n),
  getSheets: () => Object.keys(store.sheets).map((n) => new Sheet(n)),
};
let locked = false;
const context = {
  console, Logger: { log: (...a) => console.log("[GAS]", ...a) },
  SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet, openById: () => spreadsheet, flush: () => {} },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in store.props ? store.props[k] : null), setProperty: (k, v) => { store.props[k] = String(v); } }) },
  LockService: { getScriptLock: () => ({ waitLock: () => { if (locked) throw new Error("Could not obtain lock"); locked = true; }, releaseLock: () => { locked = false; } }) },
  ContentService: { MimeType: { JSON: "JSON" }, createTextOutput: (t) => ({ t, setMimeType() { return this; }, getContent() { return this.t; } }) },
  Utilities: {
    DigestAlgorithm: { SHA_256: "SHA_256" },
    Charset: { UTF_8: "UTF_8" },
    computeDigest: (_alg, str) => {
      const hash = crypto.createHash("sha256").update(String(str)).digest();
      return Array.from(hash).map((b) => (b >= 128 ? b - 256 : b));
    },
  },
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(here, "code.gs"), "utf8"), context, { filename: "code.gs" });

// ---------------------------------------------------------------- HTTP wrapper (mimics the /exec web app)
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (!url.pathname.startsWith("/exec")) { res.writeHead(404, cors); return res.end("Use /exec"); }
  let body = ""; for await (const chunk of req) body += chunk;
  if (LATENCY) await sleep(LATENCY);
  let out;
  try {
    if (req.method === "POST") out = context.doPost({ postData: { contents: body } });
    else out = context.doGet({ parameter: Object.fromEntries(url.searchParams) });
    persist();
    res.writeHead(200, { ...cors, "Content-Type": "application/json; charset=utf-8" });
    res.end(out.getContent());
  } catch (err) { res.writeHead(500, cors); res.end(JSON.stringify({ ok: false, error: String(err.message || err) })); }
}).listen(PORT, () => console.log(`Mock GAS chạy tại http://localhost:${PORT}/exec  (độ trễ giả lập: ${LATENCY}ms${FILE ? `, lưu vào ${FILE}` : ""})`));
