import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import VideoItem from '../components/VideoItem';
import s from './FeedPage.module.css';

export default function FeedPage() {
  const [tab, setTab] = useState('foryou');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef(null);
  const touchStartY = useRef(null);

  const fetchVideos = useCallback(async (t) => {
    setLoading(true);
    setCurrentIndex(0);
    try {
      const endpoint = t === 'foryou' ? '/videos/foryou/' : '/videos/following/';
      const { data } = await api.get(endpoint);
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
      {/* Tabs */}
      <div className={s.tabs}>
        <button className={`${s.tab} ${tab === 'foryou' ? s.active : ''}`} onClick={() => setTab('foryou')}>For You</button>
        <button className={`${s.tab} ${tab === 'following' ? s.active : ''}`} onClick={() => setTab('following')}>Following</button>
      </div>

      {/* Feed */}
      {loading ? (
        <div className={s.loading}>
          <div className={s.spinner} />
        </div>
      ) : videos.length === 0 ? (
        <div className={s.empty}>
          {tab === 'following' ? 'Follow creators to see their videos here!' : 'No videos yet. Be the first!'}
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
