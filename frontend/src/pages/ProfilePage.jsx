import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import s from './ProfilePage.module.css';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: me, updateUser } = useAuth();
  const navigate = useNavigate();
  const target = username || me?.username;

  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);

  const { t } = useTranslation();
  const isMe = me?.username === target;

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
    if (!window.confirm(profile.is_blocked ? t('profile.confirm_unblock', { username: target }) : t('profile.confirm_block', { username: target }))) return;
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
    setShowPrivacyMenu(false);
  };

  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n ?? 0;

  if (loading) return <div className={s.loading}><div className={s.spinner} /></div>;
  if (!profile) return <div className={s.loading}>{t('common.error')}</div>;

  const avatarUrl = profile.avatar ||
    `https://ui-avatars.com/api/?name=${profile.username}&background=fe2c55&color=fff&size=128`;

  const isPrivateLocked = profile.is_private && !isMe && !profile.is_friend && !profile.is_following;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}>←</button>
        <span className={s.headerName}>
          @{profile.username}
          {profile.is_private && <span className={s.privateBadge}> 🔒</span>}
        </span>
        {isMe && (
          <button className={s.settingsBtn} onClick={() => setShowPrivacyMenu((v) => !v)}>⚙️</button>
        )}
        {!isMe && <div style={{ width: 32 }} />}
      </div>

      {/* Privacy menu */}
      {showPrivacyMenu && isMe && (
        <div className={s.privacyMenu}>
          <button className={s.privacyItem} onClick={togglePrivacy}>
            {profile.is_private ? `🔓 ${t('settings.now_public')}` : `🔒 ${t('settings.private_account')}`}
          </button>
          <button className={s.privacyItem} onClick={() => setShowPrivacyMenu(false)}>{t('common.cancel')}</button>
        </div>
      )}

      <div className={s.body}>
        <div className={s.topSection}>
          <img src={avatarUrl} alt="" className={s.avatar} />
          <div className={s.stats}>
            <div className={s.stat}><strong>{fmt(profile.following_count)}</strong><span>{t('profile.following')}</span></div>
            <div className={s.stat}><strong>{fmt(profile.followers_count)}</strong><span>{t('profile.followers')}</span></div>
            <div className={s.stat}><strong>{fmt(profile.likes_count)}</strong><span>{t('profile.likes')}</span></div>
          </div>
        </div>

        <p className={s.displayName}>{profile.first_name || profile.username}</p>
        <p className={s.handle}>@{profile.username}</p>
        {profile.bio && <p className={s.bio}>{profile.bio}</p>}
        {profile.is_private && <p className={s.privateNote}>🔒 {t('profile.private_account')}</p>}

        {profile.is_live && (
          <Link to={`/live/${profile.username}`} className={s.liveNow}>
            {t('profile.live_now')} — {profile.live_title}
          </Link>
        )}

        <div className={s.btnRow}>
          {isMe ? (
            <>
              <button className={s.editBtn} onClick={() => navigate('/settings')}>{t('profile.edit_profile')}</button>
              <button
                className={s.privacyToggleBtn}
                onClick={togglePrivacy}
              >
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
            <p style={{ fontSize: '2rem' }}>🔒</p>
            <p>{t('profile.private_locked_title')}</p>
            <p style={{ fontSize: '.82rem', color: '#555' }}>{t('profile.private_locked_sub')}</p>
          </div>
        ) : (
          <div className={s.grid}>
            {profile.is_blocked ? (
              <p className={s.blocked}>{t('profile.blocked_user')}</p>
            ) : videos.length === 0 ? (
              <p className={s.noVideos}>{t('profile.no_videos')}</p>
            ) : (
              videos.map((v) => (
                <Link key={v.id} to={`/video/${v.id}`} className={s.thumb}>
                  {v.thumbnail
                    ? <img src={v.thumbnail} alt="" className={s.thumbImg} />
                    : <video src={v.video_file} className={s.thumbImg} muted />
                  }
                  <div className={s.thumbOverlay}>
                    <span>▶ {fmt(v.views_count)}</span>
                    {v.visibility !== 'public' && (
                      <span className={s.visibilityBadge}>
                        {v.visibility === 'friends' ? '👥' : v.visibility === 'private' ? '🔒' : '📦'}
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
