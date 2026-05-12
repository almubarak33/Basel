import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import s from './AuthPage.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '', password2: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password2) { setError(t('auth.passwords_mismatch')); return; }
    setLoading(true); setError('');
    try {
      await register(form.email, form.password, form.password2);
      navigate('/choose-username');
    } catch (err) {
      const d = err.response?.data;
      setError(d ? Object.values(d).flat().join(' ') : t('auth.register_failed'));
    } finally { setLoading(false); }
  };

  return (
    <div className={s.page}>
      <div className={s.langRow}><LanguageSwitcher /></div>
      <div className={s.logo}>SayHi</div>
      <p className={s.sub}>{t('auth.register_sub')}</p>
      <div className={s.card}>
        <h2 className={s.title}>{t('auth.register_title')}</h2>
        {error && <div className={s.error}>{error}</div>}
        <form onSubmit={handleSubmit} className={s.form}>
          <input
            className={s.input}
            type="email"
            placeholder={t('auth.email')}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            dir="ltr"
          />
          <input
            className={s.input}
            type="password"
            placeholder={t('auth.password_min')}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
          />
          <input
            className={s.input}
            type="password"
            placeholder={t('auth.confirm_password')}
            value={form.password2}
            onChange={(e) => setForm({ ...form, password2: e.target.value })}
            required
          />
          <button className={s.btn} type="submit" disabled={loading}>
            {loading ? t('auth.creating') : t('auth.register_btn')}
          </button>
        </form>
        <p className={s.switch}>{t('auth.have_account')} <Link to="/login">{t('auth.login_link')}</Link></p>
      </div>
    </div>
  );
}
