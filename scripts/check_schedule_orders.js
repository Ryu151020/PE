import fs from "fs";

const envText = fs.readFileSync(".env", "utf8");
const env = {};
envText.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
});

async function checkSchedules() {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/schedules?select=date,entries`, {
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: "Bearer " + env.VITE_SUPABASE_ANON_KEY },
  }).then(r => r.json());
  res.forEach(s => {
    const entries = s.entries || {};
    const orderIds = Object.values(entries).map(e => e?.orderId).filter(Boolean);
    console.log(`Schedule date ${s.date} has ${orderIds.length} orders assigned:`, orderIds.slice(0, 3));
  });
}

checkSchedules();
