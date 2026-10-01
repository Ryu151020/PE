import fs from "fs";

const envText = fs.readFileSync(".env", "utf8");
const env = {};
envText.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
});

async function check() {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/machines?select=id,machine_number,current_order_id,mold_id&current_order_id=not.is.null`, {
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: "Bearer " + env.VITE_SUPABASE_ANON_KEY },
  }).then(r => r.json());
  console.log("Machines with current_order_id in Supabase:", res);
}

check();
