import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import s from './ChooseUsernamePage.module.css';

export default function ChooseUsernamePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState(null); // null | 'checking' | 'available' | 'taken' | 'invalid'
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const checkAvailability = useCallback(async (val) => {
    setStatus('checking');
    try {
      const { data } = await api.get(`/auth/check-username/?username=${encodeURIComponent(val)}`);
      setStatus(data.available ? 'available' : 'taken');
      setError(data.error || '');
    } catch {
      setStatus(null);
    }
  }, []);

  // Debounce the availability check
  useEffect(() => {
    if (!username) { setStatus(null); setError(''); return; }
    if (username.length < 3) {
      setStatus('invalid');
      setError('اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل.');
      return;
    }
    setError('');
    const t = setTimeout(() => checkAvailability(username), 500);
    return () => clearTimeout(t);
  }, [username, checkAvailability]);

  const handleChange = (e) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9_.]/g, '');
    setUsername(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status !== 'available' || saving) return;
    setSaving(true);
    try {
      const { data } = await api.post('/auth/set-username/', { username });
      updateUser(data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ. حاول مجدداً.');
    } finally {
      setSaving(false);
    }
  };

  const statusIcon = {
    checking: <span className={s.iconChecking}>⟳</span>,
    available: <span className={s.iconOk}>✓</span>,
    taken: <span className={s.iconNo}>✗</span>,
    invalid: <span className={s.iconNo}>✗</span>,
  };

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.logo}>SayHi</div>
        <h1 className={s.title}>اختر اسم مستخدمك</h1>
        <p className={s.sub}>يمكن للآخرين العثور عليك بهذا الاسم</p>

        <form onSubmit={handleSubmit} className={s.form}>
          <div className={s.inputWrap}>
            <span className={s.at}>@</span>
            <input
              className={`${s.input} ${status === 'available' ? s.inputOk : status === 'taken' ? s.inputNo : ''}`}
              placeholder="your_username"
              value={username}
              onChange={handleChange}
              maxLength={30}
              autoComplete="off"
              autoFocus
              dir="ltr"
            />
            <span className={s.statusIcon}>{statusIcon[status]}</span>
          </div>

          {error && <p className={s.error}>{error}</p>}

          {status === 'available' && (
            <p className={s.hint}>✅ @{username} متاح!</p>
          )}

          <p className={s.rules}>أحرف إنجليزية، أرقام، _ ، . — 3 إلى 30 حرفاً</p>

          <button
            className={s.btn}
            type="submit"
            disabled={status !== 'available' || saving}
          >
            {saving ? 'جاري الحفظ…' : 'تأكيد الاسم'}
          </button>

          <button type="button" className={s.skip} onClick={() => navigate('/')}>
            تخطي الآن — اختر لاحقاً
          </button>
        </form>

        {/* Suggestions */}
        {user && (
          <div className={s.suggestions}>
            <p className={s.sugLabel}>اقتراحات:</p>
            <div className={s.sugList}>
              {[
                user.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_.]/g, ''),
                `${user.email?.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, '')}_${Math.floor(Math.random() * 99)}`,
                `sayhi_${Math.floor(Math.random() * 9999)}`,
              ].filter(Boolean).map((s_) => (
                <button key={s_} className={s.sugBtn} onClick={() => setUsername(s_)} dir="ltr">
                  @{s_}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
