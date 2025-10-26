// controllers/taskController.js
import { pool } from '../config/db.js';

/* ==========================================================
   🧾 แสดงงานทั้งหมดของผู้ใช้ + รองรับการค้นหาและกรอง
========================================================== */
export async function listMyTasks(req, res) {
  try {
    const userId = req.user?.id || 1;
    const { q, status, priority } = req.query;

    // เงื่อนไข dynamic สำหรับ filter
    let conditions = ['t.user_id = $1'];
    let params = [userId];
    let idx = 2;

    if (q) {
      conditions.push(`(t.title ILIKE $${idx} OR t.description ILIKE $${idx})`);
      params.push(`%${q}%`);
      idx++;
    }

    if (status) {
      conditions.push(`s.name = $${idx}`);
      params.push(status);
      idx++;
    }

    if (priority) {
      conditions.push(`p.name = $${idx}`);
      params.push(priority);
      idx++;
    }

    const query = `
      SELECT
        t.id,
        t.title,
        t.description,
        s.name AS status,
        p.name AS priority,
        t.due_date,
        t.created_at,
        t.updated_at
      FROM tasks t
      LEFT JOIN statuses s ON t.status_id = s.id
      LEFT JOIN priorities p ON t.priority_id = p.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.id ASC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error listing tasks:', err.message);
    res.status(500).json({ message: 'Failed to list tasks' });
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

    // แปลงชื่อสถานะและความสำคัญเป็น id
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

    // ตรวจสอบว่า task มีอยู่จริงไหม
    const check = await pool.query('SELECT * FROM tasks WHERE id=$1', [id]);
    if (check.rowCount === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // แปลงชื่อสถานะและความสำคัญเป็น id
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
