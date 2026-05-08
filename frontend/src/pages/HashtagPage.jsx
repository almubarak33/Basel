import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import s from './SearchPage.module.css';
import ps from './ProfilePage.module.css';

export default function HashtagPage() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/videos/hashtag/${tag}/`).then(({ data }) => setVideos(data.results || data)).finally(() => setLoading(false));
  }, [tag]);

  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n ?? 0;

  return (
    <div style={{ height: '100vh', background: '#000', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #111' }}>
        <button style={{ color: '#fff', fontSize: '1.2rem' }} onClick={() => navigate(-1)}>←</button>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>#{tag}</h2>
          <p style={{ fontSize: '.75rem', color: '#666' }}>{videos.length} videos</p>
        </div>
      </div>
      {loading ? (
        <div className={s.loader} style={{ marginTop: 40 }}><div className={s.spinner} /></div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '2px' }}>
          <div className={s.grid}>
            {videos.map((v) => (
              <Link key={v.id} to={`/video/${v.id}`} className={s.thumb}>
                {v.thumbnail ? <img src={v.thumbnail} alt="" className={s.thumbImg} /> : <video src={v.video_file} className={s.thumbImg} muted />}
                <div className={s.thumbOverlay}>▶ {fmt(v.views_count)}</div>
              </Link>
            ))}
          </div>
          {videos.length === 0 && <p className={s.empty}>No videos for #{tag}</p>}
        </div>
      )}
    </div>
  );
}
