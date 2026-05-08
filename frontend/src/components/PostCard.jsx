import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import styles from './PostCard.module.css';

function renderContent(content) {
  if (!content) return null;
  const parts = content.split(/(#\w+)/g);
  return parts.map((part, i) =>
    part.startsWith('#') ? (
      <Link
        key={i}
        to={`/hashtag/${part.slice(1).toLowerCase()}`}
        className={styles.hashtag}
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </Link>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function QuotedPostCard({ post }) {
  const navigate = useNavigate();
  const avatarUrl = post.author.avatar ||
    `https://ui-avatars.com/api/?name=${post.author.username}&background=2a2a3e&color=aaa&size=32`;
  return (
    <div
      className={styles.quotedCard}
      onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`); }}
    >
      <div className={styles.quotedHeader}>
        <img src={avatarUrl} alt={post.author.username} className={styles.quotedAvatar} />
        <span className={styles.quotedName}>{post.author.first_name || post.author.username}</span>
        <span className={styles.quotedHandle}>@{post.author.username}</span>
      </div>
      <p className={styles.quotedContent}>{renderContent(post.content)}</p>
      {post.image && <img src={post.image} alt="" className={styles.quotedImage} />}
      {post.video && (
        <video src={post.video} className={styles.quotedImage} controls onClick={(e) => e.stopPropagation()} />
      )}
    </div>
  );
}

export default function PostCard({ post, onUpdate, onDelete, showFull, onQuote }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [likeLoading, setLikeLoading] = useState(false);
  const [repostLoading, setRepostLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const avatarUrl = post.author.avatar ||
    `https://ui-avatars.com/api/?name=${post.author.username}&background=7c3aed&color=fff&size=48`;

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
    } finally { setLikeLoading(false); }
  };

  const handleRepost = async (e) => {
    e.stopPropagation();
    if (repostLoading) return;
    setRepostLoading(true);
    try {
      if (post.is_reposted) {
        const { data } = await api.delete(`/posts/${post.id}/unrepost/`);
        onUpdate({ ...post, is_reposted: false, reposts_count: data.reposts_count });
      } else {
        const { data } = await api.post(`/posts/${post.id}/repost/`);
        onUpdate({ ...post, is_reposted: true, reposts_count: data.reposts_count });
      }
    } finally { setRepostLoading(false); }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this post?')) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/posts/${post.id}/`);
      onDelete(post.id);
    } finally { setDeleteLoading(false); }
  };

  const handleCardClick = () => { if (!showFull) navigate(`/post/${post.id}`); };

  return (
    <div className={styles.card} onClick={handleCardClick}>
      <Link to={`/profile/${post.author.username}`} onClick={(e) => e.stopPropagation()}>
        <img src={avatarUrl} alt={post.author.username} className={styles.avatar} />
      </Link>
      <div className={styles.body}>
        <div className={styles.header}>
          <Link to={`/profile/${post.author.username}`} className={styles.authorName} onClick={(e) => e.stopPropagation()}>
            {post.author.first_name
              ? `${post.author.first_name} ${post.author.last_name || ''}`.trim()
              : post.author.username}
          </Link>
          <span className={styles.handle}>@{post.author.username}</span>
          <span className={styles.dot}>·</span>
          <span className={styles.time}>
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </span>
          {user?.username === post.author.username && (
            <button className={styles.deleteBtn} onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? '…' : '✕'}
            </button>
          )}
        </div>

        {post.content && <p className={styles.content}>{renderContent(post.content)}</p>}

        {post.image && <img src={post.image} alt="post" className={styles.media} />}

        {post.video && (
          <video
            src={post.video}
            className={styles.media}
            controls
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {post.quoted_post && <QuotedPostCard post={post.quoted_post} />}

        <div className={styles.actions}>
          <button
            className={`${styles.actionBtn} ${post.is_liked ? styles.liked : ''}`}
            onClick={handleLike}
            disabled={likeLoading}
          >
            <span className={styles.actionIcon}>{post.is_liked ? '♥' : '♡'}</span>
            <span>{post.likes_count}</span>
          </button>

          <button
            className={styles.actionBtn}
            onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`); }}
          >
            <span className={styles.actionIcon}>💬</span>
            <span>{post.comments_count}</span>
          </button>

          <button
            className={`${styles.actionBtn} ${post.is_reposted ? styles.reposted : ''}`}
            onClick={handleRepost}
            disabled={repostLoading}
          >
            <span className={styles.actionIcon}>🔁</span>
            <span>{post.reposts_count}</span>
          </button>

          {onQuote && (
            <button
              className={styles.actionBtn}
              onClick={(e) => { e.stopPropagation(); onQuote(post); }}
            >
              <span className={styles.actionIcon}>🗨</span>
              <span>{post.quotes_count}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
