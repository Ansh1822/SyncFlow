import { Router } from 'express';
import { query, execute, lastInsertId, transaction } from '../db.js';
import { requireAdmin, safe } from '../middleware.js';

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

// mergeParams so we can read :id (the workspace) from the parent router
const router = Router({ mergeParams: true });

function logActivity(workspaceId, taskId, userId, action, detail) {
  execute(
    `INSERT INTO activity_logs (workspace_id, task_id, user_id, action, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [workspaceId, taskId, userId, action, detail, new Date().toISOString()]
  );
}

function broadcast(req, event, payload) {
  req.app.get('io').to(`ws:${req.params.id}`).emit(event, payload);
}

router.get('/', safe((req, res) => {
  const { status, priority, search } = req.query;
  const limit = Math.min(Number(req.query.limit) || 10, 100);
  const page = Math.max(Number(req.query.page) || 1, 1);

  let sql = 'SELECT * FROM tasks WHERE workspace_id = ?';
  const params = [req.params.id];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (priority) { sql += ' AND priority = ?'; params.push(priority); }
  if (search) { sql += ' AND title LIKE ?'; params.push(`%${search}%`); }
  sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
  params.push(limit, (page - 1) * limit);

  res.json(query(sql, params));
}));

router.post('/', safe((req, res) => {
  const { title, priority = 'MEDIUM' } = req.body;
  if (!title || !PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: 'A title and valid priority are required' });
  }
  const task = transaction(() => {
    execute(
      'INSERT INTO tasks (workspace_id, title, priority, created_by, updated_at) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, title, priority, req.user.userId, new Date().toISOString()]
    );
    const id = lastInsertId();
    logActivity(req.params.id, id, req.user.userId, 'CREATED', title);
    return query('SELECT * FROM tasks WHERE id = ?', [id])[0];
  });
  broadcast(req, 'task:created', task);
  res.json(task);
}));

router.patch('/:taskId', safe((req, res) => {
  const workspaceId = req.params.id;
  const task = query('SELECT * FROM tasks WHERE id = ? AND workspace_id = ?', [req.params.taskId, workspaceId])[0];
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { status, priority, title } = req.body;
  if ((status && !STATUSES.includes(status)) || (priority && !PRIORITIES.includes(priority))) {
    return res.status(400).json({ error: 'Invalid status or priority' });
  }

  const next = {
    status: status ?? task.status,
    priority: priority ?? task.priority,
    title: title ?? task.title,
  };
  const changes = Object.keys(next)
    .filter((key) => next[key] !== task[key])
    .map((key) => `${key}: ${task[key]} -> ${next[key]}`)
    .join(', ');
  if (!changes) return res.json(task);

  // The task update and its audit row succeed or fail together.
  const updated = transaction(() => {
    execute(
      'UPDATE tasks SET status = ?, priority = ?, title = ?, updated_at = ? WHERE id = ?',
      [next.status, next.priority, next.title, new Date().toISOString(), task.id]
    );
    logActivity(workspaceId, task.id, req.user.userId, 'UPDATED', changes);
    return query('SELECT * FROM tasks WHERE id = ?', [task.id])[0];
  });
  broadcast(req, 'task:updated', updated); // only after the commit went through
  res.json(updated);
}));

router.delete('/:taskId', requireAdmin, safe((req, res) => {
  transaction(() => {
    execute('DELETE FROM tasks WHERE id = ? AND workspace_id = ?', [req.params.taskId, req.params.id]);
    logActivity(req.params.id, req.params.taskId, req.user.userId, 'DELETED', '');
  });
  broadcast(req, 'task:deleted', { id: Number(req.params.taskId) });
  res.json({ ok: true });
}));

export default router;
