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

async function test() {
  const dates = [ '2026-10-01', '2026-10-02', '2026-09-30', '2026-09-28' ];
  console.log("Calling supabase.from('schedules').delete().in('date', dates)...");
  const res = await sb.from("schedules").delete().in("date", dates);
  console.log("Response:", res);

  const { data: remaining, error: selErr } = await sb.from("schedules").select("date");
  console.log("Remaining schedules:", remaining, selErr);
}

test();
