# TaskBoard

A Kanban board where teams share workspaces and see each other's changes live.

**Stack:** React (Vite), Express, Socket.io, sql.js, JWT auth

## Project layout
```
taskboard/
├── backend/    Express + Socket.io API (see backend/README.md)
├── frontend/   React client (see frontend/README.md)
└── README.md
```

## Run locally
Use two terminals:
```bash
cd backend && npm install && npm start       # http://localhost:4000
cd frontend && npm install && npm run dev    # http://localhost:5173
```

## Deploy
- Backend on Render: Root Directory `backend`, build `npm install`, start `npm start`. Set `JWT_SECRET` and `CLIENT_ORIGIN` (frontend URL, no trailing slash).
- Frontend on Vercel: Root Directory `frontend`, preset Vite. Set `VITE_API_URL` to the backend URL.
