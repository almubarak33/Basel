import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import s from './CommentsDrawer.module.css';

export default function CommentsDrawer({ videoId, onClose, onCount }) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const dateLocale = i18n.language === 'ar' ? arLocale : enUS;

  useEffect(() => {
    api.get(`/videos/${videoId}/comments/`).then(({ data }) => {
      const list = data.results || data;
      setComments(list);
      onCount(list.length);
    });
  }, [videoId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/videos/${videoId}/comments/`, { content: text });
      const updated = [data, ...comments];
      setComments(updated);
      onCount(updated.length);
      setText('');
    } finally { setLoading(false); }
  };

  const avatarUrl = user?.avatar ||
    `https://ui-avatars.com/api/?name=${user?.username}&background=fe2c55&color=fff&size=36`;

  const countLabel = comments.length === 1
    ? `1 ${t('comments.title')}`
    : `${comments.length} ${t('comments.title_plural')}`;

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={s.handle} />
        <h3 className={s.title}>{countLabel}</h3>
        <div className={s.list}>
          {comments.length === 0 ? (
            <p className={s.empty}>{t('comments.no_comments')}</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className={s.comment}>
                <img
                  src={c.author.avatar || `https://ui-avatars.com/api/?name=${c.author.username}&background=333&color=fff&size=36`}
                  alt=""
                  className={s.cAvatar}
                />
                <div>
                  <span className={s.cName}>@{c.author.username}</span>
                  <p className={s.cText}>{c.content}</p>
                  <span className={s.cTime}>
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: dateLocale })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        <form className={s.form} onSubmit={submit}>
          <img src={avatarUrl} alt="" className={s.formAvatar} />
          <input
            className={s.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('comments.placeholder')}
            maxLength={300}
          />
          <button className={s.sendBtn} type="submit" disabled={loading || !text.trim()}>
            {t('comments.post')}
          </button>
        </form>
      </div>
    </div>
  );
}
