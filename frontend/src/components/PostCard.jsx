import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import styles from './PostCard.module.css';

export default function PostCard({ post, onUpdate, onDelete, showFull }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [likeLoading, setLikeLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const avatarUrl = post.author.avatar ||
    `https://ui-avatars.com/api/?name=${post.author.username}&background=1DA1F2&color=fff&size=48`;

  const handleLike = async (e) => {
    e.stopPropagation();
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      if (post.is_liked) {
        const { data } = await api.delete(`/posts/${post.id}/unlike/`);
        onUpdate({ ...post, is_liked: false, likes_count: data.likes_count });
      } else {
        const { data } = await api.post(`/posts/${post.id}/like/`);
        onUpdate({ ...post, is_liked: true, likes_count: data.likes_count });
      }
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this post?')) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/posts/${post.id}/`);
      onDelete(post.id);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCardClick = () => {
    if (!showFull) navigate(`/post/${post.id}`);
  };

  return (
    <div className={styles.card} onClick={handleCardClick}>
      <img src={avatarUrl} alt={post.author.username} className={styles.avatar} />
      <div className={styles.body}>
        <div className={styles.header}>
          <Link
            to={`/profile/${post.author.username}`}
            className={styles.authorName}
            onClick={(e) => e.stopPropagation()}
          >
            {post.author.first_name || post.author.username}
          </Link>
          <span className={styles.handle}>@{post.author.username}</span>
          <span className={styles.dot}>·</span>
          <span className={styles.time}>
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </span>
          {user?.username === post.author.username && (
            <button
              className={styles.deleteBtn}
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? '...' : '✕'}
            </button>
          )}
        </div>
        <p className={styles.content}>{post.content}</p>
        {post.image && <img src={post.image} alt="post" className={styles.postImage} />}
        <div className={styles.actions}>
          <button
            className={`${styles.actionBtn} ${post.is_liked ? styles.liked : ''}`}
            onClick={handleLike}
            disabled={likeLoading}
          >
            <span>{post.is_liked ? '♥' : '♡'}</span>
            <span>{post.likes_count}</span>
          </button>
          <button
            className={styles.actionBtn}
            onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`); }}
          >
            <span>💬</span>
            <span>{post.comments_count}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
