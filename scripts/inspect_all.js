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

async function inspect() {
  const [s, o, e, m] = await Promise.all([
    fetch(`${env.VITE_SUPABASE_URL}/rest/v1/schedules?select=date`, { headers }).then(r => r.json()),
    fetch(`${env.VITE_SUPABASE_URL}/rest/v1/orders?select=id,order_code,size`, { headers }).then(r => r.json()),
    fetch(`${env.VITE_SUPABASE_URL}/rest/v1/employees?select=id,employee_code`, { headers }).then(r => r.json()),
    fetch(`${env.VITE_SUPABASE_URL}/rest/v1/molds?select=id,mold_name`, { headers }).then(r => r.json()),
  ]);

  console.log("SUPABASE CURRENT STATUS:");
  console.log("Schedules count:", Array.isArray(s) ? s.length : s);
  console.log("Orders count:", Array.isArray(o) ? o.length : o);
  if (Array.isArray(o)) console.log("Orders sample (first 3):", o.slice(0, 3));
  console.log("Employees count:", Array.isArray(e) ? e.length : e);
  console.log("Molds count:", Array.isArray(m) ? m.length : m);
}

inspect();
