import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../api/axios';
import s from './BottomNav.module.css';

const HomeIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" width="23" height="23">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" strokeLinejoin="round"/>
    {active && <rect x="9" y="14" width="6" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.9"/>}
  </svg>
);

const CompassIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" width="23" height="23">
    <circle cx="12" cy="12" r="9"/>
    <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" fill={active ? 'var(--pink)' : 'none'} stroke={active ? 'var(--pink)' : 'currentColor'} strokeWidth="1.6"/>
  </svg>
);

const InboxIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" width="23" height="23">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname: p } = useLocation();
  const { user } = useAuth();
  const { unread: notifUnread, clearUnread } = useNotifications();
  const [msgBadge, setMsgBadge] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchMsg = async () => {
      try {
        const { data } = await api.get('/messages/unread/');
        setMsgBadge(data.unread || 0);
      } catch {}
    };
    fetchMsg();
    const id = setInterval(fetchMsg, 30000);
    return () => clearInterval(id);
  }, [user]);

  const totalInbox = msgBadge + notifUnread;
  const avatarUrl = user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'U')}&background=ff3366&color=fff&size=40`;

  const isHome    = p === '/';
  const isSearch  = p === '/search';
  const isInbox   = p === '/inbox';
  const isProfile = p.startsWith('/profile') || p === '/me';

  return (
    <nav className={s.nav}>
      <button className={`${s.btn} ${isHome ? s.active : ''}`} onClick={() => navigate('/')}>
        <HomeIcon active={isHome} />
      </button>

      <button className={`${s.btn} ${isSearch ? s.active : ''}`} onClick={() => navigate('/search')}>
        <CompassIcon active={isSearch} />
      </button>

      <button className={s.createBtn} onClick={() => navigate('/camera')}>
        <span className={s.createInner}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="20" height="20">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </span>
      </button>

      <button
        className={`${s.btn} ${isInbox ? s.active : ''}`}
        onClick={() => { navigate('/inbox'); clearUnread(); }}
      >
        {totalInbox > 0 && (
          <span className={s.badge}>{totalInbox > 99 ? '99+' : totalInbox}</span>
        )}
        <InboxIcon active={isInbox} />
      </button>

      <button
        className={`${s.btn} ${isProfile ? s.active : ''}`}
        onClick={() => navigate(user ? `/profile/${user.username}` : '/login')}
      >
        <img
          src={avatarUrl}
          alt=""
          className={`${s.avatar} ${isProfile ? s.avatarActive : ''}`}
        />
      </button>
    </nav>
  );
}
