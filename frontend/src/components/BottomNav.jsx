import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import s from './BottomNav.module.css';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const p = location.pathname;

  const avatarUrl = user?.avatar ||
    `https://ui-avatars.com/api/?name=${user?.username}&background=fe2c55&color=fff&size=40`;

  return (
    <nav className={s.nav}>
      <button className={`${s.btn} ${p === '/' ? s.active : ''}`} onClick={() => navigate('/')}>
        <svg viewBox="0 0 24 24" fill={p === '/' ? 'white' : 'none'} stroke="currentColor" strokeWidth="2" width="26" height="26">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
        <span>Home</span>
      </button>

      <button className={`${s.btn} ${p === '/search' ? s.active : ''}`} onClick={() => navigate('/search')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="26" height="26">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span>Discover</span>
      </button>

      <button className={s.uploadBtn} onClick={() => navigate('/upload')}>
        <span className={s.plusIcon}>+</span>
      </button>

      <button className={`${s.btn} ${p === '/inbox' ? s.active : ''}`} onClick={() => navigate('/inbox')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="26" height="26">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Inbox</span>
      </button>

      <button className={`${s.btn} ${p.startsWith('/profile') || p === '/me' ? s.active : ''}`} onClick={() => navigate(`/profile/${user?.username}`)}>
        <img src={avatarUrl} alt="" className={s.avatar} />
        <span>Profile</span>
      </button>
    </nav>
  );
}
