import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import PostCard from '../components/PostCard';
import styles from './Home.module.css';

export default function Explore() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [quoting, setQuoting] = useState(null);

  const fetchPosts = async (p = 1) => {
    try {
      const { data } = await api.get(`/posts/explore/?page=${p}`);
      setPosts((prev) => p === 1 ? data.results : [...prev, ...data.results]);
      setHasMore(!!data.next);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchPosts(1); }, []);

  const handleUpdate = (updated) => setPosts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
  const handleDelete = (id) => setPosts((prev) => prev.filter((p) => p.id !== id));

  return (
    <div>
      <div className={styles.header}><h2>Explore</h2></div>
      {loading ? (
        <div className={styles.loading}>Loading posts…</div>
      ) : posts.length === 0 ? (
        <div className={styles.empty}><p>No posts yet.</p></div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onQuote={(p) => setQuoting(p)}
            />
          ))}
          {hasMore && (
            <button className={styles.loadMore} onClick={() => { const n = page + 1; setPage(n); fetchPosts(n); }}>
              Load more
            </button>
          )}
        </>
      )}
    </div>
  );
}
