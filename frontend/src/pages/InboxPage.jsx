import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import s from './InboxPage.module.css';

export default function InboxPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('messages');
  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [streams, setStreams] = useState([]);
  const [title, setTitle] = useState('');
  const [showStart, setShowStart] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api.get('/messages/').then(({ data }) => setConversations(data.results || data)).catch(() => {});
    api.get('/notifications/').then(({ data }) => {
      setNotifications(data.results || data);
      api.post('/notifications/read/').catch(() => {});
    }).catch(() => {});
    api.get('/live/').then(({ data }) => setStreams(data.results || data)).catch(() => {});
  }, []);

  const startLive = async () => {
    if (!title.trim()) return;
    setStarting(true);
    try {
      const { data } = await api.post('/live/start/', { title });
      navigate(`/live/${data.id}`);
    } finally { setStarting(false); }
  };

  const NOTIF_ICON = {
    like: '❤️', comment: '💬', follow: '👤',
    friend_request: '🤝', friend_accept: '✅',
    repost: '🔁', message: '💌',
  };

  return (
    <div className={s.page}>
      <div className={s.header}><h2>الوارد</h2></div>

      <div className={s.tabBar}>
        {[['messages', 'الرسائل'], ['notifications', 'الإشعارات'], ['live', '🔴 مباشر']].map(([k, label]) => (
          <button
            key={k}
            className={`${s.tabBtn} ${activeTab === k ? s.tabActive : ''}`}
            onClick={() => setActiveTab(k)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={s.body}>
        {/* Messages */}
        {activeTab === 'messages' && (
          conversations.length === 0
            ? <p className={s.empty}>لا توجد محادثات بعد. ابحث عن صديق وابدأ!</p>
            : conversations.map((c) => (
              <button key={c.id} className={s.convCard} onClick={() => navigate(`/messages/${c.id}`)}>
                <div className={s.convAvatar}>
                  {c.participants?.[0]?.avatar
                    ? <img src={c.participants[0].avatar} alt="" />
                    : <span>{(c.participants?.[0]?.username || '?')[0].toUpperCase()}</span>
                  }
                  {c.unread_count > 0 && <span className={s.unreadDot}>{c.unread_count}</span>}
                </div>
                <div className={s.convInfo}>
                  <p className={s.convName}>{c.participants?.map((p) => `@${p.username}`).join(', ')}</p>
                  <p className={s.convLast}>{c.last_message?.content || 'ابدأ المحادثة'}</p>
                </div>
              </button>
            ))
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          notifications.length === 0
            ? <p className={s.empty}>لا توجد إشعارات.</p>
            : notifications.map((n) => (
              <div key={n.id} className={`${s.notifCard} ${!n.is_read ? s.notifUnread : ''}`}>
                <span className={s.notifIcon}>{NOTIF_ICON[n.type] || '🔔'}</span>
                <div className={s.notifInfo}>
                  <p className={s.notifText}>{n.text || n.type}</p>
                  <p className={s.notifTime}>{new Date(n.created_at).toLocaleString('ar')}</p>
                </div>
                {n.video_thumbnail && (
                  <img src={n.video_thumbnail} alt="" className={s.notifThumb} />
                )}
              </div>
            ))
        )}

        {/* Live */}
        {activeTab === 'live' && (
          <>
            <button className={s.goLiveBtn} onClick={() => setShowStart(true)}>+ ابدأ بثًا مباشرًا</button>

            {showStart && (
              <div className={s.startBox}>
                <input
                  className={s.titleInput}
                  placeholder="عنوان البث…"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
                <div className={s.startActions}>
                  <button className={s.cancelBtn} onClick={() => setShowStart(false)}>إلغاء</button>
                  <button className={s.startBtn} onClick={startLive} disabled={starting || !title.trim()}>
                    {starting ? 'جاري البدء…' : '🔴 ابدأ'}
                  </button>
                </div>
              </div>
            )}

            <h3 className={s.sectionTitle}>يبثون الآن</h3>
            {streams.length === 0 ? (
              <p className={s.empty}>لا أحد يبث الآن.</p>
            ) : (
              streams.map((stream) => (
                <Link key={stream.id} to={`/live/${stream.id}`} className={s.streamCard}>
                  <div className={s.streamAvatar}>
                    {stream.host.avatar
                      ? <img src={stream.host.avatar} alt="" />
                      : <span>{stream.host.username[0].toUpperCase()}</span>
                    }
                    <span className={s.liveDot} />
                  </div>
                  <div className={s.streamInfo}>
                    <p className={s.streamHost}>@{stream.host.username}</p>
                    <p className={s.streamTitle}>{stream.title}</p>
                    <p className={s.streamViewers}>👁 {stream.viewers_count} يشاهد</p>
                  </div>
                </Link>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
