import fs from "fs";

const envText = fs.readFileSync(".env", "utf8");
const env = {};
envText.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
});

async function testUpsert() {
  const row = {
    date: "2026-10-02",
    entries: { M01: { machineId: "M01", moldId: "K01", orderId: "DH-01" } },
    day_leader: null,
    day_team_leaders: [],
    night_leader: null,
    night_team_leaders: [],
    status: "SAVED",
    updated_by: "Test",
    updated_at: new Date().toISOString(),
  };

  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/schedules?on_conflict=date`, {
    method: "POST",
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: "Bearer " + env.VITE_SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify([row]),
  });

  console.log("Upsert status:", res.status, res.statusText);
  const text = await res.text();
  console.log("Upsert response:", text);
}

testUpsert();
