import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, execute, lastInsertId, transaction } from '../db.js';
import { signToken, safe } from '../middleware.js';

const router = Router();

router.post('/register', safe((req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Email and a password of 6+ characters are required' });
  }
  if (query('SELECT id FROM users WHERE email = ?', [email]).length) {
    return res.status(409).json({ error: 'That email is already registered' });
  }
  const id = transaction(() => {
    execute('INSERT INTO users (email, password) VALUES (?, ?)', [email, bcrypt.hashSync(password, 10)]);
    return lastInsertId();
  });
  res.json({ token: signToken({ id, email }), user: { id, email } });
}));

router.post('/login', safe((req, res) => {
  const user = query('SELECT * FROM users WHERE email = ?', [req.body.email])[0];
  if (!user || !bcrypt.compareSync(req.body.password || '', user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: signToken(user), user: { id: user.id, email: user.email } });
}));

export default router;
