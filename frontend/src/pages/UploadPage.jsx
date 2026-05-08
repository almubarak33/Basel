import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import s from './UploadPage.module.css';

export default function UploadPage() {
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [thumb, setThumb] = useState(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setVideo(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleThumb = (e) => setThumb(e.target.files[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!video) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('video_file', video);
      fd.append('caption', caption);
      if (thumb) fd.append('thumbnail', thumb);
      await api.post('/videos/upload/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / e.total)),
      });
      navigate('/');
    } finally { setLoading(false); setProgress(0); }
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}>✕</button>
        <h2>Upload Video</h2>
        <div />
      </div>

      <div className={s.body}>
        {!preview ? (
          <div className={s.dropZone} onClick={() => fileRef.current?.click()}>
            <span className={s.uploadIcon}>📹</span>
            <p className={s.dropText}>Tap to select video</p>
            <p className={s.dropSub}>MP4, MOV up to 500MB</p>
            <input ref={fileRef} type="file" accept="video/*" hidden onChange={handleFile} />
          </div>
        ) : (
          <div className={s.previewWrap}>
            <video src={preview} className={s.preview} controls />
            <button className={s.changeVideo} onClick={() => { setVideo(null); setPreview(null); }}>
              Change video
            </button>
          </div>
        )}

        <form className={s.form} onSubmit={handleSubmit}>
          <textarea
            className={s.caption}
            placeholder="Write a caption… #hashtags"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={300}
            rows={3}
          />
          <span className={s.captionCount}>{300 - caption.length}</span>

          <label className={s.thumbLabel}>
            🖼 Add thumbnail (optional)
            <input type="file" accept="image/*" hidden onChange={handleThumb} />
          </label>
          {thumb && <p className={s.thumbName}>✓ {thumb.name}</p>}

          {loading && (
            <div className={s.progressWrap}>
              <div className={s.progressBar} style={{ width: `${progress}%` }} />
              <span>{progress}%</span>
            </div>
          )}

          <button className={s.submitBtn} type="submit" disabled={!video || loading}>
            {loading ? 'Uploading…' : 'Post Video'}
          </button>
        </form>
      </div>
    </div>
  );
}
