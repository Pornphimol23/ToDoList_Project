// routes/tasks.js
import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js'; // เพิ่ม requireRole เข้ามา
import { listMyTasks, createTask, updateTask, deleteTask } from '../controllers/taskController.js';

const router = Router();

//  route ปกติของ user
router.get('/', verifyToken, listMyTasks);
router.post('/', verifyToken, createTask);
router.put('/:id', verifyToken, updateTask);
router.delete('/:id', verifyToken, deleteTask);

//route พิเศษสำหรับ super_admin
router.get('/admin', verifyToken, requireRole(['super_admin']), (req, res) => {
  res.json({ message: 'Welcome Super Admin' });
});

export default router;
