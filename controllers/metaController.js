// controllers/metaController.js
import { query } from '../config/db.js';

//  ดึงรายการ "สถานะของงาน" ทั้งหมด
export async function getStatuses(req, res, next) {
try {
const { rows } = await query('SELECT name FROM statuses ORDER BY id');
res.json(rows.map(r => r.name));
} catch (e) { next(e); }
}

// ดึงรายการ "ความสำคัญของงาน" ทั้งหมด
export async function getPriorities(req, res, next) {
try {
const { rows } = await query('SELECT name FROM priorities ORDER BY id');
res.json(rows.map(r => r.name));
} catch (e) { next(e); }
}