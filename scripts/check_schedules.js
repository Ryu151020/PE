import fs from "fs";

const envText = fs.readFileSync(".env", "utf8");
const env = {};
envText.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
});

async function check() {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/schedules?select=*`, {
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: "Bearer " + env.VITE_SUPABASE_ANON_KEY },
  }).then((r) => r.json());
  console.log("Total schedules in Supabase:", res?.length);
  for (const s of res || []) {
    console.log("Date:", s.date, "status:", s.status, "updated_by:", s.updated_by, "updated_at:", s.updated_at, "entries_count:", Object.keys(s.entries || {}).length);
  }
}

check();
