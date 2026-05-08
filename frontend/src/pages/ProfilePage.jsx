import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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

  const toggleBlock = async () => {
    if (!window.confirm(profile.is_blocked ? `Unblock @${target}?` : `Block @${target}?`)) return;
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

  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n ?? 0;

  if (loading) return <div className={s.loading}><div className={s.spinner} /></div>;
  if (!profile) return <div className={s.loading}>User not found.</div>;

  const avatarUrl = profile.avatar ||
    `https://ui-avatars.com/api/?name=${profile.username}&background=fe2c55&color=fff&size=128`;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}>←</button>
        <span className={s.headerName}>@{profile.username}</span>
        <div style={{ width: 32 }} />
      </div>

      <div className={s.body}>
        <div className={s.topSection}>
          <img src={avatarUrl} alt="" className={s.avatar} />
          <div className={s.stats}>
            <div className={s.stat}><strong>{fmt(profile.following_count)}</strong><span>Following</span></div>
            <div className={s.stat}><strong>{fmt(profile.followers_count)}</strong><span>Followers</span></div>
            <div className={s.stat}><strong>{fmt(profile.likes_count)}</strong><span>Likes</span></div>
          </div>
        </div>

        <p className={s.displayName}>{profile.first_name || profile.username}</p>
        <p className={s.handle}>@{profile.username}</p>
        {profile.bio && <p className={s.bio}>{profile.bio}</p>}

        {profile.is_live && (
          <Link to={`/live/${profile.username}`} className={s.liveNow}>
            🔴 LIVE NOW — {profile.live_title}
          </Link>
        )}

        <div className={s.btnRow}>
          {isMe ? (
            <button className={s.editBtn}>Edit Profile</button>
          ) : (
            <>
              <button
                className={profile.is_following ? s.followingBtn : s.followBtn}
                onClick={toggleFollow}
                disabled={actionLoading}
              >
                {profile.is_following ? 'Following' : 'Follow'}
              </button>
              <button className={s.blockBtn} onClick={toggleBlock} disabled={actionLoading}>
                {profile.is_blocked ? 'Unblock' : '🚫'}
              </button>
            </>
          )}
        </div>

        {/* Videos grid */}
        <div className={s.grid}>
          {profile.is_blocked ? (
            <p className={s.blocked}>You blocked this user.</p>
          ) : videos.length === 0 ? (
            <p className={s.noVideos}>No videos yet.</p>
          ) : (
            videos.map((v) => (
              <Link key={v.id} to={`/video/${v.id}`} className={s.thumb}>
                {v.thumbnail
                  ? <img src={v.thumbnail} alt="" className={s.thumbImg} />
                  : <video src={v.video_file} className={s.thumbImg} muted />
                }
                <div className={s.thumbOverlay}>
                  <span>▶ {fmt(v.views_count)}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
