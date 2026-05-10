import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import s from './FeedCard.module.css';

const HeartIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? 'var(--accent)' : 'none'}
    stroke={filled ? 'var(--accent)' : 'currentColor'} strokeWidth="2" width="20" height="20">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const CommentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="19" height="19">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" width="44" height="44">
    <circle cx="12" cy="12" r="12" fill="rgba(0,0,0,0.35)"/>
    <path d="M10 8l6 4-6 4V8z" fill="white"/>
  </svg>
);

export default function FeedCard({ video }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [liked, setLiked]   = useState(video.is_liked || false);
  const [likes, setLikes]   = useState(video.likes_count || 0);
  const [saidHi, setSaidHi] = useState(false);
  const [toastMsg, setToast] = useState('');
  const [expanded, setExpanded] = useState(false);

  const username    = video.author?.username || video.user?.username || '';
  const displayName = video.author?.first_name || video.author?.display_name || username;
  const avatar      = video.author?.avatar || video.user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'U')}&background=FF005C&color=fff&size=80`;
  const isOwn = user?.username === username;

  const fmt = (n) => n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : (n ?? 0);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const toggleLike = async () => {
    if (!user) { navigate('/login'); return; }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((c) => wasLiked ? c - 1 : c + 1);
    try {
      await api.post(`/videos/${video.id}/${wasLiked ? 'unlike' : 'like'}/`);
    } catch {
      setLiked(wasLiked);
      setLikes((c) => wasLiked ? c + 1 : c - 1);
    }
  };

  const doSayHi = async () => {
    if (!user) { navigate('/login'); return; }
    if (saidHi || isOwn) return;
    setSaidHi(true);
    flash(`Said Hi to @${username}! 👋`);
    try {
      const { data } = await api.post(`/messages/with/${username}/`);
      await api.post(`/messages/${data.conversation_id}/send/`, { content: '👋 Hey!' });
    } catch { /* best-effort */ }
  };

  const share = () => {
    const url = `${window.location.origin}/video/${video.id}`;
    if (navigator.share) {
      navigator.share({ url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      flash('Link copied!');
    }
  };

  const CAPTION_LIMIT = 110;
  const caption = video.caption || '';
  const needsExpand = caption.length > CAPTION_LIMIT;

  return (
    <article className={s.card}>
      {/* ── Author row ── */}
      <div className={s.authorRow}>
        <Link to={`/profile/${username}`} className={s.authorLeft}>
          <img src={avatar} alt="" className={s.avatar} />
          <div className={s.authorText}>
            <span className={s.name}>{displayName}</span>
            <span className={s.handle}>@{username}</span>
          </div>
        </Link>
        {!isOwn && (
          <button className={s.followChip}>+ Follow</button>
        )}
      </div>

      {/* ── Media ── */}
      <div className={s.mediaWrap} onClick={() => navigate(`/video/${video.id}`)}>
        {video.thumbnail
          ? <img src={video.thumbnail} alt="" className={s.mediaImg} />
          : <video src={video.video_file} className={s.mediaImg} muted playsInline />
        }
        <div className={s.playBtn}><PlayIcon /></div>
      </div>

      {/* ── Caption ── */}
      {caption && (
        <p className={s.caption}>
          {expanded || !needsExpand ? caption : caption.slice(0, CAPTION_LIMIT) + '…'}
          {needsExpand && (
            <button className={s.moreBtn} onClick={() => setExpanded((v) => !v)}>
              {expanded ? ' less' : ' more'}
            </button>
          )}
        </p>
      )}

      {/* ── Actions ── */}
      <div className={s.actions}>
        <button className={`${s.action} ${liked ? s.actionLiked : ''}`} onClick={toggleLike}>
          <HeartIcon filled={liked} />
          <span>{fmt(likes)}</span>
        </button>

        <button className={s.action} onClick={() => navigate(`/video/${video.id}`)}>
          <CommentIcon />
          <span>{fmt(video.comments_count)}</span>
        </button>

        <button className={s.action} onClick={share}>
          <ShareIcon />
          <span>Share</span>
        </button>

        <button
          className={`${s.sayHiBtn} ${saidHi ? s.saidHi : ''}`}
          onClick={doSayHi}
          disabled={saidHi || isOwn}
        >
          {saidHi ? '✓ Said Hi' : '👋 Say Hi'}
        </button>
      </div>

      {/* ── Toast ── */}
      {toastMsg && <div className={s.toast}>{toastMsg}</div>}
    </article>
  );
}
