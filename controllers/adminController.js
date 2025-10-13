// controllers/adminController.js
import { query } from '../config/db.js';
import { spawn } from 'child_process';

export async function listUsers(req, res, next) {
  try {
    const { rows } = await query(`
      SELECT u.id, u.username, u.is_active, r.name AS role, u.created_at
      FROM users u JOIN roles r ON r.id=u.role_id
      ORDER BY u.id ASC
    `);
    res.json(rows.map(u => ({
      ...u,
      created_at: new Date(u.created_at).toISOString().slice(0,16).replace('T',' ')
    })));
  } catch (e) {
    next(e);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    if (Number(id) === req.user.id)
      return res.status(400).json({ message: 'Cannot delete yourself' });

    const userData = await query(
      'SELECT u.id, r.name AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1',
      [id]
    );
    if (!userData.rowCount)
      return res.status(404).json({ message: 'User not found' });

    const targetRole = userData.rows[0].role;
    if (req.user.role === 'admin' && targetRole !== 'user')
      return res.status(403).json({ message: 'Admin can delete only normal users' });
    if (req.user.role === 'super_admin' && targetRole === 'super_admin')
      return res.status(403).json({ message: 'Super admin cannot delete another super admin' });

    await query('DELETE FROM users WHERE id=$1', [id]);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function changeRole(req, res, next) {
  try {
    if (req.user.role !== 'super_admin')
      return res.status(403).json({ message: 'Only super admin can change roles' });

    const { id } = req.params;
    const { role } = req.body;
    if (Number(id) === req.user.id)
      return res.status(400).json({ message: 'Cannot change your own role' });

    if (!['user', 'admin', 'super_admin'].includes(role))
      return res.status(400).json({ message: 'Invalid role' });

    const roleRow = await query('SELECT id FROM roles WHERE name=$1', [role]);
    if (!roleRow.rowCount)
      return res.status(400).json({ message: 'Role not found' });

    const roleId = roleRow.rows[0].id;
    await query('UPDATE users SET role_id=$1 WHERE id=$2', [roleId, id]);
    res.status(200).json({ message: 'Role updated' });
  } catch (e) {
    next(e);
  }
}

export async function exportDatabase(req, res, next) {
  try {
    if (req.user.role !== 'super_admin')
      return res.status(403).json({ message: 'Forbidden' });

    const dumpCmd = process.env.PG_DUMP_PATH || 'pg_dump';
    const dbUrl = `postgresql://${process.env.PGUSER}:${encodeURIComponent(process.env.PGPASSWORD)}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;

    res.setHeader('Content-Type', 'application/sql');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${ts}.sql"`);

    const child = spawn(dumpCmd, [dbUrl]);
    child.stdout.pipe(res);
    child.stderr.on('data', (d) => console.error('pg_dump:', d.toString()));
    child.on('error', (err) => {
      console.error('pg_dump failed:', err);
      res.status(500).json({ message: 'pg_dump failed', error: err.message });
    });
  } catch (e) {
    next(e);
  }
}
