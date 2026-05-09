import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import s from './SettingsPage.module.css';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();

  const { t } = useTranslation();
  const [tab, setTab] = useState('profile'); // profile | account | privacy
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Profile fields
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const avatarRef = useRef();

  // Password fields
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const flash = (text, isError = false) => {
    if (isError) setError(text);
    else setMsg(text);
    setTimeout(() => { setMsg(''); setError(''); }, 3000);
  };

  const handleAvatarChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData();
      form.append('first_name', firstName);
      form.append('bio', bio);
      if (avatarFile) form.append('avatar', avatarFile);
      const { data } = await api.patch('/auth/me/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(data);
      flash(t('settings.profile_saved'));
    } catch {
      flash(t('settings.save_failed'), true);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) { flash(t('settings.password_mismatch'), true); return; }
    if (newPass.length < 8) { flash(t('settings.password_too_short'), true); return; }
    setSaving(true);
    try {
      await api.post('/auth/change-password/', { old_password: oldPass, new_password: newPass });
      setOldPass(''); setNewPass(''); setConfirmPass('');
      flash(t('settings.password_changed'));
    } catch (err) {
      flash(err.response?.data?.error || t('settings.password_wrong'), true);
    } finally {
      setSaving(false);
    }
  };

  const togglePrivacy = async () => {
    const newVal = !user?.is_private;
    try {
      const { data } = await api.patch('/auth/me/', { is_private: newVal });
      updateUser(data);
      flash(newVal ? t('settings.now_private') : t('settings.now_public'));
    } catch {
      flash(t('settings.update_failed'), true);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm(t('settings.confirm_delete_1'))) return;
    if (!window.confirm(t('settings.confirm_delete_2'))) return;
    try {
      await api.delete('/auth/me/');
      logout();
      navigate('/login');
    } catch {
      flash(t('settings.delete_failed'), true);
    }
  };

  const avatarUrl = avatarPreview ||
    `https://ui-avatars.com/api/?name=${user?.username}&background=fe2c55&color=fff&size=128`;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}>←</button>
        <span className={s.title}>{t('settings.title')}</span>
        <div style={{ width: 32 }} />
      </div>

      {/* Flash messages */}
      {msg && <div className={s.flash}>{msg}</div>}
      {error && <div className={s.flashError}>{error}</div>}

      {/* Tabs */}
      <div className={s.tabs}>
        <button className={`${s.tab} ${tab === 'profile' ? s.tabActive : ''}`} onClick={() => setTab('profile')}>{t('settings.profile_tab')}</button>
        <button className={`${s.tab} ${tab === 'account' ? s.tabActive : ''}`} onClick={() => setTab('account')}>{t('settings.account_tab')}</button>
        <button className={`${s.tab} ${tab === 'privacy' ? s.tabActive : ''}`} onClick={() => setTab('privacy')}>{t('settings.privacy_tab')}</button>
      </div>

      <div className={s.body}>
        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <form className={s.form} onSubmit={saveProfile}>
            {/* Avatar */}
            <div className={s.avatarSection} onClick={() => avatarRef.current?.click()}>
              <img src={avatarUrl} alt="" className={s.avatar} />
              <div className={s.avatarOverlay}>{t('settings.change_photo')}</div>
              <input ref={avatarRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
            </div>

            <div className={s.field}>
              <label className={s.label}>{t('settings.display_name')}</label>
              <input
                className={s.input}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('settings.display_name_placeholder')}
                maxLength={50}
              />
            </div>

            <div className={s.field}>
              <label className={s.label}>{t('settings.bio')}</label>
              <textarea
                className={s.textarea}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('settings.bio_placeholder')}
                maxLength={150}
                rows={3}
              />
              <span className={s.counter}>{bio.length}/150</span>
            </div>

            <div className={s.field}>
              <label className={s.label}>{t('settings.username')}</label>
              <div className={s.readOnly}>@{user?.username}</div>
              <span className={s.hint}>{t('settings.username_change_hint')}</span>
            </div>

            <div className={s.field}>
              <label className={s.label}>{t('settings.email')}</label>
              <div className={s.readOnly}>{user?.email}</div>
            </div>

            <button className={s.saveBtn} type="submit" disabled={saving}>
              {saving ? t('settings.saving') : t('settings.save_changes')}
            </button>
          </form>
        )}

        {/* ── ACCOUNT TAB ── */}
        {tab === 'account' && (
          <div className={s.form}>
            <h3 className={s.sectionTitle}>{t('settings.change_password')}</h3>
            <form onSubmit={changePassword}>
              <div className={s.field}>
                <label className={s.label}>{t('settings.current_password')}</label>
                <input
                  className={s.input}
                  type="password"
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className={s.field}>
                <label className={s.label}>{t('settings.new_password')}</label>
                <input
                  className={s.input}
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder={t('settings.new_password_placeholder')}
                  minLength={8}
                  required
                />
              </div>
              <div className={s.field}>
                <label className={s.label}>{t('settings.confirm_new_password')}</label>
                <input
                  className={s.input}
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button className={s.saveBtn} type="submit" disabled={saving}>
                {saving ? t('settings.changing') : t('settings.change_password')}
              </button>
            </form>

            <div className={s.divider} />

            <h3 className={s.sectionTitle}>{t('settings.logout')}</h3>
            <button className={s.logoutBtn} onClick={() => { logout(); navigate('/login'); }}>
              {t('settings.logout')}
            </button>

            <div className={s.divider} />

            <h3 className={s.sectionTitle} style={{ color: '#ff4444' }}>{t('settings.danger_zone')}</h3>
            <p className={s.dangerText}>{t('settings.delete_warning')}</p>
            <button className={s.deleteBtn} onClick={deleteAccount}>
              {t('settings.delete_account')}
            </button>
          </div>
        )}

        {/* ── PRIVACY TAB ── */}
        {tab === 'privacy' && (
          <div className={s.form}>
            <h3 className={s.sectionTitle}>{t('settings.private_account')}</h3>

            <div className={s.toggleRow}>
              <div>
                <div className={s.toggleLabel}>{t('settings.private_account')}</div>
                <div className={s.toggleDesc}>
                  {user?.is_private
                    ? t('settings.private_account_desc_on')
                    : t('settings.private_account_desc_off')}
                </div>
              </div>
              <button
                className={`${s.toggle} ${user?.is_private ? s.toggleOn : ''}`}
                onClick={togglePrivacy}
              >
                <span className={s.toggleThumb} />
              </button>
            </div>

            <div className={s.infoBox}>
              <p>{t('settings.private_desc')}</p>
              <p>{t('settings.public_desc')}</p>
            </div>

            <div className={s.divider} />

            <h3 className={s.sectionTitle}>{t('settings.interaction_settings')}</h3>

            <div className={s.staticRow}>
              <span>{t('settings.comments_setting')}</span>
              <span className={s.staticBadge}>{t('settings.all')}</span>
            </div>
            <div className={s.staticRow}>
              <span>{t('settings.share_setting')}</span>
              <span className={s.staticBadge}>{t('settings.all')}</span>
            </div>
            <div className={s.staticRow}>
              <span>{t('settings.message_setting')}</span>
              <span className={s.staticBadge}>{t('settings.friends_only')}</span>
            </div>

            <div className={s.divider} />
            <h3 className={s.sectionTitle}>{t('settings.language')}</h3>
            <LanguageSwitcher />
          </div>
        )}
      </div>
    </div>
  );
}
