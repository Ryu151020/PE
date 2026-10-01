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
  Prefer: "return=representation",
};

async function test() {
  console.log("Testing DELETE request on Supabase schedules...");
  // Let's check permissions or try to delete a fake schedule or test row
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/schedules?date=eq.non_existent_date_9999`, {
    method: "DELETE",
    headers,
  });
  console.log("Delete fake schedule status:", res.status, res.statusText);
  const text = await res.text();
  console.log("Delete fake response:", text);

  // Check what happens if we delete an order or employee
  const res2 = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/orders?id=eq.non_existent_id_9999`, {
    method: "DELETE",
    headers,
  });
  console.log("Delete fake order status:", res2.status, res2.statusText);
  const text2 = await res2.text();
  console.log("Delete fake order response:", text2);
}

test();
