import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import s from './SearchPage.module.css';

export default function SearchPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('videos'); // videos | users

  useEffect(() => {
    api.get('/videos/trending/').then(({ data }) => setTrending(data.results || data)).catch(() => {});
  }, []);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const [vRes, uRes] = await Promise.all([
        api.get(`/videos/search/?q=${encodeURIComponent(query)}`),
        api.get(`/users/search/?q=${encodeURIComponent(query)}`).catch(() => ({ data: [] })),
      ]);
      setResults(vRes.data.results || vRes.data);
      setUsers(uRes.data.results || uRes.data);
    } catch {
      setResults([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n ?? 0;
  };

  const hasResults = results.length > 0 || users.length > 0;

  return (
    <div className={s.page}>
      <form className={s.searchBar} onSubmit={handleSearch}>
        <span className={s.searchIcon}>🔍</span>
        <input
          className={s.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
        />
        {query && (
          <button type="button" className={s.clear} onClick={() => { setQuery(''); setResults([]); setUsers([]); }}>
            ✕
          </button>
        )}
      </form>

      {/* Tabs when results exist */}
      {query && hasResults && (
        <div className={s.tabs}>
          <button className={`${s.tabBtn} ${tab === 'videos' ? s.tabActive : ''}`} onClick={() => setTab('videos')}>
            {t('search.videos_tab')} ({results.length})
          </button>
          <button className={`${s.tabBtn} ${tab === 'users' ? s.tabActive : ''}`} onClick={() => setTab('users')}>
            {t('search.users_tab')} ({users.length})
          </button>
        </div>
      )}

      <div className={s.body}>
        {loading && <div className={s.loader}><div className={s.spinner} /></div>}

        {!loading && hasResults && tab === 'videos' && (
          <div className={s.grid}>
            {results.map((v) => (
              <Link key={v.id} to={`/video/${v.id}`} className={s.thumb}>
                {v.thumbnail
                  ? <img src={v.thumbnail} alt="" className={s.thumbImg} />
                  : v.slides?.[0]?.image
                    ? <img src={v.slides[0].image} alt="" className={s.thumbImg} />
                    : <video src={v.video_file} className={s.thumbImg} muted />
                }
                <div className={s.thumbOverlay}>▶ {fmt(v.views_count)}</div>
              </Link>
            ))}
          </div>
        )}

        {!loading && hasResults && tab === 'users' && (
          <div className={s.userList}>
            {users.map((u) => (
              <Link key={u.id} to={`/profile/${u.username}`} className={s.userRow}>
                <img
                  src={u.avatar || `https://ui-avatars.com/api/?name=${u.username}&background=fe2c55&color=fff&size=48`}
                  alt=""
                  className={s.userAvatar}
                />
                <div>
                  <div className={s.userName}>{u.first_name || u.username}</div>
                  <div className={s.userHandle}>@{u.username}</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && query && !hasResults && (
          <p className={s.empty}>{t('search.no_results', { query })}</p>
        )}

        {!query && !loading && (
          <>
            <h3 className={s.sectionTitle}>{t('search.trending')}</h3>
            <div className={s.tags}>
              {trending.map((tag) => (
                <Link key={tag.id} to={`/hashtag/${tag.name}`} className={s.tag}>
                  <span className={s.hash}>#</span>
                  <div>
                    <div className={s.tagName}>{tag.name}</div>
                    <div className={s.tagCount}>{fmt(tag.videos_count)} {t('search.videos_count')}</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
