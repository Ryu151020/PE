import { COLLECTIONS, scheduleCols } from "./schema";

/* Entity-level diff / merge between two db snapshots.
   op = { sheet, id, op: "upsert", record, cols } | { sheet, id, op: "delete" }
   changes (from the server) = { employees: { upserts: [record], deletes: [id] }, …, schedules: { upserts: [{key, record}], deletes: [key] } } */

const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
const EMPTY = () => ({ employees: [], molds: [], orders: [], machines: [], schedules: {} });

export function diffDb(base, next) {
  const ops = [];
  COLLECTIONS.forEach(({ key, sheet, cols }) => {
    const before = new Map(((base && base[key]) || []).map((r) => [String(r.id), r]));
    const seen = new Set();
    ((next && next[key]) || []).forEach((r) => {
      const id = String(r.id); seen.add(id);
      const prev = before.get(id);
      if (prev === undefined || (prev !== r && !same(prev, r))) ops.push({ sheet, id, op: "upsert", record: r, cols: cols(r) });
    });
    before.forEach((_, id) => { if (!seen.has(id)) ops.push({ sheet, id, op: "delete" }); });
  });
  const bs = (base && base.schedules) || {}, ns = (next && next.schedules) || {};
  Object.keys(ns).forEach((k) => {
    if (!(k in bs) || (bs[k] !== ns[k] && !same(bs[k], ns[k]))) ops.push({ sheet: "schedules", id: k, op: "upsert", record: ns[k], cols: scheduleCols(k, ns[k]) });
  });
  Object.keys(bs).forEach((k) => { if (!(k in ns)) ops.push({ sheet: "schedules", id: k, op: "delete" }); });
  return ops;
}

export const opKeys = (ops) => new Set(ops.map((o) => `${o.sheet}:${o.id}`));

function mergeList(list, upserts, deletes) {
  const up = new Map(upserts.map((r) => [String(r.id), r]));
  const del = new Set(deletes.map(String));
  const out = [];
  list.forEach((r) => {
    const id = String(r.id);
    if (del.has(id)) return;
    if (up.has(id)) { out.push(up.get(id)); up.delete(id); } else out.push(r);
  });
  up.forEach((r) => out.push(r));   // new records go to the end
  return out;
}

export function mergeChanges(db, changes) {
  const base = db || EMPTY();
  const next = { ...base };
  COLLECTIONS.forEach(({ key }) => {
    const c = changes[key];
    if (c && (c.upserts.length || c.deletes.length)) next[key] = mergeList(base[key] || [], c.upserts, c.deletes);
  });
  const sc = changes.schedules;
  if (sc && (sc.upserts.length || sc.deletes.length)) {
    const s = { ...(base.schedules || {}) };
    sc.deletes.forEach((k) => { delete s[k]; });
    sc.upserts.forEach(({ key, record }) => { s[key] = record; });
    next.schedules = s;
  }
  return next;
}

export const dbFromChanges = (changes) => mergeChanges(EMPTY(), changes);

/* replay locally-pending ops on top of a server snapshot */
export function applyOps(db, ops) {
  const changes = {}; COLLECTIONS.forEach(({ key }) => { changes[key] = { upserts: [], deletes: [] }; });
  changes.schedules = { upserts: [], deletes: [] };
  ops.forEach((o) => {
    if (o.sheet === "schedules") { if (o.op === "upsert") changes.schedules.upserts.push({ key: o.id, record: o.record }); else changes.schedules.deletes.push(o.id); return; }
    const key = COLLECTIONS.find((c) => c.sheet === o.sheet).key;
    if (o.op === "upsert") changes[key].upserts.push(o.record); else changes[key].deletes.push(o.id);
  });
  return mergeChanges(db, changes);
}

/* drop from `changes` everything the user has edited locally but not yet sent (local wins) */
export function filterChanges(changes, keys) {
  const out = {};
  COLLECTIONS.forEach(({ key, sheet }) => {
    out[key] = { upserts: changes[key].upserts.filter((r) => !keys.has(`${sheet}:${r.id}`)), deletes: changes[key].deletes.filter((id) => !keys.has(`${sheet}:${id}`)) };
  });
  out.schedules = { upserts: changes.schedules.upserts.filter((u) => !keys.has(`schedules:${u.key}`)), deletes: changes.schedules.deletes.filter((k) => !keys.has(`schedules:${k}`)) };
  return out;
}

export const countChanges = (changes) => Object.values(changes).reduce((n, c) => n + c.upserts.length + c.deletes.length, 0);
