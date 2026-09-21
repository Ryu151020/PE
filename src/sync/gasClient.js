import { storage } from "./storage";

/* Thin client for the Google Apps Script web app (gas/code.gs).
   • GET  ?action=ping | version | changes&since=n
   • POST text/plain JSON body { action:"save", ops:[…] }   (text/plain avoids the CORS pre-flight that Apps Script cannot answer)
   Performance: version checks are de-duplicated / cached for 2s, GETs retry on network errors, big saves are split into chunks. */

const CFG_KEY = "pe_gas_config_v1";
const env = (typeof import.meta !== "undefined" && import.meta.env) || {};

export function getConfig() {
  const s = storage.get(CFG_KEY) || {};
  return {
    url: String(s.url !== undefined ? s.url : env.VITE_GAS_URL || "").trim(),
    token: String(s.token !== undefined ? s.token : env.VITE_GAS_TOKEN || "").trim(),
    pollMs: Number(s.pollMs) || Number(env.VITE_POLL_MS) || 8000,
  };
}
export const saveConfig = (cfg) => storage.set(CFG_KEY, { url: cfg.url || "", token: cfg.token || "" , ...(cfg.pollMs ? { pollMs: cfg.pollMs } : {}) });
export const clearConfig = () => storage.set(CFG_KEY, { url: "", token: "" });
export const isConfigured = () => !!getConfig().url;

async function http(method, params, body, { cfg = getConfig(), timeoutMs = 30000 } = {}) {
  if (!cfg.url) throw new Error("Chưa cấu hình Web App URL");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let res;
    if (method === "GET") {
      const q = new URLSearchParams({ ...params, token: cfg.token });
      res = await fetch(`${cfg.url}${cfg.url.includes("?") ? "&" : "?"}${q}`, { signal: ctrl.signal, redirect: "follow" });
    } else {
      res = await fetch(cfg.url, { method: "POST", signal: ctrl.signal, redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ ...body, token: cfg.token }) });
    }
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { throw new Error(res.ok ? "Phản hồi không phải JSON — kiểm tra URL kết thúc bằng /exec và quyền truy cập 'Anyone'" : `HTTP ${res.status}`); }
    if (!json.ok) throw new Error(json.error === "unauthorized" ? "Sai token (unauthorized)" : json.error || "Lỗi máy chủ");
    return json;
  } catch (e) {
    if (e && e.name === "AbortError") throw new Error("Hết thời gian chờ Google Sheets");
    throw e;
  } finally { clearTimeout(timer); }
}

async function getWithRetry(params, opts, retries = 2) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try { return await http("GET", params, null, opts); } catch (e) {
      lastErr = e;
      if (!(e instanceof TypeError)) throw e;                    // only network failures are retried
      await new Promise((r) => setTimeout(r, 400 * 2 ** i));
    }
  }
  throw lastErr;
}

export const apiPing = (cfg) => http("GET", { action: "ping" }, null, { cfg, timeoutMs: 20000 });
export const apiLogin = (username, password) => http("POST", null, { action: "login", username, password }, { timeoutMs: 25000 });

let versionCache = { t: 0, p: null };
export function apiVersion() {
  const now = Date.now();
  if (versionCache.p && now - versionCache.t < 2000) return versionCache.p;
  const p = getWithRetry({ action: "version" }).finally(() => { setTimeout(() => { if (versionCache.p === p) versionCache = { t: 0, p: null }; }, 2000); });
  versionCache = { t: now, p };
  return p;
}
export const apiChanges = (since) => getWithRetry({ action: "changes", since: String(since) }, { timeoutMs: 60000 });

function chunkOps(ops, maxChars = 700000) {
  const chunks = []; let cur = [], size = 0;
  ops.forEach((op) => {
    const n = JSON.stringify(op).length;
    if (cur.length && size + n > maxChars) { chunks.push(cur); cur = []; size = 0; }
    cur.push(op); size += n;
  });
  if (cur.length) chunks.push(cur);
  return chunks;
}

/* Sends ops (split into chunks). Returns { version, prevVersion, interleaved }:
   interleaved = someone else saved between our chunks/our last-known version. */
export async function apiSave(ops, { user = "" } = {}) {
  let first = null, last = null, interleaved = false;
  for (const chunk of chunkOps(ops)) {
    const res = await http("POST", null, { action: "save", user, ops: chunk }, { timeoutMs: 60000 });
    if (first === null) first = res.prevVersion;
    else if (res.prevVersion !== last) interleaved = true;
    last = res.version;
  }
  versionCache = { t: 0, p: null };
  return { version: last, prevVersion: first, interleaved };
}
