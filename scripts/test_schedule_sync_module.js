import fs from "fs";

const envText = fs.readFileSync(".env", "utf8");
envText.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) process.env[parts[0].trim()] = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
});

globalThis.WebSocket = class {};

async function run() {
  const { syncTableToSupabase, scheduleToDb, supabase } = await import("../src/lib/supabase.js");
  console.log("Supabase configured:", Boolean(supabase));

  const testKey = "2026-10-02";
  const dummySched = {
    date: testKey,
    entries: {
      M01: {
        machineId: "M01",
        machineStatus: "OPEN",
        moldId: "K01",
        orderId: "DH-01",
        dayShift: { workers: ["NV01"], overtimeHours: 1 },
        nightShift: { workers: [], overtimeHours: 0 }
      }
    },
    dayLeader: "NV02",
    dayTeamLeaders: [],
    nightLeader: null,
    nightTeamLeaders: [],
    status: "SAVED",
    updatedBy: "Admin",
    updatedAt: new Date().toISOString()
  };

  const row = scheduleToDb(testKey, dummySched);
  console.log("Schedule row prepared:", row.date);
  const res = await syncTableToSupabase("schedules", [row], "date");
  console.log("syncTableToSupabase result:", res);

  const check = await supabase.from("schedules").select("*").eq("date", testKey);
  console.log("Verification from DB:", check.data?.length, "rows");
}

run();
