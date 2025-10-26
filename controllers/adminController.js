// controllers/adminController.js
import { query } from "../config/db.js";
import { spawn } from "child_process";
import bcrypt from "bcrypt";

/* 🧾 ดึงรายชื่อผู้ใช้ทั้งหมด (เฉพาะ Super Admin) */
export async function listUsers(req, res, next) {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Forbidden: Super Admin only" });
    }

    const { rows } = await query(`
      SELECT u.id, u.username, u.is_active, r.name AS role, u.created_at
      FROM users u
      JOIN roles r ON r.id = u.role_id
      ORDER BY u.id ASC
    `);

    const formatted = rows.map((u) => ({
      ...u,
      created_at: new Date(u.created_at)
        .toISOString()
        .slice(0, 16)
        .replace("T", " "),
    }));

    res.json(formatted);
  } catch (e) {
    next(e);
  }
}

/* ❌ ลบผู้ใช้ (เฉพาะ Super Admin) */
export async function deleteUser(req, res, next) {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Forbidden: Super Admin only" });
    }

    const { id } = req.params;

    // ป้องกัน Super Admin ลบตัวเอง
    if (Number(id) === req.user.id) {
      return res.status(400).json({ message: "Cannot delete yourself" });
    }

    const userData = await query("SELECT id FROM users WHERE id=$1", [id]);
    if (!userData.rowCount) {
      return res.status(404).json({ message: "User not found" });
    }

    await query("DELETE FROM users WHERE id=$1", [id]);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (e) {
    next(e);
  }
}

/* 🔑 ผู้ใช้เปลี่ยนรหัสผ่านของตัวเอง */
export async function changeOwnPassword(req, res, next) {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "กรุณากรอกรหัสผ่านเดิมและรหัสใหม่ให้ครบ" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร" });
    }

    const { rows } = await query(
      "SELECT password_hash FROM users WHERE id=$1",
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    const isMatch = await bcrypt.compare(oldPassword, rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "รหัสผ่านเดิมไม่ถูกต้อง" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await query("UPDATE users SET password_hash=$1 WHERE id=$2", [
      hashed,
      userId,
    ]);

    res.json({ message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" });
  } catch (e) {
    console.error("Change password error:", e);
    next(e);
  }
}

/* 💾 สำรองฐานข้อมูล (เฉพาะ Super Admin) */
export async function exportDatabase(req, res, next) {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Forbidden: Super Admin only" });
    }

    const dumpCmd = process.env.PG_DUMP_PATH || "pg_dump";
    const dbUrl = `postgresql://${process.env.PGUSER}:${encodeURIComponent(
      process.env.PGPASSWORD
    )}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;

    res.setHeader("Content-Type", "application/sql");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="backup-${ts}.sql"`
    );

    const child = spawn(dumpCmd, [dbUrl]);
    child.stdout.pipe(res);
    child.stderr.on("data", (d) => console.error("pg_dump:", d.toString()));

    child.on("error", (err) => {
      console.error("pg_dump failed:", err);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ message: "pg_dump failed", error: err.message });
      } else {
        res.end();
      }
    });

    child.on("close", (code) => {
      if (code !== 0 && !res.headersSent) {
        res
          .status(500)
          .json({ message: `pg_dump exited with code ${code}` });
      }
    });
  } catch (e) {
    next(e);
  }
}
