import React, { useState, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import styles from './PostForm.module.css';

export default function PostForm({ onPost, quotedPost = null, onCancelQuote }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();
  const maxLen = 280;

  const avatarUrl = user?.avatar ||
    `https://ui-avatars.com/api/?name=${user?.username}&background=7c3aed&color=fff&size=48`;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    setMediaFile(file);
    setMediaType(isVideo ? 'video' : 'image');
    setMediaPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaType(null);
    setMediaPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !mediaFile && !quotedPost) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      if (mediaFile) {
        if (mediaType === 'video') formData.append('video', mediaFile);
        else formData.append('image', mediaFile);
      }
      if (quotedPost) formData.append('quoted_post_id', quotedPost.id);
      const { data } = await api.post('/posts/create/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onPost(data);
      setContent('');
      removeMedia();
      if (onCancelQuote) onCancelQuote();
    } finally {
      setLoading(false);
    }
  };

  const remaining = maxLen - content.length;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <img src={avatarUrl} alt={user?.username} className={styles.avatar} />
      <div className={styles.right}>
        <textarea
          className={styles.textarea}
          placeholder={quotedPost ? 'Add a comment...' : "What's on your mind?"}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={maxLen}
          rows={3}
        />

        {quotedPost && (
          <div className={styles.quotedPreview}>
            <div className={styles.quotedPreviewHeader}>
              <span>Quoting @{quotedPost.author.username}</span>
              {onCancelQuote && (
                <button type="button" className={styles.cancelQuote} onClick={onCancelQuote}>✕</button>
              )}
            </div>
            <p className={styles.quotedPreviewText}>{quotedPost.content?.slice(0, 100)}{quotedPost.content?.length > 100 ? '…' : ''}</p>
          </div>
        )}

        {mediaPreview && (
          <div className={styles.previewWrap}>
            {mediaType === 'video' ? (
              <video src={mediaPreview} className={styles.preview} controls />
            ) : (
              <img src={mediaPreview} alt="preview" className={styles.preview} />
            )}
            <button type="button" className={styles.removeMedia} onClick={removeMedia}>✕</button>
          </div>
        )}

        <div className={styles.footer}>
          <label className={styles.mediaLabel} title="Photo or Video">
            📎
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={handleFileChange}
            />
          </label>
          <span className={`${styles.counter} ${remaining < 20 ? styles.warn : ''} ${remaining < 0 ? styles.danger : ''}`}>
            {remaining}
          </span>
          <button
            className={styles.submitBtn}
            type="submit"
            disabled={loading || (!content.trim() && !mediaFile && !quotedPost) || remaining < 0}
          >
            {loading ? '…' : 'SayHi!'}
          </button>
        </div>
      </div>
    </form>
  );
}
