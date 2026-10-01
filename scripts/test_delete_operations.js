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

async function testAllDeletions() {
  const {
    deleteAllFromSupabase,
    fetchFullDatabase,
    syncTableToSupabase,
    machineToDb,
  } = await import("../src/lib/supabase.js");

  console.log("=== STEP 1: Fetch initial counts ===");
  const initDb = await fetchFullDatabase();
  console.log({
    schedules: Object.keys(initDb.schedules).length,
    orders: initDb.orders.length,
    molds: initDb.molds.length,
    employees: initDb.employees.length,
  });

  console.log("=== STEP 2: Null mold_id on machines ===");
  const machineRows = (initDb.machines || []).map((m) =>
    machineToDb({ ...m, moldId: null, currentOrderId: null })
  );
  const mRes = await syncTableToSupabase("machines", machineRows);
  console.log("Machines nulled:", mRes);

  console.log("=== STEP 3: Delete schedules ===");
  const r1 = await deleteAllFromSupabase("schedules");
  console.log("Delete schedules:", r1);

  console.log("=== STEP 4: Delete orders ===");
  const r2 = await deleteAllFromSupabase("orders");
  console.log("Delete orders:", r2);

  console.log("=== STEP 5: Delete molds ===");
  const r3 = await deleteAllFromSupabase("molds");
  console.log("Delete molds:", r3);

  console.log("=== STEP 6: Delete employees ===");
  const r4 = await deleteAllFromSupabase("employees");
  console.log("Delete employees:", r4);

  console.log("=== STEP 7: Verify final counts ===");
  const finalDb = await fetchFullDatabase();
  console.log({
    schedules: Object.keys(finalDb.schedules).length,
    orders: finalDb.orders.length,
    molds: finalDb.molds.length,
    employees: finalDb.employees.length,
    machines: finalDb.machines.length,
  });
}

testAllDeletions().catch(console.error);
