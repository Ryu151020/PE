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

async function deleteAllFromSupabase(tableName) {
  const idCol = tableName === "schedules" ? "date" : "id";
  const res = await sb.from(tableName).delete().neq(idCol, "___non_existent_key___");
  return res;
}

async function test() {
  console.log("Delete schedules res:", await deleteAllFromSupabase("schedules"));
  console.log("Delete orders res:", await deleteAllFromSupabase("orders"));
  console.log("Delete molds res:", await deleteAllFromSupabase("molds"));
  console.log("Delete employees res:", await deleteAllFromSupabase("employees"));
}

test();
