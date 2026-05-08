import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import PostCard from '../components/PostCard';
import styles from './Home.module.css';
import pageStyles from './HashtagPage.module.css';

export default function HashtagPage() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quoting, setQuoting] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/posts/hashtag/${tag}/`)
      .then(({ data }) => setPosts(data.results || data))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [tag]);

  const handleUpdate = (updated) => setPosts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
  const handleDelete = (id) => setPosts((prev) => prev.filter((p) => p.id !== id));

  return (
    <div>
      <div className={pageStyles.header}>
        <button className={pageStyles.back} onClick={() => navigate(-1)}>←</button>
        <div>
          <h2 className={pageStyles.tag}>#{tag}</h2>
          <p className={pageStyles.count}>{posts.length} posts</p>
        </div>
      </div>
      {loading ? (
        <div className={styles.loading}>Loading #{tag}…</div>
      ) : posts.length === 0 ? (
        <div className={styles.empty}><p>No posts with #{tag} yet.</p></div>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} onUpdate={handleUpdate} onDelete={handleDelete} onQuote={setQuoting} />
        ))
      )}
    </div>
  );
}
