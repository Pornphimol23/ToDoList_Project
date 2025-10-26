// controllers/taskController.js
import { pool } from '../config/db.js';

/* ==========================================================
   🧾 แสดงงานทั้งหมดของผู้ใช้ + รองรับการค้นหาและกรอง
   (super_admin ดูทุกคนได้ / user ดูของตัวเองเท่านั้น)
========================================================== */
export async function listMyTasks(req, res) {
  try {
    const userId = req.user?.id || 1;
    const role = req.user?.role || "user";
    const { q, status, priority } = req.query;

    let baseQuery = `
      SELECT
        t.id,
        t.title,
        t.description,
        s.name AS status,
        p.name AS priority,
        t.due_date,
        t.created_at,
        t.updated_at,
        u.username AS owner
      FROM tasks t
      LEFT JOIN statuses s ON t.status_id = s.id
      LEFT JOIN priorities p ON t.priority_id = p.id
      LEFT JOIN users u ON u.id = t.user_id
    `;

    let conditions = [];
    let params = [];
    let idx = 1;

    // 🔹 user ปกติ เห็นเฉพาะของตัวเอง
    if (role !== "super_admin") {
      conditions.push(`t.user_id = $${idx}`);
      params.push(userId);
      idx++;
    }

    // ✅ เงื่อนไขการค้นหา
    if (q) {
      if (role === "super_admin") {
        // super_admin ค้นหาเฉพาะชื่อเจ้าของงาน
        const userCheck = await pool.query(
          "SELECT id FROM users WHERE username ILIKE $1 LIMIT 1",
          [q]
        );

        if (userCheck.rowCount > 0) {
          const ownerId = userCheck.rows[0].id;
          conditions.push(`t.user_id = $${idx}`);
          params.push(ownerId);
          idx++;
        } else {
          // ถ้าไม่พบชื่อ user  ไม่คืนค่า
          conditions.push("1=0");
        }
      } else {
        //  user ปกติ: ค้นใน title หรือ description
        conditions.push(`(
          t.title ILIKE $${idx}
          OR t.description ILIKE $${idx}
        )`);
        params.push(`%${q}%`);
        idx++;
      }
    }

    // เงื่อนไข status
    if (status) {
      conditions.push(`s.name = $${idx}`);
      params.push(status);
      idx++;
    }

    // เงื่อนไข priority
    if (priority) {
      conditions.push(`p.name = $${idx}`);
      params.push(priority);
      idx++;
    }

    if (conditions.length > 0) {
      baseQuery += " WHERE " + conditions.join(" AND ");
    }

    baseQuery += " ORDER BY t.id ASC";

    const result = await pool.query(baseQuery, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error listing tasks:", err.message);
    res.status(500).json({ message: "Failed to list tasks" });
  }
}


/* ==========================================================
   ➕ เพิ่มงานใหม่
========================================================== */
export async function createTask(req, res) {
  try {
    const userId = req.user?.id || 1;
    const { title, description, status, priority, due_date } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // 🔹 แปลงชื่อสถานะและความสำคัญเป็น id (lookup จากตาราง)
    const sRes = await pool.query(
      'SELECT id FROM statuses WHERE name = $1',
      [status || 'pending']
    );
    const pRes = await pool.query(
      'SELECT id FROM priorities WHERE name = $1',
      [priority || 'medium']
    );

    const statusId = sRes.rows[0]?.id || 1;
    const priorityId = pRes.rows[0]?.id || 1;

    // 🔹 บันทึกงานใหม่
    const result = await pool.query(
      `
      INSERT INTO tasks
      (user_id, title, description, due_date, status_id, priority_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
      `,
      [userId, title, description || '', due_date || null, statusId, priorityId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error creating task:', err.message);
    res.status(500).json({ message: 'Failed to create task' });
  }
}

/* ==========================================================
   ✏️ อัปเดตงาน (แก้ไขได้ทุกฟิลด์)
========================================================== */
export async function updateTask(req, res) {
  try {
    const { id } = req.params;
    const { title, description, status, priority, due_date } = req.body;

    // 🔹 ตรวจสอบว่ามี task นี้ไหม
    const check = await pool.query('SELECT * FROM tasks WHERE id=$1', [id]);
    if (check.rowCount === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // 🔹 แปลงชื่อสถานะและความสำคัญเป็น id
    const sRes = await pool.query(
      'SELECT id FROM statuses WHERE name = $1',
      [status || 'pending']
    );
    const pRes = await pool.query(
      'SELECT id FROM priorities WHERE name = $1',
      [priority || 'medium']
    );

    const statusId = sRes.rows[0]?.id || 1;
    const priorityId = pRes.rows[0]?.id || 1;

    // 🔹 อัปเดตข้อมูล
    const result = await pool.query(
      `
      UPDATE tasks
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        due_date = COALESCE($3, due_date),
        status_id = COALESCE($4, status_id),
        priority_id = COALESCE($5, priority_id),
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
      `,
      [title, description, due_date, statusId, priorityId, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating task:', err.message);
    res.status(500).json({ message: 'Failed to update task' });
  }
}

/* ==========================================================
   🗑️ ลบงาน
========================================================== */
export async function deleteTask(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM tasks WHERE id=$1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting task:', err.message);
    res.status(500).json({ message: 'Failed to delete task' });
  }
}
