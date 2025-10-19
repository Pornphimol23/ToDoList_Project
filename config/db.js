import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

export async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

export { pool };

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