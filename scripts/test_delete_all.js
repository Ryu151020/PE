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

const headers = {
  apikey: env.VITE_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

async function testDeleteSchedules() {
  console.log("Deleting schedules with date=neq.___non_existent_key___");
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/schedules?date=neq.___non_existent_key___`, {
    method: "DELETE",
    headers,
  });
  console.log("Status:", res.status, res.statusText);
  const text = await res.text();
  console.log("Body:", text);
}

testDeleteSchedules();
