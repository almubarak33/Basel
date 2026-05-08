import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import s from './InboxPage.module.css';

export default function InboxPage() {
  const [streams, setStreams] = useState([]);
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [title, setTitle] = useState('');
  const [showStart, setShowStart] = useState(false);

  useEffect(() => {
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

  return (
    <div className={s.page}>
      <div className={s.header}><h2>Live 🔴</h2></div>
      <div className={s.body}>
        <button className={s.goLiveBtn} onClick={() => setShowStart(true)}>
          + Go Live
        </button>

        {showStart && (
          <div className={s.startBox}>
            <input
              className={s.titleInput}
              placeholder="Stream title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <div className={s.startActions}>
              <button className={s.cancelBtn} onClick={() => setShowStart(false)}>Cancel</button>
              <button className={s.startBtn} onClick={startLive} disabled={starting || !title.trim()}>
                {starting ? 'Starting…' : '🔴 Start'}
              </button>
            </div>
          </div>
        )}

        <h3 className={s.sectionTitle}>Live Now</h3>
        {streams.length === 0 ? (
          <p className={s.empty}>No one is live right now.</p>
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
                <p className={s.streamViewers}>👁 {stream.viewers_count} watching</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
