import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', password2: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password2) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(form.username, form.email, form.password, form.password2);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msg = Object.values(data).flat().join(' ');
        setError(msg);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.logo}>SayHi</h1>
        <p className={styles.tagline}>Join the conversation today</p>
        <h2 className={styles.title}>Create your account</h2>
        {error && <div className={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            className={styles.input}
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <input
            className={styles.input}
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className={styles.input}
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <input
            className={styles.input}
            type="password"
            placeholder="Confirm Password"
            value={form.password2}
            onChange={(e) => setForm({ ...form, password2: e.target.value })}
            required
          />
          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className={styles.switch}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
