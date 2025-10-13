// config/db.js
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config(); // โหลดค่าจาก .env

const { Pool } = pkg;

export const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 10,
  idleTimeoutMillis: 30000
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log('executed query', { text, duration, rows: res.rowCount });
  }
  return res;
}


// TEST DATABASE CONNECTION

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
