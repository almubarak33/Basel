import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import s from './LoginModal.module.css';

/**
 * Call this from anywhere to trigger the login prompt without a hard redirect.
 * Components that need auth should call `promptLogin()` instead of navigate('/login').
 */
export function promptLogin() {
  window.dispatchEvent(new CustomEvent('app:prompt-login'));
}

export default function LoginModal({ onClose }) {
  const navigate = useNavigate();

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const go = (path) => { onClose(); navigate(path); };

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.sheet} onClick={(e) => e.stopPropagation()}>
        {/* Drag handle */}
        <div className={s.handle} />

        {/* Brand */}
        <p className={s.logo}>
          <span className={s.logoPink}>Say</span><span className={s.logoWhite}>Hi</span>
        </p>

        <h2 className={s.title}>Join the conversation</h2>
        <p className={s.sub}>
          Log in to like, comment, follow creators, and say hi to people you love.
        </p>

        <div className={s.actions}>
          <button className={s.primaryBtn} onClick={() => go('/login')}>
            Log In
          </button>
          <button className={s.secondaryBtn} onClick={() => go('/register')}>
            Create Account — it's free
          </button>
        </div>

        <button className={s.dismissBtn} onClick={onClose}>
          Continue browsing
        </button>
      </div>
    </div>
  );
}
