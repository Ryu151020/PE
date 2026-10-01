global.WebSocket = class {};
import fs from "fs";

const envText = fs.readFileSync(".env", "utf8");
const env = {};
envText.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
    process.env[k] = v;
    env[k] = v;
  }
});

async function run() {
  const {
    fetchFullDatabase,
    deleteFromSupabase,
    deleteAllFromSupabase,
    syncTableToSupabase,
    machineToDb,
  } = await import("../src/lib/supabase.js");

  console.log("=== TEST 1: Delete a single order and verify it never resurrects ===");
  const initDb = await fetchFullDatabase();
  console.log("Initial orders count:", initDb.orders.length);

  if (initDb.orders.length > 0) {
    const targetOrder = initDb.orders[0];
    console.log(`Deleting target order: id=${targetOrder.id}, code=${targetOrder.orderCode}`);

    const delRes = await deleteFromSupabase("orders", targetOrder.id);
    console.log("deleteFromSupabase result:", delRes);

    console.log("Waiting 5 seconds to test resurrection...");
    await new Promise((r) => setTimeout(r, 5000));

    const check1 = await fetchFullDatabase();
    const found1 = check1.orders.find((o) => o.id === targetOrder.id);
    console.log(`Order ${targetOrder.id} found in Supabase after 5s:`, !!found1);
    if (found1) {
      console.error("FAIL: Order resurrected!");
    } else {
      console.log("SUCCESS: Order stayed deleted!");
    }
  }

  console.log("\n=== TEST 2: Delete ALL orders and verify 0 remaining ===");
  // Clear machine current_order_id first
  const machRes = await syncTableToSupabase(
    "machines",
    (initDb.machines || []).map((m) => machineToDb({ ...m, currentOrderId: null }))
  );
  console.log("Machines nulled current_order_id:", machRes.ok);

  const delAllRes = await deleteAllFromSupabase("orders");
  console.log("deleteAllFromSupabase('orders') result:", delAllRes);

  console.log("Waiting 5 seconds to test if any order resurrects...");
  await new Promise((r) => setTimeout(r, 5000));

  const check2 = await fetchFullDatabase();
  console.log("Final orders count in Supabase:", check2.orders.length);
  if (check2.orders.length === 0) {
    console.log("SUCCESS: All orders deleted permanently from Supabase!");
  } else {
    console.error("FAIL: Orders resurrected! Count:", check2.orders.length);
  }
}

run().catch(console.error);
