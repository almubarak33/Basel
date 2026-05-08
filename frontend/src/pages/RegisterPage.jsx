import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import s from './AuthPage.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', password2: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password2) { setError('كلمتا المرور غير متطابقتين.'); return; }
    setLoading(true); setError('');
    try {
      await register(form.email, form.password, form.password2);
      navigate('/choose-username');
    } catch (err) {
      const d = err.response?.data;
      setError(d ? Object.values(d).flat().join(' ') : 'فشل إنشاء الحساب.');
    } finally { setLoading(false); }
  };

  return (
    <div className={s.page}>
      <div className={s.logo}>SayHi</div>
      <p className={s.sub}>انضم وابدأ المشاركة</p>
      <div className={s.card}>
        <h2 className={s.title}>إنشاء حساب</h2>
        {error && <div className={s.error}>{error}</div>}
        <form onSubmit={handleSubmit} className={s.form}>
          <input
            className={s.input}
            type="email"
            placeholder="الإيميل"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className={s.input}
            type="password"
            placeholder="كلمة المرور (8 أحرف على الأقل)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
          />
          <input
            className={s.input}
            type="password"
            placeholder="تأكيد كلمة المرور"
            value={form.password2}
            onChange={(e) => setForm({ ...form, password2: e.target.value })}
            required
          />
          <button className={s.btn} type="submit" disabled={loading}>
            {loading ? 'جاري الإنشاء…' : 'إنشاء حساب'}
          </button>
        </form>
        <p className={s.switch}>لديك حساب؟ <Link to="/login">تسجيل الدخول</Link></p>
      </div>
    </div>
  );
}
