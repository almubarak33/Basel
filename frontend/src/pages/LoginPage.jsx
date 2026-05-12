import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import s from './AuthPage.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      setError(t('auth.wrong_credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.langRow}><LanguageSwitcher /></div>
      <div className={s.logo}>SayHi</div>
      <p className={s.sub}>{t('auth.slogan')}</p>
      <div className={s.card}>
        <h2 className={s.title}>{t('auth.login_title')}</h2>
        {error && <div className={s.error}>{error}</div>}
        <form onSubmit={handleSubmit} className={s.form}>
          <input
            className={s.input}
            placeholder={t('auth.username')}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
            dir="ltr"
          />
          <input
            className={s.input}
            type="password"
            placeholder={t('auth.password')}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button className={s.btn} type="submit" disabled={loading}>
            {loading ? t('auth.logging_in') : t('auth.login_btn')}
          </button>
        </form>
        <Link to="/forgot-password" className={s.link}>{t('auth.forgot_password')}</Link>
        <p className={s.switch}>{t('auth.no_account')} <Link to="/register">{t('auth.register_link')}</Link></p>
      </div>
    </div>
  );
}
