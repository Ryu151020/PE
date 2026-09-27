-- ============================================================
-- PE SCHEDULER - SUPABASE CLEAN DATABASE SCHEMA
-- ============================================================

-- 1. BẢNG NHÂN VIÊN
CREATE TABLE IF NOT EXISTS public.employees (
  id TEXT PRIMARY KEY,
  employee_code TEXT UNIQUE NOT NULL,
  vietnamese_name TEXT NOT NULL,
  chinese_name TEXT DEFAULT '',
  birth_year INTEGER,
  phone TEXT,
  address TEXT,
  join_date DATE,
  resign_date DATE,
  resign_reason TEXT,
  position TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG KHUÔN
CREATE TABLE IF NOT EXISTS public.molds (
  id TEXT PRIMARY KEY,
  mold_name TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG ĐƠN HÀNG
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_code TEXT UNIQUE NOT NULL,
  mold_id TEXT REFERENCES public.molds(id) ON DELETE SET NULL,
  size TEXT,
  film_roll_name TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG MÁY SẢN XUẤT (41 máy)
CREATE TABLE IF NOT EXISTS public.machines (
  id TEXT PRIMARY KEY,
  machine_number INTEGER UNIQUE NOT NULL,
  machine_code TEXT NOT NULL,
  machine_name TEXT,
  mold_id TEXT REFERENCES public.molds(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  current_order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BẢNG LỊCH CA THEO NGÀY
CREATE TABLE IF NOT EXISTS public.schedules (
  date TEXT PRIMARY KEY,
  entries JSONB NOT NULL DEFAULT '{}'::jsonb,
  day_leader TEXT,
  day_team_leaders JSONB DEFAULT '[]'::jsonb,
  night_leader TEXT,
  night_team_leaders JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'SAVED',
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BẢNG TÀI KHOẢN NGƯỜI DÙNG
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ADMIN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CẤU HÌNH ROW LEVEL SECURITY (RLS) & POLICIES
-- ============================================================
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.molds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-write employees" ON public.employees;
CREATE POLICY "Allow public read-write employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write molds" ON public.molds;
CREATE POLICY "Allow public read-write molds" ON public.molds FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write orders" ON public.orders;
CREATE POLICY "Allow public read-write orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write machines" ON public.machines;
CREATE POLICY "Allow public read-write machines" ON public.machines FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write schedules" ON public.schedules;
CREATE POLICY "Allow public read-write schedules" ON public.schedules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write users" ON public.users;
CREATE POLICY "Allow public read-write users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- XÓA DỮ LIỆU CŨ TRÊN HỆ THỐNG
-- ============================================================
TRUNCATE TABLE public.schedules CASCADE;
TRUNCATE TABLE public.orders CASCADE;
TRUNCATE TABLE public.molds CASCADE;
TRUNCATE TABLE public.employees CASCADE;

-- ============================================================
-- KHỞI TẠO TÀI KHOẢN ĐĂNG NHẬP DUY NHẤT
-- ============================================================
TRUNCATE TABLE public.users CASCADE;

INSERT INTO public.users (id, username, password, name, role) VALUES
('USER-001', 'Intco', '123', 'Intco', 'ADMIN')
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- ============================================================
-- KHỞI TẠO 41 MÁY TRẮNG (M01 -> M41) TRẠNG THÁI SẴN SÀNG
-- ============================================================
INSERT INTO public.machines (id, machine_number, machine_code, machine_name, status, mold_id, current_order_id)
SELECT 
  'M' || LPAD(i::text, 2, '0') AS id,
  i AS machine_number,
  'M' || LPAD(i::text, 2, '0') AS machine_code,
  'Máy ' || LPAD(i::text, 2, '0') AS machine_name,
  'OPEN' AS status,
  NULL AS mold_id,
  NULL AS current_order_id
FROM generate_series(1, 41) AS i
ON CONFLICT (id) DO UPDATE SET
  machine_number = EXCLUDED.machine_number,
  machine_code = EXCLUDED.machine_code,
  machine_name = EXCLUDED.machine_name,
  mold_id = NULL,
  current_order_id = NULL;