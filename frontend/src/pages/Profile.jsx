import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import EditProfileModal from '../components/EditProfileModal';
import styles from './Profile.module.css';

export default function Profile() {
  const { username } = useParams();
  const { user: me, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [quoting, setQuoting] = useState(null);

  const isMe = me?.username === username;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/users/${username}/`),
      api.get(`/posts/user/${username}/`),
    ]).then(([profileRes, postsRes]) => {
      setProfile(profileRes.data);
      setPosts(postsRes.data.results || postsRes.data);
    }).finally(() => setLoading(false));
  }, [username]);

  const toggleFollow = async () => {
    if (!profile || actionLoading) return;
    setActionLoading(true);
    try {
      if (profile.is_following) {
        await api.delete(`/users/${username}/unfollow/`);
        setProfile((p) => ({ ...p, is_following: false, followers_count: p.followers_count - 1 }));
      } else {
        await api.post(`/users/${username}/follow/`);
        setProfile((p) => ({ ...p, is_following: true, followers_count: p.followers_count + 1 }));
      }
    } finally { setActionLoading(false); }
  };

  const toggleBlock = async () => {
    if (!profile || actionLoading) return;
    if (!window.confirm(profile.is_blocked ? `Unblock @${username}?` : `Block @${username}?`)) return;
    setActionLoading(true);
    try {
      if (profile.is_blocked) {
        await api.delete(`/users/${username}/unblock/`);
        setProfile((p) => ({ ...p, is_blocked: false }));
      } else {
        await api.post(`/users/${username}/block/`);
        setProfile((p) => ({ ...p, is_blocked: true, is_following: false }));
        setPosts([]);
      }
    } finally { setActionLoading(false); }
  };

  const handleProfileUpdate = (updated) => {
    setProfile(updated);
    if (isMe) updateUser(updated);
    setShowEdit(false);
  };

  const handlePostUpdate = (updated) => setPosts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
  const handlePostDelete = (id) => setPosts((prev) => prev.filter((p) => p.id !== id));

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (!profile) return <div className={styles.loading}>User not found.</div>;

  const avatarUrl = profile.avatar ||
    `https://ui-avatars.com/api/?name=${profile.username}&background=7c3aed&color=fff&size=128`;

  return (
    <div>
      <div className={styles.coverWrap}>
        {profile.cover
          ? <img src={profile.cover} alt="cover" className={styles.cover} />
          : <div className={styles.coverPlaceholder} />
        }
      </div>

      <div className={styles.profileCard}>
        <div className={styles.avatarRow}>
          <img src={avatarUrl} alt={profile.username} className={styles.avatar} />
          <div className={styles.actions}>
            {isMe ? (
              <button className={styles.editBtn} onClick={() => setShowEdit(true)}>Edit profile</button>
            ) : (
              <>
                <button
                  className={profile.is_blocked ? styles.unblockedBtn : styles.blockBtn}
                  onClick={toggleBlock}
                  disabled={actionLoading}
                >
                  {profile.is_blocked ? 'Unblock' : 'Block'}
                </button>
                {!profile.is_blocked && (
                  <button
                    className={profile.is_following ? styles.unfollowBtn : styles.followBtn}
                    onClick={toggleFollow}
                    disabled={actionLoading}
                  >
                    {profile.is_following ? 'Unfollow' : 'Follow'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className={styles.info}>
          <h2 className={styles.name}>
            {profile.first_name || profile.last_name
              ? `${profile.first_name} ${profile.last_name}`.trim()
              : profile.username}
          </h2>
          <p className={styles.handle}>@{profile.username}</p>
          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
          <div className={styles.meta}>
            {profile.location && <span>📍 {profile.location}</span>}
            {profile.website && <a href={profile.website} target="_blank" rel="noreferrer">🔗 {profile.website}</a>}
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}><strong>{profile.following_count}</strong><span>Following</span></div>
            <div className={styles.stat}><strong>{profile.followers_count}</strong><span>Followers</span></div>
            <div className={styles.stat}><strong>{profile.posts_count}</strong><span>Posts</span></div>
          </div>
        </div>
      </div>

      <div className={styles.postsHeader}><h3>Posts</h3></div>

      {profile.is_blocked ? (
        <div className={styles.blocked}>You've blocked @{username}. Unblock to see their posts.</div>
      ) : posts.length === 0 ? (
        <div className={styles.empty}>No posts yet.</div>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} onUpdate={handlePostUpdate} onDelete={handlePostDelete} onQuote={setQuoting} />
        ))
      )}

      {showEdit && (
        <EditProfileModal profile={profile} onSave={handleProfileUpdate} onClose={() => setShowEdit(false)} />
      )}
    </div>
  );
}
