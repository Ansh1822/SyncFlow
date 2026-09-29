import http from 'http';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { query } from './db.js';
import { JWT_SECRET } from './middleware.js';
import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspaces.js';

const PORT = process.env.PORT || 4000;
const ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',');

const app = express();
app.use(cors({ origin: ORIGINS }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ORIGINS } });
app.set('io', io);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);

io.use((socket, next) => {
  try {
    socket.user = jwt.verify(socket.handshake.auth.token, JWT_SECRET);
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.on('join', (workspaceId) => {
    const isMember = query(
      'SELECT 1 FROM members WHERE workspace_id = ? AND user_id = ?',
      [workspaceId, socket.user.userId]
    ).length > 0;
    if (!isMember) return;
    socket.rooms.forEach((room) => room.startsWith('ws:') && socket.leave(room));
    socket.join(`ws:${workspaceId}`);
  });
});

server.listen(PORT, () => console.log(`API listening on ${PORT}`));
