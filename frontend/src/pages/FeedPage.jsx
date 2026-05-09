import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import MomentsBar from '../components/MomentsBar';
import VideoCard from '../components/VideoCard';
import s from './FeedPage.module.css';

const ENDPOINT = {
  foryou:    '/videos/foryou/',
  following: '/videos/following/',
  creators:  '/videos/creators/',
  live:      '/live/',
};

const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : (n ?? 0);

export default function FeedPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState('foryou');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const TABS = [
    { key: 'foryou',    label: t('feed.for_you') },
    ...(user ? [{ key: 'following', label: t('feed.following') }] : []),
    { key: 'creators',  label: t('feed.creators') },
    { key: 'live',      label: t('feed.live') },
  ];

  const fetchTab = useCallback(async (key) => {
    setLoading(true);
    setData([]);
    try {
      const { data: res } = await api.get(ENDPOINT[key]);
      setData(res.results || res);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTab(tab); }, [tab, fetchTab]);

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.header}>
        <span className={s.logo}>
          <span className={s.logoPink}>Say</span><span className={s.logoWhite}>Hi</span>
        </span>
        <div className={s.headerActions}>
          <button className={s.iconBtn} onClick={() => navigate('/search')} aria-label="Search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="21" height="21">
              <circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="15.5" y2="15.5"/>
            </svg>
          </button>
          <button className={s.iconBtn} onClick={() => navigate('/inbox')} aria-label="Inbox">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="21" height="21">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className={s.body}>
        <MomentsBar />

        {/* Tabs */}
        <div className={s.tabs}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              className={`${s.tab} ${tab === key ? s.activeTab : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className={s.loading}><div className={s.spinner} /></div>
        ) : tab === 'creators' ? (
          <CreatorsSection creators={data} navigate={navigate} />
        ) : tab === 'live' ? (
          <LiveSection streams={data} navigate={navigate} t={t} />
        ) : data.length === 0 ? (
          <p className={s.empty}>
            {tab === 'following' ? t('feed.empty_following') : t('feed.empty')}
          </p>
        ) : (
          <div className={s.grid}>
            {data.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
        )}

        {!user && (
          <div className={s.guestBanner}>
            <p className={s.guestText}>{t('feed.guest_cta')}</p>
            <button className={s.guestBtn} onClick={() => navigate('/register')}>
              {t('feed.join_now')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreatorsSection({ creators, navigate }) {
  if (!creators.length) return <p style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '.9rem' }}>No creators yet.</p>;
  return (
    <div className={s.creatorsList}>
      {creators.map((u, i) => {
        const avatar = u.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || 'U')}&background=ff3366&color=fff&size=80`;
        return (
          <button key={u.id || i} className={s.creatorRow} onClick={() => navigate(`/profile/${u.username}`)}>
            <span className={s.rank}>#{i + 1}</span>
            <img src={avatar} alt="" className={s.creatorAvatar} />
            <div className={s.creatorMeta}>
              <span className={s.creatorName}>{u.display_name || u.username}</span>
              <span className={s.creatorHandle}>@{u.username}</span>
            </div>
            <span className={s.creatorFollowers}>{fmt(u.followers_count || 0)} followers</span>
          </button>
        );
      })}
    </div>
  );
}

function LiveSection({ streams, navigate, t }) {
  if (!streams.length) return <p style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '.9rem' }}>{t('inbox.no_streams')}</p>;
  return (
    <div className={s.liveList}>
      {streams.map((stream) => {
        const avatar = stream.host?.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(stream.host?.username || 'L')}&background=ff3366&color=fff&size=60`;
        return (
          <button key={stream.id} className={s.liveRow} onClick={() => navigate(`/live/${stream.id}`)}>
            <div className={s.liveAvatarWrap}>
              <img src={avatar} alt="" className={s.liveAvatar} />
              <span className={s.livePill}>LIVE</span>
            </div>
            <div className={s.liveMeta}>
              <span className={s.liveName}>@{stream.host?.username}</span>
              <span className={s.liveTitle}>{stream.title}</span>
              <span className={s.liveViewers}>👁 {stream.viewers_count} {t('inbox.watching')}</span>
            </div>
            <span className={s.liveChevron}>›</span>
          </button>
        );
      })}
    </div>
  );
}
