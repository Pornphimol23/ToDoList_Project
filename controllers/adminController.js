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
