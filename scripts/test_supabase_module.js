import fs from "fs";

const envText = fs.readFileSync(".env", "utf8");
envText.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
    process.env[k] = v;
  }
});

if (typeof WebSocket === "undefined") {
  globalThis.WebSocket = class DummyWS {};
}

async function run() {
  const { deleteAllFromSupabase, fetchFullDatabase, isSupabaseConfigured } = await import("../src/lib/supabase.js");
  console.log("isSupabaseConfigured:", isSupabaseConfigured);
  const db = await fetchFullDatabase();
  console.log("Full DB fetched successfully:");
  console.log("Employees:", db.employees.length);
  console.log("Molds:", db.molds.length);
  console.log("Orders:", db.orders.length);
  console.log("Machines:", db.machines.length);
  console.log("Schedules:", Object.keys(db.schedules).length);
}

run().catch(console.error);
