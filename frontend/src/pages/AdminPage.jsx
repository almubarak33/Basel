import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import s from './AdminPage.module.css';

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tab, setTab] = useState('reports'); // reports | users | stats
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [userQuery, setUserQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Guard: only staff
  useEffect(() => {
    if (user && !user.is_staff) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    if (tab === 'reports') loadReports();
    if (tab === 'stats') loadStats();
    if (tab === 'users') loadUsers('');
  }, [tab]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/videos/admin/reports/');
      setReports(data);
    } catch {} finally { setLoading(false); }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/videos/admin/stats/');
      setStats(data);
    } catch {} finally { setLoading(false); }
  };

  const loadUsers = async (q) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/videos/admin/users/${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      setUsers(data);
    } catch {} finally { setLoading(false); }
  };

  const deleteVideo = async (id) => {
    if (!window.confirm(t('admin.confirm_delete_video'))) return;
    await api.post(`/videos/admin/reports/${id}/delete/`);
    setReports((r) => r.filter((x) => x.id !== id));
  };

  const dismissReports = async (id) => {
    await api.post(`/videos/admin/reports/${id}/dismiss/`);
    setReports((r) => r.filter((x) => x.id !== id));
  };

  const toggleBan = async (userId, isActive) => {
    const msg = isActive ? t('admin.confirm_ban') : t('admin.confirm_unban');
    if (!window.confirm(msg)) return;
    const { data } = await api.post(`/videos/admin/users/${userId}/toggle-ban/`);
    setUsers((u) => u.map((x) => x.id === userId ? { ...x, is_active: data.is_active } : x));
  };

  const TABS = [
    { key: 'reports', label: t('admin.reports_tab') },
    { key: 'users',   label: t('admin.users_tab') },
    { key: 'stats',   label: t('admin.stats_tab') },
  ];

  return (
    <div className={s.page}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}>←</button>
        <h2 className={s.title}>{t('admin.title')}</h2>
      </div>

      <div className={s.tabs}>
        {TABS.map((tb) => (
          <button
            key={tb.key}
            className={`${s.tabBtn} ${tab === tb.key ? s.tabActive : ''}`}
            onClick={() => setTab(tb.key)}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className={s.body}>
        {loading && <div className={s.loader}><div className={s.spinner} /></div>}

        {/* ── Reports ── */}
        {!loading && tab === 'reports' && (
          reports.length === 0
            ? <p className={s.empty}>{t('admin.no_reports')}</p>
            : reports.map((r) => (
              <div key={r.id} className={`${s.reportCard} ${r.is_flagged ? s.flagged : ''}`}>
                <div className={s.reportMeta}>
                  {r.thumbnail && <img src={r.thumbnail} alt="" className={s.reportThumb} />}
                  <div className={s.reportInfo}>
                    <div className={s.reportAuthor}>@{r.author}</div>
                    <div className={s.reportCaption}>{r.caption || '—'}</div>
                    <div className={s.reportCount}>
                      {r.report_count} {t('admin.reports_count')} · {r.reasons.join(', ')}
                    </div>
                  </div>
                </div>
                <div className={s.reportActions}>
                  <button className={s.dangerBtn} onClick={() => deleteVideo(r.id)}>
                    {t('admin.delete_video')}
                  </button>
                  <button className={s.dismissBtn} onClick={() => dismissReports(r.id)}>
                    {t('admin.dismiss')}
                  </button>
                </div>
              </div>
            ))
        )}

        {/* ── Users ── */}
        {!loading && tab === 'users' && (
          <>
            <form className={s.searchRow} onSubmit={(e) => { e.preventDefault(); loadUsers(userQuery); }}>
              <input
                className={s.searchInput}
                placeholder={t('admin.search_users')}
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
              />
              <button className={s.searchBtn} type="submit">🔍</button>
            </form>
            {users.map((u) => (
              <div key={u.id} className={s.userRow}>
                <div className={s.userInfo}>
                  <div className={s.userUsername}>@{u.username}</div>
                  <div className={s.userMeta}>{u.email} · {u.videos_count} {t('admin.videos')}</div>
                  {!u.is_active && <span className={s.bannedBadge}>{t('admin.banned')}</span>}
                  {u.is_staff && <span className={s.staffBadge}>{t('admin.staff')}</span>}
                </div>
                {!u.is_staff && (
                  <button
                    className={u.is_active ? s.banBtn : s.unbanBtn}
                    onClick={() => toggleBan(u.id, u.is_active)}
                  >
                    {u.is_active ? t('admin.ban') : t('admin.unban')}
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {/* ── Stats ── */}
        {!loading && tab === 'stats' && stats && (
          <div className={s.statsGrid}>
            <StatCard label={t('admin.stat_users')} value={stats.users} icon="👤" />
            <StatCard label={t('admin.stat_videos')} value={stats.videos} icon="🎬" />
            <StatCard label={t('admin.stat_reports')} value={stats.reports} icon="🚩" />
            <StatCard label={t('admin.stat_flagged')} value={stats.flagged} icon="⚠️" />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div style={{
      background: '#111', border: '1px solid #1e1e1e', borderRadius: 14,
      padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }}>
      <span style={{ fontSize: '2rem' }}>{icon}</span>
      <span style={{ fontSize: '1.8rem', fontWeight: 900 }}>{value?.toLocaleString()}</span>
      <span style={{ fontSize: '.75rem', color: '#666', textAlign: 'center' }}>{label}</span>
    </div>
  );
}
