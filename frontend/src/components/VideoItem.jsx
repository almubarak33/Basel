import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reported, setReported] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [editVisibility, setEditVisibility] = useState('public');
  const [editSaving, setEditSaving] = useState(false);

  // Photo carousel
  const [slideIndex, setSlideIndex] = useState(0);
  const touchStartX = useRef(null);
  const isPhoto = video.post_type === 'photo';
  const slides = video.slides || [];

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

  useEffect(() => {
    if (!isPhoto || !isActive || !video.audio_file || slides.length < 2) return;
    const id = setInterval(() => {
      setSlideIndex((i) => (i + 1) % slides.length);
    }, 3000);
    return () => clearInterval(id);
  }, [isPhoto, isActive, video.audio_file, slides.length]);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) setSlideIndex((i) => Math.min(i + 1, slides.length - 1));
    else setSlideIndex((i) => Math.max(i - 1, 0));
  };

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

  const openEdit = () => {
    setEditCaption(video.caption || '');
    setEditVisibility(video.visibility || 'public');
    setShowEdit(true);
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    try {
      const { data } = await api.patch(`/videos/${video.id}/edit/`, {
        caption: editCaption,
        visibility: editVisibility,
      });
      onUpdate({ ...video, caption: data.caption, visibility: data.visibility });
      setShowEdit(false);
    } catch {} finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('video_item.confirm_delete'))) return;
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
      alert(t('video_item.download_failed'));
    } finally {
      setDownloading(false);
    }
  };

  const handleReport = async (reason) => {
    setShowReport(false);
    try {
      await api.post(`/videos/${video.id}/report/`, { reason });
      setReported(true);
    } catch {}
  };

  const avatarUrl = video.author.avatar ||
    `https://ui-avatars.com/api/?name=${video.author.username}&background=fe2c55&color=fff&size=48`;

  const fmt = (n) => {
    if (n === undefined || n === null) return '0';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  const REPORT_REASONS = [
    { key: 'nsfw',       label: t('video_item.report_nsfw') },
    { key: 'violence',   label: t('video_item.report_violence') },
    { key: 'harassment', label: t('video_item.report_harassment') },
    { key: 'spam',       label: t('video_item.report_spam') },
    { key: 'other',      label: t('video_item.report_other') },
  ];

  return (
    <div className={s.item}>
      {/* Age-restriction gate */}
      {isRestricted && (
        <div className={s.ageGate}>
          <span className={s.ageGateIcon}>🔞</span>
          <p className={s.ageGateText}>{t('video_item.age_restricted')}</p>
          <button className={s.ageGateBtn} onClick={() => setAgeConfirmed(true)}>
            {t('video_item.confirm_age')}
          </button>
        </div>
      )}

      {video.is_age_restricted && ageConfirmed && (
        <span className={s.ageBadge}>18+</span>
      )}

      {/* Report menu */}
      {showReport && (
        <div className={s.reportMenu}>
          <p style={{ color: '#888', fontSize: '.72rem', marginBottom: 2 }}>{t('video_item.report_title')}</p>
          {REPORT_REASONS.map((r) => (
            <button
              key={r.key}
              className={`${s.reportOption}${r.key === 'nsfw' ? ` ${s.danger}` : ''}`}
              onClick={() => handleReport(r.key)}
            >
              {r.label}
            </button>
          ))}
          <button className={s.reportOption} onClick={() => setShowReport(false)}>{t('video_item.cancel')}</button>
        </div>
      )}

      {/* Media: photo carousel or video */}
      {isPhoto ? (
        <div
          className={s.carousel}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={handleDoubleTap}
        >
          {slides.length > 0 ? (
            <img src={slides[slideIndex]?.image} alt="" className={s.carouselImg} draggable={false} />
          ) : (
            <div className={s.noMedia}>{t('edit_post.no_media')}</div>
          )}
          {slides.length > 1 && (
            <div className={s.carouselDots}>
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`${s.carouselDot} ${i === slideIndex ? s.carouselDotActive : ''}`}
                  onClick={(e) => { e.stopPropagation(); setSlideIndex(i); }}
                />
              ))}
            </div>
          )}
          {slides.length > 1 && (
            <div className={s.slideCounter}>{slideIndex + 1} / {slides.length}</div>
          )}
        </div>
      ) : (
        <video
          ref={videoRef}
          src={video.video_file}
          className={s.video}
          loop
          playsInline
          onClick={handleDoubleTap}
          onDoubleClick={isRestricted ? undefined : handleLike}
        />
      )}

      {paused && !isRestricted && !isPhoto && (
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
            <>
              <button className={s.editBtn} onClick={openEdit}>✏️</button>
              <button className={s.deleteBtn} onClick={handleDelete}>{t('video_item.delete')}</button>
            </>
          )}
        </div>

        {video.caption && (
          <p className={s.caption}>{renderCaption(video.caption)}</p>
        )}

        {video.audio_file && (
          <div className={s.musicBar}>
            <span className={s.musicNote}>♪</span>
            <span className={s.musicText}>{t('video_item.music_added')}</span>
          </div>
        )}

        <div className={s.stats}>
          <span>👁 {fmt(video.views_count)}</span>
        </div>
      </div>

      {/* Right actions */}
      <div className={s.actions}>
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

        <ActionBtn icon={video.is_liked ? '❤️' : '🤍'} count={fmt(video.likes_count)} active={video.is_liked} onClick={handleLike} activeClass={s.liked} />
        <ActionBtn icon="💬" count={fmt(video.comments_count)} onClick={() => setShowComments(true)} />
        <ActionBtn icon={video.is_saved ? '🔖' : '🏷️'} count={fmt(video.saves_count)} active={video.is_saved} onClick={handleSave} />

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

        <ActionBtn icon={downloading ? '⏳' : '⬇️'} count={t('video_item.download')} onClick={handleDownload} />

        {user?.username !== video.author.username && (
          <ActionBtn
            icon={reported ? '✅' : '🚩'}
            count={reported ? t('video_item.reported') : t('video_item.report')}
            onClick={() => !reported && setShowReport((v) => !v)}
          />
        )}

        <button className={s.actionBtn} onClick={onNext}>
          <span style={{ fontSize: '1.4rem' }}>⬇</span>
          <span className={s.actionLabel}>{t('video_item.next')}</span>
        </button>
      </div>

      {showComments && (
        <CommentsDrawer
          videoId={video.id}
          onClose={() => setShowComments(false)}
          onCount={(c) => onUpdate({ ...video, comments_count: c })}
        />
      )}

      {showEdit && (
        <div className={s.editOverlay} onClick={() => setShowEdit(false)}>
          <div className={s.editModal} onClick={(e) => e.stopPropagation()}>
            <p className={s.editModalTitle}>{t('video_item.edit')}</p>
            <textarea
              className={s.editTextarea}
              placeholder={t('video_item.edit_caption')}
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              maxLength={2200}
            />
            <select
              className={s.editSelect}
              value={editVisibility}
              onChange={(e) => setEditVisibility(e.target.value)}
            >
              <option value="public">{t('edit_post.public')}</option>
              <option value="friends">{t('edit_post.friends')}</option>
              <option value="private">{t('edit_post.private')}</option>
            </select>
            <button className={s.editSaveBtn} onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? t('video_item.edit_saving') : t('video_item.edit_save')}
            </button>
            <button className={s.editCancelBtn} onClick={() => setShowEdit(false)}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
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
  const { t } = useTranslation();
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
    } catch {}
  };
  return (
    <button className={`${s.followBtn} ${following ? s.following : ''}`} onClick={toggle}>
      {following ? t('video_item.following') : t('video_item.follow')}
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
    } catch {}
  };
  return (
    <button className={`${s.followDot} ${following ? s.followDotActive : ''}`} onClick={toggle}>
      {following ? '✓' : '+'}
    </button>
  );
}
