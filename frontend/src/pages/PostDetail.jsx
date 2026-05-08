import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import PostCard from '../components/PostCard';
import CommentForm from '../components/CommentForm';
import CommentItem from '../components/CommentItem';
import styles from './PostDetail.module.css';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/posts/${id}/`),
      api.get(`/posts/${id}/comments/`),
    ]).then(([postRes, commentsRes]) => {
      setPost(postRes.data);
      setComments(commentsRes.data.results || commentsRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const handlePostUpdate = (updated) => setPost(updated);
  const handlePostDelete = () => navigate('/');
  const handleNewComment = (comment) => setComments((prev) => [...prev, comment]);

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (!post) return <div className={styles.loading}>Post not found.</div>;

  return (
    <div>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)}>← Back</button>
        <h2>Post</h2>
      </div>
      <PostCard post={post} onUpdate={handlePostUpdate} onDelete={handlePostDelete} showFull />
      <CommentForm postId={id} onComment={handleNewComment} />
      <div className={styles.comments}>
        {comments.map((c) => <CommentItem key={c.id} comment={c} />)}
      </div>
    </div>
  );
}
