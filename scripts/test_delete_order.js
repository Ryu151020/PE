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

async function testDeleteSingleOrder() {
  const { deleteFromSupabase, supabase } = await import("../src/lib/supabase.js");
  const { data: orders } = await supabase.from("orders").select("id, order_code").limit(1);
  console.log("Target order:", orders[0]);

  const res = await deleteFromSupabase("orders", orders[0].id);
  console.log("deleteFromSupabase result:", res);

  const { data: check } = await supabase.from("orders").select("id").eq("id", orders[0].id);
  console.log("Check after delete:", check);
}

testDeleteSingleOrder().catch(console.error);
