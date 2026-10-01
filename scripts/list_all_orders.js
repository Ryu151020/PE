import fs from "fs";

const envText = fs.readFileSync(".env", "utf8");
const env = {};
envText.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
});

async function listOrders() {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/orders?select=id,order_code,size,completed`, {
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: "Bearer " + env.VITE_SUPABASE_ANON_KEY },
  }).then(r => r.json());
  console.log("Total orders in Supabase:", res.length);
  console.log("IDs:", res.map(o => ({ id: o.id, code: o.order_code, size: o.size })));
}

listOrders();
