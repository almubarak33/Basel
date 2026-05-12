import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import s from './ProfilePage.module.css';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const target = username || me?.username;
  const isMe = me?.username === target;

  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!target) return;
    setLoading(true);
    Promise.all([
      api.get(`/users/${target}/`),
      api.get(`/videos/user/${target}/`),
    ]).then(([p, v]) => {
      setProfile(p.data);
      setVideos(v.data.results || v.data);
    }).finally(() => setLoading(false));
  }, [target]);

  const toggleFollow = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      if (profile.is_following) {
        await api.delete(`/users/${target}/unfollow/`);
        setProfile((p) => ({ ...p, is_following: false, followers_count: p.followers_count - 1 }));
      } else {
        await api.post(`/users/${target}/follow/`);
        setProfile((p) => ({ ...p, is_following: true, followers_count: p.followers_count + 1 }));
      }
    } finally { setActionLoading(false); }
  };

  const sendFriendRequest = async () => {
    setActionLoading(true);
    try {
      await api.post(`/users/${target}/friend-request/`);
      setProfile((p) => ({ ...p, friend_request_status: 'pending' }));
    } finally { setActionLoading(false); }
  };

  const startChat = async () => {
    const { data } = await api.post(`/messages/with/${target}/`);
    navigate(`/messages/${data.conversation_id}`);
  };

  const toggleBlock = async () => {
    const msg = profile.is_blocked
      ? t('profile.confirm_unblock', { username: target })
      : t('profile.confirm_block', { username: target });
    if (!window.confirm(msg)) return;
    setActionLoading(true);
    try {
      if (profile.is_blocked) {
        await api.delete(`/users/${target}/unblock/`);
        setProfile((p) => ({ ...p, is_blocked: false }));
      } else {
        await api.post(`/users/${target}/block/`);
        setProfile((p) => ({ ...p, is_blocked: true, is_following: false }));
        setVideos([]);
      }
    } finally { setActionLoading(false); }
  };

  const togglePrivacy = async () => {
    const newVal = !profile.is_private;
    await api.patch('/auth/me/', { is_private: newVal });
    setProfile((p) => ({ ...p, is_private: newVal }));
  };

  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : (n ?? 0);

  if (loading) return (
    <div className={s.loadingScreen}>
      <div className={s.spinner} />
    </div>
  );
  if (!profile) return <div className={s.loadingScreen}>{t('common.error')}</div>;

  const avatarUrl = profile.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=ff3366&color=fff&size=160`;

  const isPrivateLocked = profile.is_private && !isMe && !profile.is_friend && !profile.is_following;

  return (
    <div className={s.page}>
      {/* Header bar */}
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="20" height="20">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span className={s.headerHandle}>@{profile.username}</span>
        {isMe ? (
          <button className={s.settingsBtn} onClick={() => navigate('/settings')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="20" height="20">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        ) : <div style={{ width: 34 }} />}
      </div>

      {/* Scrollable body */}
      <div className={s.body}>
        {/* Hero */}
        <div className={s.hero}>
          <div className={s.heroGradient} />
          <div className={s.avatarRing}>
            <img src={avatarUrl} alt="" className={s.avatar} />
            {profile.is_live && <span className={s.liveRing}>LIVE</span>}
          </div>
          <p className={s.displayName}>{profile.first_name || profile.username}</p>
          <p className={s.handle}>
            @{profile.username}
            {profile.is_private && <span className={s.lockIcon}> 🔒</span>}
          </p>
          {profile.bio && <p className={s.bio}>{profile.bio}</p>}
          {profile.is_live && (
            <Link to={`/live/${profile.username}`} className={s.liveLink}>
              🔴 {t('profile.live_now')} — {profile.live_title}
            </Link>
          )}
        </div>

        {/* Stats row */}
        <div className={s.statsRow}>
          <div className={s.stat}>
            <strong>{fmt(profile.following_count)}</strong>
            <span>{t('profile.following')}</span>
          </div>
          <div className={s.statDivider} />
          <div className={s.stat}>
            <strong>{fmt(profile.followers_count)}</strong>
            <span>{t('profile.followers')}</span>
          </div>
          <div className={s.statDivider} />
          <div className={s.stat}>
            <strong>{fmt(profile.likes_count)}</strong>
            <span>{t('profile.likes')}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className={s.btnRow}>
          {isMe ? (
            <>
              <button className={s.editBtn} onClick={() => navigate('/settings')}>
                {t('profile.edit_profile')}
              </button>
              <button className={s.secBtn} onClick={togglePrivacy}>
                {profile.is_private ? t('profile.privacy_private') : t('profile.privacy_public')}
              </button>
            </>
          ) : (
            <>
              <button
                className={profile.is_following ? s.followingBtn : s.followBtn}
                onClick={toggleFollow}
                disabled={actionLoading}
              >
                {profile.is_following ? t('profile.following_btn') : t('profile.follow')}
              </button>
              {profile.is_friend ? (
                <button className={s.msgBtn} onClick={startChat}>{t('profile.message')}</button>
              ) : (
                <button
                  className={s.friendBtn}
                  onClick={sendFriendRequest}
                  disabled={actionLoading || profile.friend_request_status === 'pending'}
                >
                  {profile.friend_request_status === 'pending' ? t('profile.pending') : t('profile.add_friend')}
                </button>
              )}
              <button className={s.blockBtn} onClick={toggleBlock} disabled={actionLoading}>
                {profile.is_blocked ? '🔓' : '🚫'}
              </button>
            </>
          )}
        </div>

        {/* Videos grid */}
        {isPrivateLocked ? (
          <div className={s.privateLocked}>
            <span style={{ fontSize: '2.4rem' }}>🔒</span>
            <p className={s.privateTitle}>{t('profile.private_locked_title')}</p>
            <p className={s.privateSub}>{t('profile.private_locked_sub')}</p>
          </div>
        ) : profile.is_blocked ? (
          <p className={s.blockedMsg}>{t('profile.blocked_user')}</p>
        ) : videos.length === 0 ? (
          <p className={s.emptyMsg}>{t('profile.no_videos')}</p>
        ) : (
          <div className={s.grid}>
            {videos.map((v) => (
              <Link key={v.id} to={`/video/${v.id}`} className={s.thumb}>
                {v.thumbnail
                  ? <img src={v.thumbnail} alt="" className={s.thumbImg} />
                  : <video src={v.video_file} className={s.thumbImg} muted />
                }
                <div className={s.thumbOverlay}>
                  <span>▶ {fmt(v.views_count)}</span>
                  {v.visibility !== 'public' && (
                    <span className={s.visBadge}>
                      {v.visibility === 'friends' ? '👥' : v.visibility === 'private' ? '🔒' : ''}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
