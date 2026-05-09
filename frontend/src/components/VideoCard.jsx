import React from 'react';
import { useNavigate } from 'react-router-dom';
import s from './VideoCard.module.css';

export default function VideoCard({ video }) {
  const navigate = useNavigate();
  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : (n ?? 0);

  const username = video.author?.username || video.user?.username || '';
  const avatar = video.author?.avatar || video.user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'U')}&background=ff3366&color=fff&size=40`;

  return (
    <div className={s.card} onClick={() => navigate(`/video/${video.id}`)}>
      <div className={s.thumb}>
        {video.thumbnail
          ? <img src={video.thumbnail} alt="" className={s.media} />
          : <video src={video.video_file} className={s.media} muted />
        }
        <div className={s.overlay}>
          <span className={s.views}>▶ {fmt(video.views_count)}</span>
        </div>
      </div>
      <div className={s.info}>
        <img src={avatar} alt="" className={s.avatar} />
        <div className={s.text}>
          <span className={s.username}>@{username}</span>
          {video.caption && (
            <span className={s.caption}>
              {video.caption.length > 52 ? video.caption.slice(0, 52) + '…' : video.caption}
            </span>
          )}
        </div>
        <span className={s.likes}>♥ {fmt(video.likes_count)}</span>
      </div>
    </div>
  );
}
