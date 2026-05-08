import React, { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import styles from './CommentForm.module.css';

export default function CommentForm({ postId, onComment }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const avatarUrl = user?.avatar ||
    `https://ui-avatars.com/api/?name=${user?.username}&background=1DA1F2&color=fff&size=40`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/posts/${postId}/comments/`, { content });
      onComment(data);
      setContent('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <img src={avatarUrl} alt={user?.username} className={styles.avatar} />
      <div className={styles.right}>
        <textarea
          className={styles.textarea}
          placeholder="Write a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          maxLength={280}
        />
        <div className={styles.footer}>
          <button className={styles.btn} type="submit" disabled={loading || !content.trim()}>
            {loading ? '...' : 'Reply'}
          </button>
        </div>
      </div>
    </form>
  );
}
