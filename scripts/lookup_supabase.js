import fs from "fs";
import dns from "dns";

const envText = fs.readFileSync(".env", "utf8");
const env = {};
envText.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
  }
});

const host = new URL(env.VITE_SUPABASE_URL).hostname;
dns.lookup(host, (err, addr) => {
  console.log("Supabase host:", host, "IP:", addr);
});
