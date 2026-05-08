import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import VideoItem from '../components/VideoItem';
import s from './FeedPage.module.css';

const TABS = [
  { key: 'foryou', label: 'لك' },
  { key: 'following', label: 'أتابعه' },
  { key: 'saved', label: '🔖 المحفوظ' },
];

export default function FeedPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('foryou');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef(null);
  const touchStartY = useRef(null);

  const ENDPOINT = {
    foryou: '/videos/foryou/',
    following: '/videos/following/',
    saved: '/videos/saved/',
  };

  const fetchVideos = useCallback(async (t) => {
    setLoading(true);
    setCurrentIndex(0);
    try {
      const { data } = await api.get(ENDPOINT[t]);
      setVideos(data.results || data);
    } catch { setVideos([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVideos(tab); }, [tab, fetchVideos]);

  const goTo = useCallback((idx) => {
    if (idx < 0 || idx >= videos.length) return;
    setCurrentIndex(idx);
    const el = containerRef.current?.children[idx];
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [videos.length]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.deltaY > 30) goTo(currentIndex + 1);
    else if (e.deltaY < -30) goTo(currentIndex - 1);
  }, [currentIndex, goTo]);

  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (diff > 50) goTo(currentIndex + 1);
    else if (diff < -50) goTo(currentIndex - 1);
    touchStartY.current = null;
  };

  const handleUpdate = (updated) =>
    setVideos((prev) => prev.map((v) => v.id === updated.id ? updated : v));

  const handleDelete = (id) => {
    setVideos((prev) => {
      const next = prev.filter((v) => v.id !== id);
      setCurrentIndex((i) => Math.min(i, next.length - 1));
      return next;
    });
  };

  return (
    <div className={s.page}>
      {/* Top bar */}
      <div className={s.topBar}>
        <div className={s.topLeft}>
          <button className={s.iconBtn} onClick={() => navigate('/search')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="22" height="22">
              <circle cx="11" cy="11" r="7"/>
              <line x1="20" y1="20" x2="15.5" y2="15.5"/>
            </svg>
          </button>
        </div>

        <div className={s.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`${s.tab} ${tab === t.key ? s.active : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={s.topRight}>
          <button className={s.livePill} onClick={() => navigate('/inbox')}>LIVE</button>
        </div>
      </div>

      {loading ? (
        <div className={s.loading}><div className={s.spinner} /></div>
      ) : videos.length === 0 ? (
        <div className={s.empty}>
          {tab === 'following' ? 'تابع أشخاصاً لترى فيديوهاتهم هنا!' :
           tab === 'saved' ? 'لم تحفظ أي فيديو بعد.' : 'لا توجد فيديوهات بعد!'}
        </div>
      ) : (
        <div
          ref={containerRef}
          className={s.feed}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {videos.map((video, idx) => (
            <VideoItem
              key={video.id}
              video={video}
              isActive={idx === currentIndex}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onNext={() => goTo(idx + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
