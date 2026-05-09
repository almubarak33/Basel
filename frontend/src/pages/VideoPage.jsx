import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import VideoItem from '../components/VideoItem';
import s from './VideoPage.module.css';

export default function VideoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);

  useEffect(() => {
    api.get(`/videos/${id}/`).then(({ data }) => setVideo(data)).catch(() => navigate('/'));
  }, [id]);

  if (!video) return <div className={s.loading}><div className={s.spinner} /></div>;

  return (
    <div style={{ height: '100vh', background: '#000' }}>
      <VideoItem
        video={video}
        isActive
        onUpdate={setVideo}
        onDelete={() => navigate('/')}
        showFull
      />
    </div>
  );
}
