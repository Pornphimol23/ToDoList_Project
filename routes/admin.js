// routes/admin.js
import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { listUsers, deleteUser, exportDatabase } from "../controllers/adminController.js";


const router = Router();

//  ตรวจสอบสิทธิ์ Super Admin
router.get("/check", verifyToken, requireRole(["super_admin"]), (req, res) => {
  res.json({ message: "Welcome Super Admin", user: req.user });
});

//  ดึงรายชื่อผู้ใช้ทั้งหมด
router.get("/users", verifyToken, requireRole(["super_admin"]), listUsers);

//  ลบผู้ใช้
router.delete("/users/:id", verifyToken, requireRole(["super_admin"]), deleteUser);

//  export database (backup)
router.get("/export", verifyToken, requireRole(["super_admin"]), exportDatabase);

export default router;
