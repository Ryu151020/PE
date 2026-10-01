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

async function inspectMachines() {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/machines?select=*&limit=3`, { headers }).then(r => r.json());
  console.log("Machines in Supabase:", res);
}

inspectMachines();
