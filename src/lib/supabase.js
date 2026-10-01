import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || (typeof process !== "undefined" ? process.env?.VITE_SUPABASE_URL : "") || "";
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || (typeof process !== "undefined" ? process.env?.VITE_SUPABASE_ANON_KEY : "") || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith("http") &&
  !supabaseUrl.includes("your-project-id")
);

export const supabase = isSupabaseConfigured
  ? createClient(
      supabaseUrl,
      supabaseAnonKey,
      typeof window === "undefined" && typeof WebSocket === "undefined"
        ? { realtime: { createSocket: () => null } }
        : undefined
    )
  : null;

// ==========================================
// MAPPERS: Supabase (snake_case) <-> App (camelCase)
// ==========================================

export function employeeFromDb(row) {
  return {
    id: row.id,
    employeeCode: row.employee_code,
    vietnameseName: row.vietnamese_name,
    chineseName: row.chinese_name || "",
    birthYear: row.birth_year || null,
    phone: row.phone || "",
    address: row.address || "",
    joinDate: row.join_date || "",
    resignDate: row.resign_date || null,
    resignReason: row.resign_reason || "",
    position: row.position,
    status: row.status,
    notes: row.notes || "",
  };
}

export function employeeToDb(emp) {
  return {
    id: emp.id,
    employee_code: emp.employeeCode,
    vietnamese_name: emp.vietnameseName,
    chinese_name: emp.chineseName || "",
    birth_year: emp.birthYear ? parseInt(emp.birthYear, 10) : null,
    phone: emp.phone || "",
    address: emp.address || "",
    join_date: emp.joinDate || null,
    resign_date: emp.resignDate || null,
    resign_reason: emp.resignReason || "",
    position: emp.position,
    status: emp.status,
    notes: emp.notes || "",
  };
}

export function moldFromDb(row) {
  return {
    id: row.id,
    moldName: row.mold_name,
    status: row.status,
    notes: row.notes || "",
  };
}

export function moldToDb(mold) {
  return {
    id: mold.id,
    mold_name: mold.moldName,
    status: mold.status,
    notes: mold.notes || "",
  };
}

export function machineFromDb(row) {
  return {
    id: row.id,
    machineNumber: row.machine_number,
    machineCode: row.machine_code,
    machineName: row.machine_name || row.machine_code,
    moldId: row.mold_id || null,
    currentOrderId: row.current_order_id || null,
    status: row.status,
    notes: "",
  };
}

export function machineToDb(machine) {
  return {
    id: machine.id,
    machine_number: machine.machineNumber,
    machine_code: machine.machineCode,
    machine_name: machine.machineName || machine.machineCode,
    mold_id: machine.moldId || null,
    current_order_id: machine.currentOrderId || null,
    status: machine.status,
  };
}

export function orderFromDb(row) {
  let cleanCode = String(row.order_code || "").trim();
  if (cleanCode.includes("##")) {
    cleanCode = cleanCode.split("##")[0];
  } else if (cleanCode.includes("__")) {
    cleanCode = cleanCode.split("__")[0];
  } else {
    const legacyMatch = cleanCode.match(/^(.*?)\s*\((.*?)\)$/);
    if (legacyMatch && (!row.size || legacyMatch[2].toLowerCase() === String(row.size).toLowerCase())) {
      cleanCode = legacyMatch[1].trim();
    }
  }

  return {
    id: row.id,
    orderCode: cleanCode,
    moldId: row.mold_id || null,
    size: row.size || "",
    filmRollName: row.film_roll_name || "",
    completed: Boolean(row.completed),
  };
}

export function orderToDb(order) {
  return {
    id: order.id,
    order_code: order.orderCode,
    mold_id: order.moldId || null,
    size: order.size || "",
    film_roll_name: order.filmRollName || "",
    completed: Boolean(order.completed),
  };
}

