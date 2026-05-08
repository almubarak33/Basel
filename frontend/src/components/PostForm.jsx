import React, { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import styles from './PostForm.module.css';

export default function PostForm({ onPost }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const maxLen = 280;

  const avatarUrl = user?.avatar ||
    `https://ui-avatars.com/api/?name=${user?.username}&background=1DA1F2&color=fff&size=48`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      if (image) formData.append('image', image);
      const { data } = await api.post('/posts/create/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onPost(data);
      setContent('');
      setImage(null);
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
          placeholder="What's happening?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={maxLen}
          rows={3}
        />
        <div className={styles.footer}>
          <label className={styles.imageLabel}>
            📷
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setImage(e.target.files[0])}
            />
          </label>
          {image && <span className={styles.imageName}>{image.name}</span>}
          <span className={`${styles.counter} ${remaining < 20 ? styles.warn : ''}`}>
            {remaining}
          </span>
          <button
            className={styles.submitBtn}
            type="submit"
            disabled={loading || !content.trim()}
          >
            {loading ? '...' : 'SayHi!'}
          </button>
        </div>
      </div>
    </form>
  );
}
