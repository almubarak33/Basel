import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    setLoading(true);
    setError('');
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.logo}>SayHi</div>
      <p className={s.sub}>تواصل مع العالم عبر مقاطع قصيرة وبث مباشر</p>
      <div className={s.card}>
        <h2 className={s.title}>تسجيل الدخول</h2>
        {error && <div className={s.error}>{error}</div>}
        <form onSubmit={handleSubmit} className={s.form}>
          <input
            className={s.input}
            placeholder="اسم المستخدم"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
            dir="ltr"
          />
          <input
            className={s.input}
            type="password"
            placeholder="كلمة المرور"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button className={s.btn} type="submit" disabled={loading}>
            {loading ? 'جاري الدخول…' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
