import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import s from './MomentsBar.module.css';

export default function MomentsBar() {
  const [moments, setMoments] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/videos/moments/').then(({ data }) => {
      const items = data.results || data;
      const seen = new Set();
      const unique = items.filter((v) => {
        const key = v.author?.username || v.user?.username;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 14);
      setMoments(unique);
    }).catch(() => {});
  }, []);

  if (moments.length === 0 && !user) return null;

  return (
    <div className={s.bar}>
      <div className={s.scroll}>
        {user && (
          <button className={s.item} onClick={() => navigate('/camera')}>
            <div className={s.addWrap}>
              {user.avatar
                ? <img src={user.avatar} alt="" className={s.avatar} />
                : <div className={s.fallback}>{(user.username || 'U')[0].toUpperCase()}</div>
              }
              <span className={s.plusBadge}>+</span>
            </div>
            <span className={s.name}>You</span>
          </button>
        )}

        {moments.map((v) => {
          const username = v.author?.username || v.user?.username || '';
          const avatar = v.author?.avatar || v.user?.avatar;
          return (
            <button key={v.id} className={s.item} onClick={() => navigate(`/video/${v.id}`)}>
              <div className={s.ring}>
                <div className={s.inner}>
                  {avatar
                    ? <img src={avatar} alt="" className={s.avatar} />
                    : <div className={s.fallback}>{(username[0] || 'U').toUpperCase()}</div>
                  }
                </div>
              </div>
              <span className={s.name}>{username.length > 9 ? username.slice(0, 9) + '…' : username}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
