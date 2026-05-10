import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../api/axios';
import s from './BottomNav.module.css';

/* ── Icons ── */
const HomeIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" width="22" height="22">
    <path d="M3 10L12 3l9 7v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/>
    <rect x="9" y="14" width="6" height="7" rx=".5"
      fill={active ? 'var(--bg)' : 'none'} stroke="currentColor" strokeWidth="1.9"/>
  </svg>
);

const CompassIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="22" height="22">
    <circle cx="12" cy="12" r="9"/>
    <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"
      fill={active ? 'var(--accent)' : 'none'}
      stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth="1.6"/>
  </svg>
);

const InboxIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="1.9" width="22" height="22">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const ProfileIcon = ({ avatarUrl, active }) => (
  <img src={avatarUrl} alt="" className={`${s.avatar} ${active ? s.avatarActive : ''}`} />
);

/* ── Component ── */
export default function BottomNav() {
  const navigate              = useNavigate();
  const { pathname: p }       = useLocation();
  const { user }              = useAuth();
  const { unread, clearUnread } = useNotifications();
  const [msgBadge, setMsgBadge] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try { setMsgBadge((await api.get('/messages/unread/')).data.unread || 0); } catch {}
    };
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, [user]);

  const totalInbox = msgBadge + unread;
  const avatarUrl  = user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'U')}&background=FF005C&color=fff&size=40`;

  const isHome    = p === '/';
  const isDiscover = p === '/search';
  const isInbox   = p === '/inbox';
  const isProfile = p.startsWith('/profile') || p === '/me';

  return (
    <nav className={s.nav}>
      {/* Home */}
      <button className={`${s.btn} ${isHome ? s.active : ''}`} onClick={() => navigate('/')}>
        <HomeIcon active={isHome} />
        <span className={s.label}>Home</span>
      </button>

      {/* Discover */}
      <button className={`${s.btn} ${isDiscover ? s.active : ''}`} onClick={() => navigate('/search')}>
        <CompassIcon active={isDiscover} />
        <span className={s.label}>Discover</span>
      </button>

      {/* Create — center hero button */}
      <button className={s.createBtn} onClick={() => navigate('/camera')}>
        <span className={s.createInner}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" width="22" height="22">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5"  y1="12" x2="19" y2="12"/>
          </svg>
        </span>
        <span className={s.label} style={{ color: 'var(--text-muted)' }}>Create</span>
      </button>

      {/* Inbox */}
      <button
        className={`${s.btn} ${isInbox ? s.active : ''}`}
        onClick={() => { navigate('/inbox'); clearUnread(); }}
      >
        <span className={s.iconWrap}>
          {totalInbox > 0 && (
            <span className={s.badge}>{totalInbox > 99 ? '99+' : totalInbox}</span>
          )}
          <InboxIcon active={isInbox} />
        </span>
        <span className={s.label}>Inbox</span>
      </button>

      {/* Profile */}
      <button
        className={`${s.btn} ${isProfile ? s.active : ''}`}
        onClick={() => navigate(user ? `/profile/${user.username}` : '/login')}
      >
        <ProfileIcon avatarUrl={avatarUrl} active={isProfile} />
        <span className={s.label}>Profile</span>
      </button>
    </nav>
  );
}
