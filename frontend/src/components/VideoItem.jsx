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

  const handleSave = async () => {
    if (video.is_saved) {
      const { data } = await api.delete(`/videos/${video.id}/unsave/`);
      onUpdate({ ...video, is_saved: false, saves_count: data.saves_count });
    } else {
      const { data } = await api.post(`/videos/${video.id}/save/`);
      onUpdate({ ...video, is_saved: true, saves_count: data.saves_count });
    }
  };

  const handleRepost = async () => {
    if (video.is_reposted) {
      const { data } = await api.delete(`/videos/${video.id}/unrepost/`);
      onUpdate({ ...video, is_reposted: false, reposts_count: data.reposts_count });
    } else {
      const { data } = await api.post(`/videos/${video.id}/repost/`);
      onUpdate({ ...video, is_reposted: true, reposts_count: data.reposts_count });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('حذف هذا الفيديو؟')) return;
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

  const fmt = (n) => {
    if (n === undefined || n === null) return '0';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

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

      {video.is_age_restricted && ageConfirmed && (
        <span className={s.ageBadge}>18+</span>
      )}

      {/* Report menu */}
      {showReport && (
        <div className={s.reportMenu}>
          <p style={{ color: '#888', fontSize: '.72rem', marginBottom: 2 }}>الإبلاغ عن المحتوى</p>
          {REPORT_REASONS.map((r) => (
            <button
              key={r.key}
              className={`${s.reportOption}${r.key === 'nsfw' ? ` ${s.danger}` : ''}`}
              onClick={() => handleReport(r.key)}
            >
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
          <img
            src={avatarUrl}
            alt=""
            className={s.avatar}
            onClick={() => navigate(`/profile/${video.author.username}`)}
          />
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
            <button className={s.deleteBtn} onClick={handleDelete}>حذف</button>
          )}
        </div>

        {video.caption && (
          <p className={s.caption}>{renderCaption(video.caption)}</p>
        )}

        {/* Music bar */}
        {video.audio_file && (
          <div className={s.musicBar}>
            <span className={s.musicNote}>♪</span>
            <span className={s.musicText}>موسيقى مضافة</span>
          </div>
        )}

        <div className={s.stats}>
          <span>👁 {fmt(video.views_count)}</span>
        </div>
      </div>

      {/* Right actions — matching TikTok layout */}
      <div className={s.actions}>
        {/* Avatar */}
        <div className={s.avatarAction}>
          <img
            src={avatarUrl}
            alt=""
            className={s.actionAvatar}
            onClick={() => navigate(`/profile/${video.author.username}`)}
          />
          {user?.username !== video.author.username && (
            <FollowDot authorUsername={video.author.username} />
          )}
        </div>

        {/* Like */}
        <ActionBtn
          icon={video.is_liked ? '❤️' : '🤍'}
          count={fmt(video.likes_count)}
          active={video.is_liked}
          onClick={handleLike}
          activeClass={s.liked}
        />

        {/* Comment */}
        <ActionBtn
          icon="💬"
          count={fmt(video.comments_count)}
          onClick={() => setShowComments(true)}
        />

        {/* Save / Bookmark */}
        <ActionBtn
          icon={video.is_saved ? '🔖' : '🏷️'}
          count={fmt(video.saves_count)}
          active={video.is_saved}
          onClick={handleSave}
        />

        {/* Share / Repost */}
        <ActionBtn
          icon={video.is_reposted ? '🔁' : '↗️'}
          count={fmt(video.reposts_count)}
          active={video.is_reposted}
          onClick={() => {
            if (video.author?.username === user?.username) {
              if (navigator.share) {
                navigator.share({ title: video.caption, url: `${window.location.origin}/video/${video.id}` });
              } else {
                navigator.clipboard?.writeText(`${window.location.origin}/video/${video.id}`);
              }
            } else {
              handleRepost();
            }
          }}
        />

        {/* Download */}
        <ActionBtn
          icon={downloading ? '⏳' : '⬇️'}
          count="حفظ"
          onClick={handleDownload}
        />

        {/* Report (other users' videos) */}
        {user?.username !== video.author.username && (
          <ActionBtn
            icon={reported ? '✅' : '🚩'}
            count={reported ? 'أُبلغ' : 'بلاغ'}
            onClick={() => !reported && setShowReport((v) => !v)}
          />
        )}

        {/* Next */}
        <button className={s.actionBtn} onClick={onNext}>
          <span style={{ fontSize: '1.4rem' }}>⬇</span>
          <span className={s.actionLabel}>التالي</span>
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
      {following ? 'يُتابَع' : '+ تابع'}
    </button>
  );
}

function FollowDot({ authorUsername }) {
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
    <button className={`${s.followDot} ${following ? s.followDotActive : ''}`} onClick={toggle}>
      {following ? '✓' : '+'}
    </button>
  );
}
