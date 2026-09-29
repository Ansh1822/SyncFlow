import { useEffect, useState } from 'react';
import { api } from './api.js';
import AuthForm from './components/AuthForm.jsx';
import Board from './components/Board.jsx';
import './styles.css';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(Boolean(localStorage.getItem('token')));
  const [workspaces, setWorkspaces] = useState([]);
  const [current, setCurrent] = useState(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!loggedIn) return;
    api('/api/workspaces').then((list) => {
      setWorkspaces(list);
      setCurrent((prev) => prev || list[0] || null);
    });
  }, [loggedIn]);

  async function createWorkspace() {
    if (!newName.trim()) return;
    const workspace = await api('/api/workspaces', { method: 'POST', body: { name: newName } });
    setWorkspaces([...workspaces, workspace]);
    setCurrent(workspace);
    setNewName('');
  }

  function logout() {
    localStorage.removeItem('token');
    setLoggedIn(false);
    setWorkspaces([]);
    setCurrent(null);
  }

  if (!loggedIn) return <AuthForm onAuth={() => setLoggedIn(true)} />;

  return (
    <div className="app">
      <header>
        <select
          value={current?.id || ''}
          onChange={(e) => setCurrent(workspaces.find((w) => w.id === Number(e.target.value)))}
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
          ))}
        </select>
        <input placeholder="New workspace" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button onClick={createWorkspace}>Create</button>
        <button onClick={logout}>Log out</button>
      </header>
      {current ? <Board key={current.id} workspace={current} /> : <p>Create a workspace to get started.</p>}
    </div>
  );
}
