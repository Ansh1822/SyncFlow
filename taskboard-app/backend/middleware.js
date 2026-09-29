import jwt from 'jsonwebtoken';
import { query } from './db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

export function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireMember(req, res, next) {
  const rows = query(
    'SELECT role FROM members WHERE workspace_id = ? AND user_id = ?',
    [req.params.id, req.user.userId]
  );
  if (rows.length === 0) return res.status(403).json({ error: 'Not a member of this workspace' });
  req.role = rows[0].role;
  next();
}

export function requireAdmin(req, res, next) {
  if (req.role !== 'ADMIN') return res.status(403).json({ error: 'Admins only' });
  next();
}

// Wraps a handler so a thrown DB error becomes a 500 instead of crashing the process.
export const safe = (handler) => (req, res) => {
  try {
    handler(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};
