import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import s from './FriendsPage.module.css';

export default function FriendsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [tab, setTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/users/friend-requests/'),
      api.get(`/users/${user?.username}/friends/`),
    ]).then(([r, f]) => {
      setRequests(r.data);
      setFriends(f.data.results || f.data);
    }).finally(() => setLoading(false));
  }, [user]);

  const respond = async (id, action) => {
    await api.post(`/users/friend-requests/${id}/respond/`, { action });
    setRequests((prev) => prev.filter((r) => r.id !== id));
    if (action === 'accept') {
      api.get(`/users/${user?.username}/friends/`).then(({ data }) =>
        setFriends(data.results || data)
      );
    }
  };

  const startChat = async (username) => {
    const { data } = await api.post(`/messages/with/${username}/`);
    navigate(`/messages/${data.conversation_id}`);
  };

  const avatarUrl = (u) => u.avatar ||
    `https://ui-avatars.com/api/?name=${u.username}&background=fe2c55&color=fff&size=48`;

  return (
    <div className={s.page}>
      <div className={s.header}><h2>{t('friends.title')}</h2></div>

      <div className={s.tabBar}>
        <button className={`${s.tabBtn} ${tab === 'requests' ? s.tabActive : ''}`} onClick={() => setTab('requests')}>
          {t('friends.requests_tab')} {requests.length > 0 && <span className={s.badge}>{requests.length}</span>}
        </button>
        <button className={`${s.tabBtn} ${tab === 'friends' ? s.tabActive : ''}`} onClick={() => setTab('friends')}>
          {t('friends.my_friends_tab')} ({friends.length})
        </button>
      </div>

      <div className={s.body}>
        {loading ? (
          <div className={s.loader}><div className={s.spinner} /></div>
        ) : tab === 'requests' ? (
          requests.length === 0
            ? <p className={s.empty}>{t('friends.no_requests')}</p>
            : requests.map((r) => (
              <div key={r.id} className={s.reqCard}>
                <img src={avatarUrl(r.sender)} alt="" className={s.reqAvatar} onClick={() => navigate(`/profile/${r.sender.username}`)} />
                <div className={s.reqInfo}>
                  <p className={s.reqName}>@{r.sender.username}</p>
                  <div className={s.reqActions}>
                    <button className={s.acceptBtn} onClick={() => respond(r.id, 'accept')}>{t('friends.accept')}</button>
                    <button className={s.rejectBtn} onClick={() => respond(r.id, 'reject')}>{t('friends.reject')}</button>
                  </div>
                </div>
              </div>
            ))
        ) : (
          friends.length === 0
            ? <p className={s.empty}>{t('friends.no_friends')}</p>
            : friends.map((f) => (
              <div key={f.id} className={s.friendCard}>
                <img src={avatarUrl(f)} alt="" className={s.friendAvatar} onClick={() => navigate(`/profile/${f.username}`)} />
                <div className={s.friendInfo}>
                  <p className={s.friendName}>@{f.username}</p>
                  {f.is_live && <span className={s.liveBadge}>🔴 LIVE</span>}
                </div>
                <button className={s.msgBtn} onClick={() => startChat(f.username)}>{t('friends.message')}</button>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
