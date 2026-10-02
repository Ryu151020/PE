import fs from "fs";

const envText = fs.readFileSync(".env", "utf8");
const env = {};
envText.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
});

async function check() {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/schedules?date=eq.2026-09-30`, {
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: "Bearer " + env.VITE_SUPABASE_ANON_KEY },
  }).then((r) => r.json());
  console.log("2026-09-30 in Supabase:", JSON.stringify(res, null, 2));
}

check();
