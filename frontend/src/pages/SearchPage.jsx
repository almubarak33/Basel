import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import PostCard from '../components/PostCard';
import styles from './SearchPage.module.css';
import homeStyles from './Home.module.css';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef();

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await api.get(`/posts/search/?q=${encodeURIComponent(query)}`);
      setPosts(data.results || data);
    } catch { setPosts([]); } finally { setLoading(false); }
  };

  const handleUpdate = (updated) => setPosts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
  const handleDelete = (id) => setPosts((prev) => prev.filter((p) => p.id !== id));

  return (
    <div>
      <div className={styles.header}>
        <h2>Search</h2>
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, #hashtags…"
          />
          <button className={styles.btn} type="submit">Go</button>
        </form>
      </div>
      {loading ? (
        <div className={homeStyles.loading}>Searching…</div>
      ) : searched && posts.length === 0 ? (
        <div className={homeStyles.empty}><p>No results for "{query}"</p></div>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} onUpdate={handleUpdate} onDelete={handleDelete} onQuote={() => {}} />
        ))
      )}
    </div>
  );
}
