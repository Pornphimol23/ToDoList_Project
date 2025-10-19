// controllers/adminController.js
import { query } from "../config/db.js";
import { spawn } from "child_process";

/* 🧾 ดึงรายชื่อผู้ใช้ทั้งหมด (เฉพาะ Super Admin) */
export async function listUsers(req, res, next) {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Forbidden: Super Admin only" });
    }

    const { rows } = await query(
      `
      SELECT u.id, u.username, u.is_active, r.name AS role, u.created_at
      FROM users u
      JOIN roles r ON r.id = u.role_id
      ORDER BY u.id ASC
      `
    );

    const formatted = rows.map((u) => ({
      ...u,
      created_at: new Date(u.created_at).toISOString().slice(0, 16).replace("T", " "),
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

    const userData = await query("SELECT id, role_id FROM users WHERE id=$1", [id]);
    if (!userData.rowCount) {
      return res.status(404).json({ message: "User not found" });
    }

    await query("DELETE FROM users WHERE id=$1", [id]);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (e) {
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
    res.setHeader("Content-Disposition", `attachment; filename="backup-${ts}.sql"`);

    const child = spawn(dumpCmd, [dbUrl]);

    // ส่งสตรีมผลลัพธ์ของ pg_dump ไปให้ client ดาวน์โหลด
    child.stdout.pipe(res);

    // log error ของ pg_dump
    child.stderr.on("data", (d) => console.error("pg_dump:", d.toString()));

    // ถ้า spawn ตัวโปรเซสมีปัญหา
    child.on("error", (err) => {
      console.error("pg_dump failed:", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "pg_dump failed", error: err.message });
      } else {
        // ถ้าหัวข้อถูกส่งไปแล้ว ปิดการเชื่อมต่อ
        res.end();
      }
    });

    // (เสริม) ปิด response เมื่อ pg_dump จบ
    child.on("close", (code) => {
      if (code !== 0 && !res.headersSent) {
        res.status(500).json({ message: `pg_dump exited with code ${code}` });
      }
      // ถ้าส่งสตรีมเสร็จแล้ว res จะปิดเองจาก pipe
    });
  } catch (e) {
    next(e);
  }
}
