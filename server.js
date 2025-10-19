// server.js
import express from 'express';
import { pool } from './config/db.js';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import adminRoutes from './routes/admin.js';
import metaRoutes from './routes/meta.js';


dotenv.config();
const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// ตั้งค่า path ให้ใช้งานใน ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//  ให้ Express เสิร์ฟไฟล์ใน public/
app.use(express.static(path.join(__dirname, 'public')));

// เมื่อเข้า http://localhost:3000/ → ให้แสดงหน้า login.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

//  กำหนดเส้นทาง API
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/meta', metaRoutes);

// เริ่มรัน Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(` Server running on http://localhost:${PORT}`));
