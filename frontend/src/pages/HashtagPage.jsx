import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import s from './HashtagPage.module.css';

export default function HashtagPage() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/videos/hashtag/${tag}/`)
      .then(({ data }) => setVideos(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tag]);

  const fmt = (n) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n ?? 0;
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}>←</button>
        <div className={s.headerInfo}>
          <h2 className={s.tagName}>#{tag}</h2>
          <p className={s.tagCount}>{fmt(videos.length)} {t('hashtag.videos_count')}</p>
        </div>
      </div>

      {loading ? (
        <div className={s.loader}><div className={s.spinner} /></div>
      ) : videos.length === 0 ? (
        <p className={s.empty}>{t('search.no_results', { query: `#${tag}` })}</p>
      ) : (
        <div className={s.grid}>
          {videos.map((v) => (
            <Link key={v.id} to={`/video/${v.id}`} className={s.thumb}>
              {v.thumbnail
                ? <img src={v.thumbnail} alt="" className={s.thumbImg} />
                : v.slides?.[0]?.image
                  ? <img src={v.slides[0].image} alt="" className={s.thumbImg} />
                  : <video src={v.video_file} className={s.thumbImg} muted />
              }
              <div className={s.thumbOverlay}>
                <span>▶ {fmt(v.views_count)}</span>
                {v.post_type === 'photo' && <span className={s.photoBadge}>📸</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
