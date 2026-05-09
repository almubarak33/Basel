import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import s from './ConversationPage.module.css';

export default function ConversationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get(`/messages/${id}/`).then(({ data }) => setMessages(data.results || data)).catch(() => {});
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/messages/${id}/send/`, { content: text.trim() });
      setMessages((prev) => [...prev, data]);
      setText('');
    } finally { setSending(false); }
  };

  const locale = i18n.language === 'ar' ? 'ar' : 'en';

  return (
    <div className={s.page}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate('/inbox')}>←</button>
        <h2>{t('conversation.title')}</h2>
        <div />
      </div>

      <div className={s.messages}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`${s.bubble} ${m.sender?.username === user?.username ? s.mine : s.theirs}`}
          >
            <p className={s.bubbleText}>{m.content}</p>
            <span className={s.bubbleTime}>
              {new Date(m.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className={s.inputRow} onSubmit={send}>
        <input
          className={s.input}
          placeholder={t('conversation.type_message')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
        />
        <button className={s.sendBtn} type="submit" disabled={!text.trim() || sending}>↑</button>
      </form>
    </div>
  );
}
