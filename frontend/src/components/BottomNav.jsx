import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../api/axios';
import s from './BottomNav.module.css';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { unread: notifUnread, clearUnread } = useNotifications();
  const p = location.pathname;

  const [msgBadge, setMsgBadge] = useState(0);
  const [friendsBadge, setFriendsBadge] = useState(0);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const [m, f] = await Promise.all([
          api.get('/messages/unread/'),
          api.get('/users/friend-requests/'),
        ]);
        setMsgBadge(m.data.unread || 0);
        setFriendsBadge(Array.isArray(f.data) ? f.data.length : 0);
      } catch {}
    };
    fetchBadges();
    const id = setInterval(fetchBadges, 30000);
    return () => clearInterval(id);
  }, []);

  const avatarUrl = user?.avatar ||
    `https://ui-avatars.com/api/?name=${user?.username}&background=fe2c55&color=fff&size=40`;

  const Badge = ({ count }) =>
    count > 0 ? <span className={s.badge}>{count > 99 ? '99+' : count}</span> : null;

  return (
    <nav className={s.nav}>
      <button className={`${s.btn} ${p === '/' ? s.active : ''}`} onClick={() => navigate('/')}>
        <svg viewBox="0 0 24 24" fill={p === '/' ? 'white' : 'none'} stroke="currentColor" strokeWidth="2" width="24" height="24">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
        <span>{t('nav.home')}</span>
      </button>

      <button className={`${s.btn} ${p === '/friends' ? s.active : ''}`} onClick={() => navigate('/friends')}>
        <Badge count={friendsBadge} />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span>{t('nav.friends')}</span>
      </button>

      <button className={s.uploadBtn} onClick={() => navigate('/camera')}>
        <span className={s.plusIcon}>+</span>
      </button>

      <button className={`${s.btn} ${p === '/inbox' ? s.active : ''}`} onClick={() => { navigate('/inbox'); clearUnread(); }}>
        <Badge count={msgBadge + notifUnread} />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>{t('nav.inbox')}</span>
      </button>

      <button className={`${s.btn} ${p.startsWith('/profile') || p === '/me' ? s.active : ''}`} onClick={() => navigate(`/profile/${user?.username}`)}>
        <img src={avatarUrl} alt="" className={s.avatar} />
        <span>{t('nav.profile')}</span>
      </button>
    </nav>
  );
}
