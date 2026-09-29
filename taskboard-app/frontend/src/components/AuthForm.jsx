import { useState } from 'react';
import { api } from '../api.js';

export default function AuthForm({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  async function handleSubmit() {
    try {
      const data = await api(`/api/auth/${mode}`, { method: 'POST', body: form });
      localStorage.setItem('token', data.token);
      onAuth();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth">
      <h2>{mode === 'login' ? 'Log in' : 'Create account'}</h2>
      <input
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      <button onClick={handleSubmit}>{mode === 'login' ? 'Log in' : 'Sign up'}</button>
      <button className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account?' : 'Already have an account?'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
