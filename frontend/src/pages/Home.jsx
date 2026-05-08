import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import PostForm from '../components/PostForm';
import PostCard from '../components/PostCard';
import TrendingBox from '../components/TrendingBox';
import styles from './Home.module.css';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [quoting, setQuoting] = useState(null);

  const fetchPosts = async (p = 1) => {
    try {
      const { data } = await api.get(`/posts/feed/?page=${p}`);
      setPosts((prev) => p === 1 ? data.results : [...prev, ...data.results]);
      setHasMore(!!data.next);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchPosts(1); }, []);

  const handleNewPost = (post) => setPosts((prev) => [post, ...prev]);
  const handleUpdate = (updated) => setPosts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
  const handleDelete = (id) => setPosts((prev) => prev.filter((p) => p.id !== id));

  return (
    <div>
      <div className={styles.header}><h2>Home</h2></div>
      <PostForm onPost={handleNewPost} quotedPost={quoting} onCancelQuote={() => setQuoting(null)} />
      <TrendingBox />
      {loading ? (
        <div className={styles.loading}>Loading your feed…</div>
      ) : posts.length === 0 ? (
        <div className={styles.empty}>
          <p>Your feed is empty.</p>
          <p>Follow some people to see their posts!</p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onQuote={(p) => { setQuoting(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
