import { Router } from 'express';
import { query, execute, lastInsertId, transaction } from '../db.js';
import { requireAuth, requireMember, requireAdmin, safe } from '../middleware.js';
import taskRoutes from './tasks.js';

const router = Router();
router.use(requireAuth);

router.get('/', safe((req, res) => {
  const rows = query(
    `SELECT w.id, w.name, m.role FROM workspaces w
     JOIN members m ON m.workspace_id = w.id
     WHERE m.user_id = ?`,
    [req.user.userId]
  );
  res.json(rows);
}));

router.post('/', safe((req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Workspace name is required' });
  const id = transaction(() => {
    execute('INSERT INTO workspaces (name) VALUES (?)', [name]);
    const workspaceId = lastInsertId();
    execute('INSERT INTO members VALUES (?, ?, ?)', [workspaceId, req.user.userId, 'ADMIN']);
    return workspaceId;
  });
  res.json({ id, name, role: 'ADMIN' });
}));

router.post('/:id/invite', requireMember, requireAdmin, safe((req, res) => {
  const invitee = query('SELECT id FROM users WHERE email = ?', [req.body.email])[0];
  if (!invitee) return res.status(404).json({ error: 'No user with that email' });
  transaction(() => execute('INSERT OR IGNORE INTO members VALUES (?, ?, ?)', [req.params.id, invitee.id, 'MEMBER']));
  res.json({ ok: true });
}));

router.get('/:id/activity', requireMember, safe((req, res) => {
  const rows = query(
    `SELECT a.*, u.email FROM activity_logs a
     JOIN users u ON u.id = a.user_id
     WHERE a.workspace_id = ? ORDER BY a.id DESC LIMIT 20`,
    [req.params.id]
  );
  res.json(rows);
}));

router.use('/:id/tasks', requireMember, taskRoutes);

export default router;
