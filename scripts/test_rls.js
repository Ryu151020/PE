global.WebSocket = class {};
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envText = fs.readFileSync(".env", "utf8");
const env = {};
envText.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
    env[k] = v;
  }
});

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkRLS() {
  // Test deleting single row with anon key
  const { data: testOrd } = await sb.from("orders").select("id").limit(1);
  console.log("Sample order:", testOrd);
  if (testOrd && testOrd.length > 0) {
    const id = testOrd[0].id;
    console.log("Testing DELETE orders eq id:", id);
    const delRes = await sb.from("orders").delete().eq("id", id).select();
    console.log("Delete result:", delRes);
  }
}

checkRLS();
