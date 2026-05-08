import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CommentsDrawer from './CommentsDrawer';
import s from './VideoItem.module.css';

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

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.play().catch(() => {});
      setPaused(false);
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [isActive]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) { el.play(); setPaused(false); }
    else { el.pause(); setPaused(true); }
  };

  const handleDoubleTap = () => {
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

  const avatarUrl = video.author.avatar ||
    `https://ui-avatars.com/api/?name=${video.author.username}&background=fe2c55&color=fff&size=48`;

  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n;

  return (
    <div className={s.item}>
      {/* Video */}
      <video
        ref={videoRef}
        src={video.video_file}
        className={s.video}
        loop
        playsInline
        muted={false}
        onClick={handleDoubleTap}
        onDoubleClick={handleLike}
      />

      {/* Pause indicator */}
      {paused && (
        <div className={s.pauseIcon} onClick={togglePlay}>▶</div>
      )}

      {/* Double-tap like animation */}
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
