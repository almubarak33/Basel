import React, { useState, useEffect, useRef } from 'react';
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
  const [replyTo, setReplyTo] = useState(null); // { id, username }
  const inputRef = useRef(null);

  const dateLocale = i18n.language === 'ar' ? arLocale : enUS;

  const totalCount = (list) =>
    list.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  useEffect(() => {
    api.get(`/videos/${videoId}/comments/`).then(({ data }) => {
      const list = data.results || data;
      setComments(list);
      onCount(totalCount(list));
    });
  }, [videoId]);

  const startReply = (topLevelComment, targetUsername) => {
    setReplyTo({ id: topLevelComment.id, username: targetUsername });
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelReply = () => {
    setReplyTo(null);
    setText('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const payload = { content: text };
      if (replyTo) payload.parent = replyTo.id;

      const { data } = await api.post(`/videos/${videoId}/comments/`, payload);

      let updated;
      if (replyTo) {
        updated = comments.map((c) =>
          c.id === replyTo.id
            ? { ...c, replies: [...(c.replies || []), data] }
            : c
        );
      } else {
        updated = [{ ...data, replies: [] }, ...comments];
      }

      setComments(updated);
      onCount(totalCount(updated));
      setText('');
      setReplyTo(null);
    } finally {
      setLoading(false);
    }
  };

  const avatarUrl = (u) =>
    u?.avatar ||
    `https://ui-avatars.com/api/?name=${u?.username}&background=333&color=fff&size=36`;

  const timeStr = (dt) =>
    formatDistanceToNow(new Date(dt), { addSuffix: true, locale: dateLocale });

  const total = totalCount(comments);
  const countLabel =
    total === 1
      ? `1 ${t('comments.title')}`
      : `${total} ${t('comments.title_plural')}`;

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
              <div key={c.id} className={s.thread}>
                {/* ── Top-level comment ── */}
                <CommentRow
                  comment={c}
                  avatarUrl={avatarUrl}
                  timeStr={timeStr}
                  replyLabel={t('comments.reply')}
                  onReply={() => startReply(c, c.author.username)}
                />

                {/* ── Replies ── */}
                {c.replies?.length > 0 && (
                  <div className={s.replies}>
                    {c.replies.map((r) => (
                      <CommentRow
                        key={r.id}
                        comment={r}
                        avatarUrl={avatarUrl}
                        timeStr={timeStr}
                        replyLabel={t('comments.reply')}
                        isReply
                        onReply={() => startReply(c, r.author.username)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* ── Reply context banner ── */}
        {replyTo && (
          <div className={s.replyBar}>
            <span className={s.replyBarText}>
              ↩ {t('comments.replying_to')} <strong>@{replyTo.username}</strong>
            </span>
            <button className={s.replyBarClose} onClick={cancelReply}>✕</button>
          </div>
        )}

        {/* ── Input form ── */}
        <form className={s.form} onSubmit={submit}>
          <img src={avatarUrl(user)} alt="" className={s.formAvatar} />
          <input
            ref={inputRef}
            className={s.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              replyTo
                ? `@${replyTo.username}…`
                : t('comments.placeholder')
            }
            maxLength={300}
          />
          <button
            className={s.sendBtn}
            type="submit"
            disabled={loading || !text.trim()}
          >
            {t('comments.post')}
          </button>
        </form>
      </div>
    </div>
  );
}

function CommentRow({ comment, avatarUrl, timeStr, replyLabel, onReply, isReply }) {
  return (
    <div className={isReply ? s.reply : s.comment}>
      <img
        src={avatarUrl(comment.author)}
        alt=""
        className={isReply ? s.rAvatar : s.cAvatar}
      />
      <div className={s.cBody}>
        <span className={s.cName}>@{comment.author.username}</span>
        <p className={s.cText}>{comment.content}</p>
        <div className={s.cMeta}>
          <span className={s.cTime}>{timeStr(comment.created_at)}</span>
          <button className={s.replyBtn} onClick={onReply}>
            {replyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
