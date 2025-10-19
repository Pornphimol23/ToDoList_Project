// config/db.js
import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // ใช้ sslmode=require จาก .env โดยตรง
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
}

// ทดสอบการเชื่อมต่อ
if (process.argv.includes('--test')) {
  (async () => {
    try {
      const result = await query('SELECT NOW()');
      console.log('✅ Database connected successfully:', result.rows[0]);
    } catch (err) {
      console.error('❌ Database connection failed:', err.message);
    }
  })();
}
