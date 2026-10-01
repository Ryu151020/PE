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
};

async function check() {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/orders?select=id,order_code,created_at&order=created_at.desc`, { headers }).then(r => r.json());
  console.log("Top 5 most recently created orders:");
  console.log(res.slice(0, 5));
  console.log("Unique created_at timestamps:", [...new Set(res.map(r => r.created_at))]);
}

check();
