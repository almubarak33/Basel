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
    <div style={{ height: '100vh', background: '#000', position: 'relative' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          position: 'absolute', top: 14, left: 14, zIndex: 20,
          background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
          fontSize: '1.3rem', width: 38, height: 38, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        ←
      </button>
      <VideoItem
        video={video}
        isActive
        onUpdate={setVideo}
        onDelete={() => navigate('/')}
        onNext={() => navigate(-1)}
      />
    </div>
  );
}
