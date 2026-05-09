import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import s from './SettingsPage.module.css';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();

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
      flash('تم حفظ الملف الشخصي ✓');
    } catch {
      flash('فشل الحفظ. حاول مجدداً.', true);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) { flash('كلمتا المرور الجديدتان غير متطابقتين.', true); return; }
    if (newPass.length < 8) { flash('كلمة المرور يجب أن تكون 8 أحرف على الأقل.', true); return; }
    setSaving(true);
    try {
      await api.post('/auth/change-password/', { old_password: oldPass, new_password: newPass });
      setOldPass(''); setNewPass(''); setConfirmPass('');
      flash('تم تغيير كلمة المرور ✓');
    } catch (err) {
      flash(err.response?.data?.error || 'كلمة المرور الحالية غير صحيحة.', true);
    } finally {
      setSaving(false);
    }
  };

  const togglePrivacy = async () => {
    const newVal = !user?.is_private;
    try {
      const { data } = await api.patch('/auth/me/', { is_private: newVal });
      updateUser(data);
      flash(newVal ? 'أصبح حسابك خاصاً 🔒' : 'أصبح حسابك عاماً 🌐');
    } catch {
      flash('فشل التحديث.', true);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm('هل أنت متأكد من حذف حسابك نهائياً؟ لا يمكن التراجع.')) return;
    if (!window.confirm('آخر تأكيد — سيتم حذف كل بياناتك.')) return;
    try {
      await api.delete('/auth/me/');
      logout();
      navigate('/login');
    } catch {
      flash('فشل الحذف. حاول مجدداً.', true);
    }
  };

  const avatarUrl = avatarPreview ||
    `https://ui-avatars.com/api/?name=${user?.username}&background=fe2c55&color=fff&size=128`;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}>←</button>
        <span className={s.title}>الإعدادات</span>
        <div style={{ width: 32 }} />
      </div>

      {/* Flash messages */}
      {msg && <div className={s.flash}>{msg}</div>}
      {error && <div className={s.flashError}>{error}</div>}

      {/* Tabs */}
      <div className={s.tabs}>
        <button className={`${s.tab} ${tab === 'profile' ? s.tabActive : ''}`} onClick={() => setTab('profile')}>الملف</button>
        <button className={`${s.tab} ${tab === 'account' ? s.tabActive : ''}`} onClick={() => setTab('account')}>الحساب</button>
        <button className={`${s.tab} ${tab === 'privacy' ? s.tabActive : ''}`} onClick={() => setTab('privacy')}>الخصوصية</button>
      </div>

      <div className={s.body}>
        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <form className={s.form} onSubmit={saveProfile}>
            {/* Avatar */}
            <div className={s.avatarSection} onClick={() => avatarRef.current?.click()}>
              <img src={avatarUrl} alt="" className={s.avatar} />
              <div className={s.avatarOverlay}>📷 تغيير</div>
              <input ref={avatarRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
            </div>

            <div className={s.field}>
              <label className={s.label}>الاسم الظاهر</label>
              <input
                className={s.input}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="اسمك الكامل"
                maxLength={50}
              />
            </div>

            <div className={s.field}>
              <label className={s.label}>السيرة الذاتية</label>
              <textarea
                className={s.textarea}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="أخبر العالم عن نفسك..."
                maxLength={150}
                rows={3}
              />
              <span className={s.counter}>{bio.length}/150</span>
            </div>

            <div className={s.field}>
              <label className={s.label}>اسم المستخدم</label>
              <div className={s.readOnly}>@{user?.username}</div>
              <span className={s.hint}>لتغيير اسم المستخدم تواصل مع الدعم</span>
            </div>

            <div className={s.field}>
              <label className={s.label}>البريد الإلكتروني</label>
              <div className={s.readOnly}>{user?.email}</div>
            </div>

            <button className={s.saveBtn} type="submit" disabled={saving}>
              {saving ? 'جاري الحفظ…' : 'حفظ التغييرات'}
            </button>
          </form>
        )}

        {/* ── ACCOUNT TAB ── */}
        {tab === 'account' && (
          <div className={s.form}>
            <h3 className={s.sectionTitle}>تغيير كلمة المرور</h3>
            <form onSubmit={changePassword}>
              <div className={s.field}>
                <label className={s.label}>كلمة المرور الحالية</label>
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
                <label className={s.label}>كلمة المرور الجديدة</label>
                <input
                  className={s.input}
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="8 أحرف على الأقل"
                  minLength={8}
                  required
                />
              </div>
              <div className={s.field}>
                <label className={s.label}>تأكيد كلمة المرور الجديدة</label>
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
                {saving ? 'جاري التغيير…' : 'تغيير كلمة المرور'}
              </button>
            </form>

            <div className={s.divider} />

            <h3 className={s.sectionTitle}>تسجيل الخروج</h3>
            <button className={s.logoutBtn} onClick={() => { logout(); navigate('/login'); }}>
              تسجيل الخروج
            </button>

            <div className={s.divider} />

            <h3 className={s.sectionTitle} style={{ color: '#ff4444' }}>منطقة الخطر</h3>
            <p className={s.dangerText}>حذف الحساب نهائي ولا يمكن التراجع عنه.</p>
            <button className={s.deleteBtn} onClick={deleteAccount}>
              حذف حسابي نهائياً
            </button>
          </div>
        )}

        {/* ── PRIVACY TAB ── */}
        {tab === 'privacy' && (
          <div className={s.form}>
            <h3 className={s.sectionTitle}>خصوصية الحساب</h3>

            <div className={s.toggleRow}>
              <div>
                <div className={s.toggleLabel}>حساب خاص</div>
                <div className={s.toggleDesc}>
                  {user?.is_private
                    ? 'فقط متابعوك يرون منشوراتك'
                    : 'منشوراتك مرئية للجميع'}
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
              <p>🔒 <strong>خاص:</strong> يجب أن يتابعك الشخص لرؤية فيديوهاتك</p>
              <p>🌐 <strong>عام:</strong> أي شخص يمكنه مشاهدة محتواك</p>
            </div>

            <div className={s.divider} />

            <h3 className={s.sectionTitle}>إعدادات التفاعل</h3>

            <div className={s.staticRow}>
              <span>إمكانية التعليق على منشوراتك</span>
              <span className={s.staticBadge}>الكل</span>
            </div>
            <div className={s.staticRow}>
              <span>إمكانية مشاركة منشوراتك</span>
              <span className={s.staticBadge}>الكل</span>
            </div>
            <div className={s.staticRow}>
              <span>إمكانية مراسلتك</span>
              <span className={s.staticBadge}>الأصدقاء</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
