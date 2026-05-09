import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import LanguageSwitcher from '../components/LanguageSwitcher';
import s from './AuthPage.module.css';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password/', { email });
      setSent(true);
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.langRow}><LanguageSwitcher /></div>
      <div className={s.logo}>SayHi</div>
      <p className={s.sub}>{t('auth.forgot_password_sub')}</p>
      <div className={s.card}>
        <h2 className={s.title}>{t('auth.forgot_password_title')}</h2>
        {sent ? (
          <div className={s.success}>{t('auth.reset_link_sent')}</div>
        ) : (
          <>
            {error && <div className={s.error}>{error}</div>}
            <form onSubmit={handleSubmit} className={s.form}>
              <input
                className={s.input}
                type="email"
                placeholder={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
              />
              <button className={s.btn} type="submit" disabled={loading}>
                {loading ? t('auth.sending') : t('auth.send_reset_link')}
              </button>
            </form>
          </>
        )}
        <Link to="/login" className={s.link}>{t('auth.back_to_login')}</Link>
      </div>
    </div>
  );
}
