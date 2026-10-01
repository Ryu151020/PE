import fs from "fs";

const envText = fs.readFileSync(".env", "utf8");
const env = {};
envText.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
  }
});

const headers = {
  apikey: env.VITE_SUPABASE_ANON_KEY,
  Authorization: "Bearer " + env.VITE_SUPABASE_ANON_KEY,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function run() {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/orders?id=neq.___non_existent_key___`, {
    method: "DELETE",
    headers,
  });
  console.log("Status:", res.status, res.statusText);
  const data = await res.json();
  console.log("Delete result:", Array.isArray(data) ? `Deleted ${data.length} orders` : data);
}

run();
