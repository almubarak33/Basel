import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import s from './AuthPage.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', password2: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password2) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try { await register(form.username, form.email, form.password, form.password2); navigate('/'); }
    catch (err) {
      const d = err.response?.data;
      setError(d ? Object.values(d).flat().join(' ') : 'Registration failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className={s.page}>
      <div className={s.logo}>SayHi</div>
      <p className={s.sub}>Create an account to start sharing</p>
      <div className={s.card}>
        <h2 className={s.title}>Sign up</h2>
        {error && <div className={s.error}>{error}</div>}
        <form onSubmit={handleSubmit} className={s.form}>
          <input className={s.input} placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          <input className={s.input} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className={s.input} type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <input className={s.input} type="password" placeholder="Confirm Password" value={form.password2} onChange={(e) => setForm({ ...form, password2: e.target.value })} required />
          <button className={s.btn} type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
        </form>
        <p className={s.switch}>Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  );
}
