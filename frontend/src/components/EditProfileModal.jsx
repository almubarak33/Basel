import React, { useState } from 'react';
import api from '../api/axios';
import styles from './EditProfileModal.module.css';

export default function EditProfileModal({ profile, onSave, onClose }) {
  const [form, setForm] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    bio: profile.bio || '',
    location: profile.location || '',
    website: profile.website || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.patch('/auth/me/', form);
      onSave(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <button className={styles.close} onClick={onClose}>✕</button>
          <h3>Edit Profile</h3>
          <button className={styles.saveBtn} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>First name</label>
            <input
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              maxLength={30}
            />
          </div>
          <div className={styles.field}>
            <label>Last name</label>
            <input
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              maxLength={30}
            />
          </div>
          <div className={styles.field}>
            <label>Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              maxLength={160}
              rows={3}
            />
          </div>
          <div className={styles.field}>
            <label>Location</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              maxLength={100}
            />
          </div>
          <div className={styles.field}>
            <label>Website</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
