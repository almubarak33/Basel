import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import FeedCard from '../components/FeedCard';
import VideoCard from '../components/VideoCard';
import MomentsBar from '../components/MomentsBar';
import s from './FeedPage.module.css';

/* Tab keys → API endpoints */
const ENDPOINT = {
  foryou:   '/videos/foryou/',
  discover: '/videos/explore/',
  live:     '/live/',
  creators: '/videos/creators/',
  moments:  '/videos/moments/',
};

const fmt = (n) => n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : (n ?? 0);

export default function FeedPage() {
  const navigate = useNavigate();
  const { t }    = useTranslation();
  const { user } = useAuth();

  const [tab,     setTab]     = useState('foryou');
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  const TABS = [
    { key: 'foryou',   label: t('feed.for_you') },
    { key: 'discover', label: t('feed.discover') },
    { key: 'live',     label: t('feed.live') },
    { key: 'creators', label: t('feed.creators') },
    { key: 'moments',  label: t('feed.moments') },
  ];

  const load = useCallback((key) => {
    setLoading(true);
    setData([]);
    api.get(ENDPOINT[key])
      .then(({ data: res }) => setData(res.results || res))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  const switchTab = (key) => {
    if (key !== tab) setTab(key);
  };

  return (
    <div className={s.page}>
      {/* ── Header ── */}
      <header className={s.header}>
        <button className={s.iconBtn} onClick={() => navigate('/search')} aria-label="Search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" width="22" height="22">
            <circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="15.5" y2="15.5"/>
          </svg>
        </button>

        <span className={s.logo}>
          <span className={s.logoPink}>Say</span><span className={s.logoWhite}>Hi</span>
        </span>

        <button
          className={s.iconBtn}
          onClick={() => navigate(user ? '/inbox' : '/login')}
          aria-label="Notifications"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="" className={s.navAvatar} />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" width="22" height="22">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          )}
        </button>
      </header>

      {/* ── Tabs ── */}
      <div className={s.tabsWrap}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`${s.tab} ${tab === key ? s.tabActive : ''}`}
            onClick={() => switchTab(key)}
          >
            {label}
            {tab === key && <span className={s.tabUnderline} />}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className={s.body}>
        {loading ? (
          <Spinner />
        ) : (
          <>
            {tab === 'foryou'   && <ForYouSection   data={data} user={user} navigate={navigate} t={t} />}
            {tab === 'discover' && <DiscoverSection data={data} />}
            {tab === 'live'     && <LiveSection     data={data} navigate={navigate} t={t} />}
            {tab === 'creators' && <CreatorsSection data={data} navigate={navigate} />}
            {tab === 'moments'  && <MomentsSection  data={data} navigate={navigate} />}
          </>
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

/* ── Sections ─────────────────────────────────────────────── */

function ForYouSection({ data, user, navigate, t }) {
  return (
    <>
      <MomentsBar />
      {data.length === 0
        ? <Empty text={t('feed.empty')} />
        : data.map((v) => <FeedCard key={v.id} video={v} />)
      }
    </>
  );
}

function DiscoverSection({ data }) {
  if (!data.length) return <Empty text="Nothing to discover yet." />;
  return (
    <div className={s.discoverGrid}>
      {data.map((v) => <VideoCard key={v.id} video={v} />)}
    </div>
  );
}

function LiveSection({ data, navigate, t }) {
  if (!data.length) return <Empty text={t('inbox.no_streams')} />;
  return (
    <div className={s.liveList}>
      {data.map((stream) => {
        const avatar = stream.host?.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(stream.host?.username || 'L')}&background=FF005C&color=fff&size=60`;
        return (
          <button key={stream.id} className={s.liveCard} onClick={() => navigate(`/live/${stream.id}`)}>
            <div className={s.liveThumb}>
              <img src={avatar} alt="" className={s.liveAvatar} />
              <span className={s.liveBadge}>● LIVE</span>
            </div>
            <div className={s.liveMeta}>
              <p className={s.liveName}>@{stream.host?.username}</p>
              <p className={s.liveTitle}>{stream.title}</p>
              <p className={s.liveViewers}>👁 {fmt(stream.viewers_count)} watching</p>
            </div>
            <svg className={s.liveChevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        );
      })}
    </div>
  );
}

function CreatorsSection({ data, navigate }) {
  if (!data.length) return <Empty text="No creators yet." />;
  return (
    <div className={s.creatorList}>
      {data.map((u, i) => {
        const avatar = u.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || 'U')}&background=FF005C&color=fff&size=80`;
        return (
          <div key={u.id || i} className={s.creatorRow}>
            <span className={s.creatorRank}>#{i + 1}</span>
            <button className={s.creatorLeft} onClick={() => navigate(`/profile/${u.username}`)}>
              <img src={avatar} alt="" className={s.creatorAvatar} />
              <div className={s.creatorText}>
                <span className={s.creatorName}>{u.display_name || u.username}</span>
                <span className={s.creatorHandle}>@{u.username}</span>
              </div>
            </button>
            <button className={s.creatorFollow}>Follow</button>
          </div>
        );
      })}
    </div>
  );
}

function MomentsSection({ data, navigate }) {
  if (!data.length) return <Empty text="No moments in the last 24 hours." />;
  /* unique authors → story circles */
  const seen = new Set();
  const stories = data.filter((v) => {
    const k = v.author?.username || v.user?.username;
    if (!k || seen.has(k)) return false;
    seen.add(k); return true;
  });

  return (
    <>
      {/* Big story circles */}
      <div className={s.storiesRow}>
        {stories.map((v) => {
          const username = v.author?.username || v.user?.username || '';
          const avatar   = v.author?.avatar || v.user?.avatar;
          return (
            <button key={v.id} className={s.storyItem} onClick={() => navigate(`/video/${v.id}`)}>
              <div className={s.storyRing}>
                <div className={s.storyCircle}>
                  {avatar
                    ? <img src={avatar} alt="" className={s.storyAvatar} />
                    : <div className={s.storyFallback}>{(username[0] || 'U').toUpperCase()}</div>
                  }
                </div>
              </div>
              <span className={s.storyName}>{username.length > 9 ? username.slice(0, 9) + '…' : username}</span>
            </button>
          );
        })}
      </div>

      {/* Grid below */}
      <div className={s.discoverGrid} style={{ padding: '4px 10px' }}>
        {data.map((v) => <VideoCard key={v.id} video={v} />)}
      </div>
    </>
  );
}

function Empty({ text }) {
  return <p className={s.empty}>{text}</p>;
}

function Spinner() {
  return <div className={s.spinnerWrap}><div className={s.spinner} /></div>;
}
