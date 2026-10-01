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

async function testFK() {
  // Test deleting molds while orders exist
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/molds?id=neq.___non_existent_key___`, {
    method: "DELETE",
    headers,
  });
  console.log("Delete molds status:", res.status, res.statusText);
  const text = await res.text();
  console.log("Delete molds body:", text);

  // Test deleting employees
  const res2 = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/employees?id=neq.___non_existent_key___`, {
    method: "DELETE",
    headers,
  });
  console.log("Delete employees status:", res2.status, res2.statusText);
  const text2 = await res2.text();
  console.log("Delete employees body:", text2);
}

testFK();
