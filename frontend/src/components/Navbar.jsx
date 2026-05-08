import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=1DA1F2&color=fff&size=40`;

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>SayHi</Link>
        <div className={styles.links}>
          <Link to="/" className={`${styles.link} ${location.pathname === '/' ? styles.active : ''}`}>
            <span>Home</span>
          </Link>
          <Link to="/explore" className={`${styles.link} ${location.pathname === '/explore' ? styles.active : ''}`}>
            <span>Explore</span>
          </Link>
          {user && (
            <Link to={`/profile/${user.username}`} className={`${styles.link} ${location.pathname.startsWith('/profile') ? styles.active : ''}`}>
              <img src={avatarUrl} alt={user.username} className={styles.avatar} />
              <span>{user.username}</span>
            </Link>
          )}
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
