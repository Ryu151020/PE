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

async function run() {
  const swagger = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/`, { headers }).then(r => r.json());
  console.log("Tables:", Object.keys(swagger.definitions || {}));
  console.log("Orders properties:", swagger.definitions?.orders?.properties);
  console.log("Machines properties:", swagger.definitions?.machines?.properties);
  console.log("Schedules properties:", swagger.definitions?.schedules?.properties);
}

run();
