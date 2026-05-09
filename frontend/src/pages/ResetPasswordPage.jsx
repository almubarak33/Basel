import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import LanguageSwitcher from '../components/LanguageSwitcher';
import s from './AuthPage.module.css';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get('token') || '';

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== password2) { setError(t('auth.passwords_mismatch')); return; }
    if (password.length < 8) { setError(t('settings.password_too_short')); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password/', { token, new_password: password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail === 'Invalid or expired token.' ? t('auth.invalid_token') : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.langRow}><LanguageSwitcher /></div>
      <div className={s.logo}>SayHi</div>
      <p className={s.sub}>{t('auth.reset_password_sub')}</p>
      <div className={s.card}>
        <h2 className={s.title}>{t('auth.reset_password_title')}</h2>
        {done ? (
          <div className={s.success}>{t('auth.reset_success')}</div>
        ) : (
          <>
            {error && <div className={s.error}>{error}</div>}
            <form onSubmit={handleSubmit} className={s.form}>
              <input
                className={s.input}
                type="password"
                placeholder={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <input
                className={s.input}
                type="password"
                placeholder={t('auth.confirm_password')}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
              />
              <button className={s.btn} type="submit" disabled={loading || !token}>
                {loading ? t('auth.resetting') : t('auth.reset_btn')}
              </button>
            </form>
          </>
        )}
        <Link to="/login" className={s.link}>{t('auth.back_to_login')}</Link>
      </div>
    </div>
  );
}
