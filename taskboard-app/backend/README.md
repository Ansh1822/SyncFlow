# TaskBoard Backend

REST API + WebSocket server for TaskBoard. Express, Socket.io, sql.js, JWT auth.

## Run locally
```bash
npm install
npm start          # http://localhost:4000
```
Environment variables (see `.env.example`): `JWT_SECRET`, `CLIENT_ORIGIN`, `PORT`, `DB_FILE`.

## Structure
- `index.js` - server setup, CORS, socket auth
- `db.js` - sql.js database, schema, transaction helper
- `middleware.js` - JWT, membership and admin checks
- `routes/` - auth, workspaces, tasks

## Endpoints
- `POST /api/auth/register`, `POST /api/auth/login`
- `GET/POST /api/workspaces`, `POST /api/workspaces/:id/invite`, `GET /api/workspaces/:id/activity`
- `GET/POST /api/workspaces/:id/tasks`, `PATCH/DELETE /api/workspaces/:id/tasks/:taskId`

## Deploy (Render, Root Directory: backend)
Web Service, build `npm install`, start `npm start`. Set `JWT_SECRET` and `CLIENT_ORIGIN` (your frontend URL, no trailing slash).
The sql.js file is wiped on redeploy on Render's free tier.
