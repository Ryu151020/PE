import fs from "fs";

const envText = fs.readFileSync(".env", "utf8");
const env = {};
envText.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
});

async function run() {
  const toDelete = ["2026-09-30", "2026-09-28"];
  for (const d of toDelete) {
    const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/schedules?date=eq.${d}`, {
      method: "DELETE",
      headers: {
        apikey: env.VITE_SUPABASE_ANON_KEY,
        Authorization: "Bearer " + env.VITE_SUPABASE_ANON_KEY,
      },
    });
    console.log("Delete", d, res.status, res.statusText);
  }

  const check = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/schedules?select=date,status,updated_by,updated_at`, {
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: "Bearer " + env.VITE_SUPABASE_ANON_KEY,
    },
  }).then((r) => r.json());
  console.log("Remaining schedules in Supabase:", check);
}

run();
