//controllers/taskController.js
import { pool } from '../config/db.js';

// แสดงงานทั้งหมดของผู้ใช้
export async function listMyTasks(req, res) {
  try {
    const userId = req.user?.id || 1;

    const result = await pool.query(`
      SELECT 
        t.id, 
        t.title, 
        t.description, 
        s.name AS status, 
        p.name AS priority, 
        t.due_date
      FROM tasks t
      LEFT JOIN statuses s ON t.status_id = s.id
      LEFT JOIN priorities p ON t.priority_id = p.id
      WHERE t.user_id = $1
      ORDER BY t.id ASC
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error listing tasks:', err);
    res.status(500).json({ message: 'Failed to list tasks' });
  }
}

// join จากตาราง statuses และ priorities เพื่อหา id ของชื่อ
//  เพิ่มงานใหม่
export async function createTask(req, res) {
  try {
    const userId = req.user?.id || 1;
    const { title, description, status, priority, due_date } = req.body;

    if (!title) return res.status(400).json({ message: 'Title is required' });

    // แปลงชื่อสถานะเป็น id
    const sRes = await pool.query('SELECT id FROM statuses WHERE name = $1', [status || 'pending']);
    const pRes = await pool.query('SELECT id FROM priorities WHERE name = $1', [priority || 'medium']);

    const statusId = sRes.rows[0]?.id || 1;
    const priorityId = pRes.rows[0]?.id || 1;

    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, description, due_date, status_id, priority_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, title, description || '', due_date || null, statusId, priorityId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ message: 'Failed to create task' });
  }
}



//  อัปเดตงาน
export async function updateTask(req, res) {
  try {
    const { id } = req.params;
    const { title, description, status, priority, due_date } = req.body;

    const sRes = await pool.query('SELECT id FROM statuses WHERE name = $1', [status || 'pending']);
    const pRes = await pool.query('SELECT id FROM priorities WHERE name = $1', [priority || 'medium']);

    const statusId = sRes.rows[0]?.id || 1;
    const priorityId = pRes.rows[0]?.id || 1;

    const result = await pool.query(
      `UPDATE tasks 
       SET title=$1, description=$2, due_date=$3, status_id=$4, priority_id=$5, updated_at = NOW()
       WHERE id=$6 RETURNING *`,
      [title, description, due_date || null, statusId, priorityId, id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ message: 'Task not found' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ message: 'Failed to update task' });
  }
}


// ลบงาน
export async function deleteTask(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM tasks WHERE id=$1', [id]);

    if (result.rowCount === 0)
      return res.status(404).json({ message: 'Task not found' });

    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ message: 'Failed to delete task' });
  }
}
