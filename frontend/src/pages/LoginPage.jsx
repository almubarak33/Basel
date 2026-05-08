import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import s from './AuthPage.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await login(form.username, form.password); navigate('/'); }
    catch { setError('Wrong username or password.'); }
    finally { setLoading(false); }
  };

  return (
    <div className={s.page}>
      <div className={s.logo}>SayHi</div>
      <p className={s.sub}>Join the world's fastest-growing video community</p>
      <div className={s.card}>
        <h2 className={s.title}>Log in</h2>
        {error && <div className={s.error}>{error}</div>}
        <form onSubmit={handleSubmit} className={s.form}>
          <input className={s.input} placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          <input className={s.input} type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <button className={s.btn} type="submit" disabled={loading}>{loading ? 'Loading…' : 'Log in'}</button>
        </form>
        <p className={s.switch}>Don't have an account? <Link to="/register">Sign up</Link></p>
      </div>
    </div>
  );
}
