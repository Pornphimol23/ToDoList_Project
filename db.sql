-- สร้างตารางบทบาทผู้ใช้
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL CHECK (name IN ('user','admin','super_admin'))
);

-- สร้างตารางผู้ใช้
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- สร้างตารางสถานะงาน
CREATE TABLE IF NOT EXISTS statuses (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- สร้างตารางระดับความสำคัญ
CREATE TABLE IF NOT EXISTS priorities (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- สร้างตารางงาน (To-Do)
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status_id INT NOT NULL REFERENCES statuses(id),
  priority_id INT NOT NULL REFERENCES priorities(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Trigger สำหรับอัปเดต updated_at อัตโนมัติเมื่อมีการแก้ไข
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- เพิ่มข้อมูลตั้งต้น (Roles / Statuses / Priorities)
INSERT INTO roles (name) VALUES ('user') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('admin') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('super_admin') ON CONFLICT (name) DO NOTHING;

INSERT INTO statuses (name) VALUES ('pending') ON CONFLICT (name) DO NOTHING;
INSERT INTO statuses (name) VALUES ('in_progress') ON CONFLICT (name) DO NOTHING;
INSERT INTO statuses (name) VALUES ('done') ON CONFLICT (name) DO NOTHING;

INSERT INTO priorities (name) VALUES ('low') ON CONFLICT (name) DO NOTHING;
INSERT INTO priorities (name) VALUES ('medium') ON CONFLICT (name) DO NOTHING;
INSERT INTO priorities (name) VALUES ('high') ON CONFLICT (name) DO NOTHING;

-- เพิ่ม Index เพื่อให้ query เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_id ON tasks(status_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority_id ON tasks(priority_id);
