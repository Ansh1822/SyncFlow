# TaskBoard Frontend

React (Vite) client for TaskBoard: Kanban board with live updates over Socket.io.

## Run locally
```bash
npm install
npm run dev        # http://localhost:5173
```
Set `VITE_API_URL` to the backend URL (see `.env.example`).

## Structure
- `src/App.jsx` - login state, workspace switcher
- `src/components/` - `AuthForm`, `Board`
- `src/api.js` - fetch wrapper that attaches the JWT
- `src/taskReducer.js` - task state

## Deploy (Vercel, Root Directory: frontend)
Import the repo, framework preset Vite, add `VITE_API_URL` pointing at the deployed backend.
