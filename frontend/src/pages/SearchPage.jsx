import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import s from './SearchPage.module.css';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/videos/trending/').then(({ data }) => setTrending(data.results || data)).catch(() => {});
  }, []);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/videos/search/?q=${encodeURIComponent(query)}`);
      setResults(data.results || data);
    } catch { setResults([]); } finally { setLoading(false); }
  };

  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n ?? 0;

  return (
    <div className={s.page}>
      <form className={s.searchBar} onSubmit={handleSearch}>
        <span className={s.searchIcon}>🔍</span>
        <input
          className={s.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search videos, #hashtags…"
          autoFocus
        />
        {query && <button type="button" className={s.clear} onClick={() => { setQuery(''); setResults([]); }}>✕</button>}
      </form>

      <div className={s.body}>
        {results.length > 0 ? (
          <div className={s.grid}>
            {results.map((v) => (
              <Link key={v.id} to={`/video/${v.id}`} className={s.thumb}>
                {v.thumbnail
                  ? <img src={v.thumbnail} alt="" className={s.thumbImg} />
                  : <video src={v.video_file} className={s.thumbImg} muted />
                }
                <div className={s.thumbOverlay}>▶ {fmt(v.views_count)}</div>
              </Link>
            ))}
          </div>
        ) : query && !loading ? (
          <p className={s.empty}>No results for "{query}"</p>
        ) : (
          <>
            <h3 className={s.sectionTitle}>🔥 Trending</h3>
            <div className={s.tags}>
              {trending.map((tag) => (
                <Link key={tag.id} to={`/hashtag/${tag.name}`} className={s.tag}>
                  <span className={s.hash}>#</span>
                  <div>
                    <div className={s.tagName}>{tag.name}</div>
                    <div className={s.tagCount}>{fmt(tag.videos_count)} videos</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
        {loading && <div className={s.loader}><div className={s.spinner} /></div>}
      </div>
    </div>
  );
}
