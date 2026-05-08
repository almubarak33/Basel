import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import styles from './TrendingBox.module.css';

export default function TrendingBox() {
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    api.get('/posts/trending/').then(({ data }) => setTrends(data.results || data)).catch(() => {});
  }, []);

  if (!trends.length) return null;

  return (
    <div className={styles.box}>
      <h4 className={styles.title}>Trending</h4>
      {trends.map((tag) => (
        <Link key={tag.id} to={`/hashtag/${tag.name}`} className={styles.tag}>
          <span className={styles.hash}>#</span>
          <span className={styles.name}>{tag.name}</span>
          <span className={styles.count}>{tag.posts_count} posts</span>
        </Link>
      ))}
    </div>
  );
}