export function scheduleFromDb(row) {
  return {
    date: row.date,
    entries: row.entries || {},
    dayLeader: row.day_leader || null,
    dayTeamLeaders: row.day_team_leaders || [],
    nightLeader: row.night_leader || null,
    nightTeamLeaders: row.night_team_leaders || [],
    status: row.status || "SAVED",
    updatedBy: row.updated_by || "",
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function scheduleToDb(dateKey, sched) {
  return {
    date: dateKey,
    entries: sched?.entries || {},
    day_leader: sched?.dayLeader || null,
    day_team_leaders: sched?.dayTeamLeaders || [],
    night_leader: sched?.nightLeader || null,
    night_team_leaders: sched?.nightTeamLeaders || [],
    status: sched?.status || "SAVED",
    updated_by: sched?.updatedBy || "User",
    updated_at: new Date().toISOString(),
  };
}

// ==========================================
// SUPABASE API QUERIES
// ==========================================

export async function fetchFullDatabase() {
  if (!supabase) throw new Error("Supabase is not configured");

  const [empRes, moldRes, machRes, ordRes, schedRes] = await Promise.all([
    supabase.from("employees").select("*").order("employee_code", { ascending: true }),
    supabase.from("molds").select("*").order("id", { ascending: true }),
    supabase.from("machines").select("*").order("machine_number", { ascending: true }),
    supabase.from("orders").select("*").order("order_code", { ascending: true }),
    supabase.from("schedules").select("*"),
  ]);

  if (empRes.error) throw empRes.error;
  if (moldRes.error) throw moldRes.error;
  if (machRes.error) throw machRes.error;
  if (ordRes.error) throw ordRes.error;
  if (schedRes.error) throw schedRes.error;

  const schedulesMap = {};
  (schedRes.data || []).forEach((row) => {
    schedulesMap[row.date] = scheduleFromDb(row);
  });

  return {
    employees: (empRes.data || []).map(employeeFromDb),
    molds: (moldRes.data || []).map(moldFromDb),
    machines: (machRes.data || []).map(machineFromDb),
    orders: (ordRes.data || []).map(orderFromDb),
    schedules: schedulesMap,
  };
}

export async function syncTableToSupabase(tableName, rows, onConflict) {
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  if (!rows || rows.length === 0) return { ok: true };



  try {
    const conflictCol = onConflict || (tableName === "schedules" ? "date" : "id");

    // For orders, ensure distinct order_code in the batch if orders_order_code_key constraint exists on Supabase
    let rowsToUpsert = rows;
    if (tableName === "orders") {
      const seen = new Set();
      rowsToUpsert = rows.map((r) => {
        const item = { ...r };
        const code = String(item.order_code || "").trim().toLowerCase();
        if (seen.has(code)) {
          const suffix = item.size ? `__${item.size}` : `__${item.id}`;
          item.order_code = `${item.order_code}${suffix}`;
        }
        seen.add(code);
        return item;
      });
    }

    const { error } = await supabase.from(tableName).upsert(rowsToUpsert, { onConflict: conflictCol });
    if (error) {
      console.warn(`Batch sync ${tableName} error: ${error.message}. Retrying row-by-row...`);
      let successCount = 0;
      let lastErr = error.message;
      for (const row of rows) {
        let rowToInsert = { ...row };
        let singleRes = await supabase.from(tableName).upsert([rowToInsert], { onConflict: conflictCol });
        if (singleRes.error && tableName === "orders") {
          // If mold_id foreign key failed, retry with mold_id: null so the order is saved
          if (rowToInsert.mold_id && singleRes.error.message?.includes("foreign key")) {
            rowToInsert.mold_id = null;
            singleRes = await supabase.from(tableName).upsert([rowToInsert], { onConflict: conflictCol });
          }
          // If orders_order_code_key unique constraint failed, retry with unique suffix
          if (singleRes.error && singleRes.error.message?.includes("orders_order_code_key")) {
            const sizeSuffix = rowToInsert.size ? `__${rowToInsert.size}` : `__${rowToInsert.id}`;
            rowToInsert.order_code = `${row.order_code}${sizeSuffix}`;
            singleRes = await supabase.from(tableName).upsert([rowToInsert], { onConflict: conflictCol });
          }
        }
        if (!singleRes.error) {
          successCount++;
        } else {
          lastErr = singleRes.error.message;
          console.warn(`Failed row in ${tableName}:`, rowToInsert, singleRes.error.message);
        }
      }
      return { ok: successCount > 0, count: successCount, error: successCount === 0 ? lastErr : null };
    }
    return { ok: true, count: rows.length };
  } catch (err) {
    console.error(`Error syncing ${tableName} to Supabase:`, err);
    return { ok: false, error: err.message };
  }
}

export async function deleteFromSupabase(tableName, id) {
  if (!supabase) return { ok: false };
  try {
    const idCol = tableName === "schedules" ? "date" : "id";
    const { error } = await supabase.from(tableName).delete().eq(idCol, id);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error(`Error deleting from ${tableName}:`, err);
    return { ok: false, error: err.message };
  }
}

export async function bulkDeleteFromSupabase(tableName, ids) {
  if (!supabase) return { ok: false };
  if (!ids || ids.length === 0) return { ok: true };
  try {
    const idCol = tableName === "schedules" ? "date" : "id";
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const { error } = await supabase.from(tableName).delete().in(idCol, chunk);
      if (error) throw error;
    }
    return { ok: true };
  } catch (err) {
    console.error(`Error bulk deleting from ${tableName}:`, err);
    return { ok: false, error: err.message };
  }
}

export async function deleteAllFromSupabase(tableName) {
  if (!supabase) return { ok: false };
  try {
    const idCol = tableName === "schedules" ? "date" : "id";
    const { error } = await supabase.from(tableName).delete().neq(idCol, "___non_existent_key___");
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error(`Error deleting all from ${tableName}:`, err);
    return { ok: false, error: err.message };
  }
}

export async function authenticateSupabaseUser(username, password) {
  if (!supabase) {
    return { ok: false, error: "Chưa cấu hình Supabase. Vui lòng thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào .env" };
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, password, name, role")
      .ilike("username", username.trim())
      .maybeSingle();

    if (error) {
      console.error("Supabase user query error:", error);
      return { ok: false, error: `Lỗi kết nối Supabase: ${error.message}` };
    }

    if (!data) {
      return { ok: false, error: "Tài khoản không tồn tại / 账号不存在" };
    }

    if (data.password !== password) {
      return { ok: false, error: "Mật khẩu không chính xác / 密码错误" };
    }

    return {
      ok: true,
      user: {
        id: data.id,
        username: data.username,
        name: data.name || data.username,
        role: data.role || "ADMIN",
      },
    };
  } catch (err) {
    console.error("Auth error:", err);
    return { ok: false, error: err.message || "Lỗi xác thực người dùng" };
  }
}
