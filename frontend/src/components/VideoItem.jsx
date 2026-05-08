import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CommentsDrawer from './CommentsDrawer';
import s from './VideoItem.module.css';

const REPORT_REASONS = [
  { key: 'nsfw', label: '🔞 محتوى جنسي' },
  { key: 'violence', label: '⚠️ عنف' },
  { key: 'harassment', label: '🚫 تحرش' },
  { key: 'spam', label: '📢 سبام' },
  { key: 'other', label: '❓ أخرى' },
];

function renderCaption(caption) {
  if (!caption) return null;
  return caption.split(/(#\w+)/g).map((part, i) =>
    part.startsWith('#')
      ? <Link key={i} to={`/hashtag/${part.slice(1)}`} className={s.hashtag}>{part}</Link>
      : <span key={i}>{part}</span>
  );
}

export default function VideoItem({ video, isActive, onUpdate, onDelete, onNext }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reported, setReported] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isRestricted = video.is_age_restricted && !ageConfirmed;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive && !isRestricted) {
      el.play().catch(() => {});
      setPaused(false);
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [isActive, isRestricted]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) { el.play(); setPaused(false); }
    else { el.pause(); setPaused(true); }
  };

  const handleDoubleTap = () => {
    if (isRestricted) return;
    const now = Date.now();
    if (now - lastTap < 300) handleLike();
    setLastTap(now);
  };

  const handleLike = async () => {
    if (video.is_liked) {
      const { data } = await api.delete(`/videos/${video.id}/unlike/`);
      onUpdate({ ...video, is_liked: false, likes_count: data.likes_count });
    } else {
      const { data } = await api.post(`/videos/${video.id}/like/`);
      onUpdate({ ...video, is_liked: true, likes_count: data.likes_count });
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 800);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this video?')) return;
    await api.delete(`/videos/${video.id}/`);
    onDelete(video.id);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(
        `${api.defaults.baseURL}/videos/${video.id}/download/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sayhi_${video.id}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('فشل التحميل. حاول مجدداً.');
    } finally {
      setDownloading(false);
    }
  };

  const handleReport = async (reason) => {
    setShowReport(false);
    try {
      await api.post(`/videos/${video.id}/report/`, { reason });
      setReported(true);
    } catch { /* already reported */ }
  };

  const avatarUrl = video.author.avatar ||
    `https://ui-avatars.com/api/?name=${video.author.username}&background=fe2c55&color=fff&size=48`;

  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n;

  return (
    <div className={s.item}>
      {/* Age-restriction gate */}
      {isRestricted && (
        <div className={s.ageGate}>
          <span className={s.ageGateIcon}>🔞</span>
          <p className={s.ageGateText}>هذا المحتوى مقيد للبالغين فقط</p>
          <button className={s.ageGateBtn} onClick={() => setAgeConfirmed(true)}>
            تأكيد — عمري +18
          </button>
        </div>
      )}

      {/* Age badge (visible after confirm) */}
      {video.is_age_restricted && ageConfirmed && (
        <span className={s.ageBadge}>18+</span>
      )}

      {/* Report menu */}
      {showReport && (
        <div className={s.reportMenu}>
          <p style={{ color: '#888', fontSize: '.72rem', marginBottom: 2 }}>الإبلاغ عن المحتوى</p>
          {REPORT_REASONS.map((r) => (
            <button key={r.key} className={s.reportOption + (r.key === 'nsfw' ? ` ${s.danger}` : '')} onClick={() => handleReport(r.key)}>
              {r.label}
            </button>
          ))}
          <button className={s.reportOption} onClick={() => setShowReport(false)}>إلغاء</button>
        </div>
      )}

      {/* Video */}
      <video
        ref={videoRef}
        src={video.video_file}
        className={s.video}
        loop
        playsInline
        muted={false}
        onClick={handleDoubleTap}
        onDoubleClick={isRestricted ? undefined : handleLike}
      />

      {paused && !isRestricted && (
        <div className={s.pauseIcon} onClick={togglePlay}>▶</div>
      )}

      {likeAnim && <div className={s.likeAnim}>❤️</div>}

      {/* Bottom info */}
      <div className={s.info}>
        <div className={s.authorRow}>
          <img src={avatarUrl} alt="" className={s.avatar} onClick={() => navigate(`/profile/${video.author.username}`)} />
          <div>
            <span className={s.username} onClick={() => navigate(`/profile/${video.author.username}`)}>
              @{video.author.username}
            </span>
            {video.author.is_live && <span className={s.liveBadge}>LIVE</span>}
          </div>
          {user?.username !== video.author.username && (
            <FollowBtn authorUsername={video.author.username} />
          )}
          {user?.username === video.author.username && (
            <button className={s.deleteBtn} onClick={handleDelete}>Delete</button>
          )}
        </div>
        {video.caption && (
          <p className={s.caption}>{renderCaption(video.caption)}</p>
        )}
        <div className={s.stats}>
          <span>👁 {fmt(video.views_count)}</span>
        </div>
      </div>

      {/* Right actions */}
      <div className={s.actions}>
        <ActionBtn
          icon={video.is_liked ? '❤️' : '🤍'}
          count={fmt(video.likes_count)}
          active={video.is_liked}
          onClick={handleLike}
          activeClass={s.liked}
        />
        <ActionBtn
          icon="💬"
          count={fmt(video.comments_count)}
          onClick={() => setShowComments(true)}
        />
        <ActionBtn
          icon="↗️"
          count="Share"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: video.caption, url: `${window.location.origin}/video/${video.id}` });
            } else {
              navigator.clipboard?.writeText(`${window.location.origin}/video/${video.id}`);
            }
          }}
        />
        <ActionBtn
          icon={downloading ? '⏳' : '⬇️'}
          count="Save"
          onClick={handleDownload}
        />
        {user?.username !== video.author.username && (
          <ActionBtn
            icon={reported ? '✅' : '🚩'}
            count={reported ? 'Reported' : 'Report'}
            onClick={() => !reported && setShowReport((v) => !v)}
          />
        )}
        <button className={s.actionBtn} onClick={onNext}>
          <span style={{ fontSize: '1.5rem' }}>⬇</span>
          <span className={s.actionLabel}>Next</span>
        </button>
      </div>

      {showComments && (
        <CommentsDrawer
          videoId={video.id}
          onClose={() => setShowComments(false)}
          onCount={(c) => onUpdate({ ...video, comments_count: c })}
        />
      )}
    </div>
  );
}

function ActionBtn({ icon, count, onClick, active, activeClass }) {
  return (
    <button className={`${s.actionBtn} ${active ? activeClass || '' : ''}`} onClick={onClick}>
      <span className={s.actionIcon}>{icon}</span>
      <span className={s.actionLabel}>{count}</span>
    </button>
  );
}

function FollowBtn({ authorUsername }) {
  const [following, setFollowing] = useState(false);
  const toggle = async () => {
    try {
      if (following) {
        await api.delete(`/users/${authorUsername}/unfollow/`);
        setFollowing(false);
      } else {
        await api.post(`/users/${authorUsername}/follow/`);
        setFollowing(true);
      }
    } catch { /* ignore */ }
  };
  return (
    <button className={`${s.followBtn} ${following ? s.following : ''}`} onClick={toggle}>
      {following ? 'Following' : '+ Follow'}
    </button>
  );
}
