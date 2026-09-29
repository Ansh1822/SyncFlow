import { useCallback, useEffect, useReducer, useState } from 'react';
import { io } from 'socket.io-client';
import { api, API_URL } from '../api.js';
import { taskReducer } from '../taskReducer.js';

const COLUMNS = [
  { key: 'TODO', label: 'To Do' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'DONE', label: 'Done' },
];

export default function Board({ workspace }) {
  const [tasks, dispatch] = useReducer(taskReducer, []);
  const [filters, setFilters] = useState({ priority: '', search: '' });
  const [newTitle, setNewTitle] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [activity, setActivity] = useState([]);
  const [message, setMessage] = useState('');

  const isAdmin = workspace.role === 'ADMIN';
  const base = `/api/workspaces/${workspace.id}`;

  const loadActivity = useCallback(() => api(`${base}/activity`).then(setActivity), [base]);

  const loadTasks = useCallback(async () => {
    const params = new URLSearchParams({ limit: 100 });
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.search) params.set('search', filters.search);
    dispatch({ type: 'set', tasks: await api(`${base}/tasks?${params}`) });
    loadActivity();
  }, [base, filters, loadActivity]);

  useEffect(() => {
    loadTasks().catch((err) => setMessage(err.message));
  }, [loadTasks]);

  // live updates from teammates
  useEffect(() => {
    const socket = io(API_URL, { auth: { token: localStorage.getItem('token') } });
    socket.on('connect', () => socket.emit('join', workspace.id));
    socket.on('task:created', (task) => { dispatch({ type: 'upsert', task }); loadActivity(); });
    socket.on('task:updated', (task) => { dispatch({ type: 'upsert', task }); loadActivity(); });
    socket.on('task:deleted', ({ id }) => dispatch({ type: 'remove', id }));
    return () => socket.disconnect();
  }, [workspace.id, loadActivity]);

  async function moveTask(id, status) {
    const original = tasks.find((t) => t.id === id);
    if (!original || original.status === status) return;

    dispatch({ type: 'upsert', task: { ...original, status } }); // move it right away
    try {
      const saved = await api(`${base}/tasks/${id}`, { method: 'PATCH', body: { status } });
      dispatch({ type: 'upsert', task: saved });
    } catch (err) {
      dispatch({ type: 'upsert', task: original }); // put it back if the server said no
      setMessage(err.message);
    }
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    try {
      const task = await api(`${base}/tasks`, { method: 'POST', body: { title: newTitle } });
      dispatch({ type: 'upsert', task });
      setNewTitle('');
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function deleteTask(id) {
    try {
      await api(`${base}/tasks/${id}`, { method: 'DELETE' });
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function invite() {
    try {
      await api(`${base}/invite`, { method: 'POST', body: { email: inviteEmail } });
      setInviteEmail('');
      setMessage('Invite sent');
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <>
      <div className="toolbar">
        <input
          placeholder="Search tasks"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
        >
          <option value="">Any priority</option>
          <option>LOW</option>
          <option>MEDIUM</option>
          <option>HIGH</option>
        </select>
        <input
          placeholder="New task"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
        />
        <button onClick={addTask}>Add</button>

        {isAdmin && (
          <>
            <input
              placeholder="Teammate's email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <button onClick={invite}>Invite Team Member</button>
          </>
        )}
      </div>

      {message && <p className="error">{message}</p>}

      <div className="board">
        {COLUMNS.map(({ key, label }) => (
          <div
            key={key}
            className="column"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => moveTask(Number(e.dataTransfer.getData('id')), key)}
          >
            <h3>{label}</h3>
            {tasks.filter((t) => t.status === key).map((task) => (
              <div
                key={task.id}
                className="card"
                draggable
                onDragStart={(e) => e.dataTransfer.setData('id', task.id)}
              >
                <strong>{task.title}</strong>
                <small>{task.priority}</small>
                {isAdmin && <button onClick={() => deleteTask(task.id)}>Delete</button>}
              </div>
            ))}
          </div>
        ))}
      </div>

      <h4>Recent activity</h4>
      <ul className="activity">
        {activity.map((entry) => (
          <li key={entry.id}>{entry.email} — {entry.action.toLowerCase()} {entry.detail}</li>
        ))}
      </ul>
    </>
  );
}
