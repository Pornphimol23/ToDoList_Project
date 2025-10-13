// scripts/seed_super_admin.js
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { query } from '../config/db.js';


dotenv.config();


async function main(){
const username = process.env.SEED_SUPERADMIN_USERNAME || 'superAdmin';
const password = process.env.SEED_SUPERADMIN_PASSWORD || '12345678';


const role = await query("SELECT id FROM roles WHERE name='super_admin'");
const roleId = role.rows[0].id;


const exists = await query('SELECT id FROM users WHERE username=$1', [username]);
if (exists.rowCount > 0) {
console.log('Super admin already exists.');
process.exit(0);
}


const hash = await bcrypt.hash(password, 10);
const ins = await query(
'INSERT INTO users (username, password_hash, role_id) VALUES ($1,$2,$3) RETURNING id, username',
[username, hash, roleId]
);
console.log('Created super admin:', ins.rows[0]);
console.log('IMPORTANT: Change the password immediately.');
process.exit(0);
}


main().catch(e=>{ console.error(e); process.exit(1); });