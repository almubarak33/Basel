import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import s from './ConversationPage.module.css';

const WS_HOST = process.env.REACT_APP_WS_HOST || window.location.host;

export default function ConversationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [wsReady, setWsReady] = useState(false);

  const bottomRef = useRef(null);
  const wsRef = useRef(null);
  const inputRef = useRef(null);

  // Load existing messages via REST
  useEffect(() => {
    api.get(`/messages/${id}/`)
      .then(({ data }) => setMessages(data.results || data))
      .catch(() => {});
  }, [id]);

  // Connect WebSocket for real-time
  useEffect(() => {
    const token = localStorage.getItem('access') || '';
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${WS_HOST}/ws/chat/${id}/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setWsReady(true);
    ws.onclose = () => setWsReady(false);

    ws.onmessage = (e) => {
      const payload = JSON.parse(e.data);
      if (payload.type === 'message') {
        setMessages((prev) => {
          // Deduplicate by id (REST load + WS echo)
          if (prev.some((m) => m.id === payload.message.id)) return prev;
          return [...prev, payload.message];
        });
      }
    };

    return () => ws.close();
  }, [id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;

    if (wsReady && wsRef.current?.readyState === WebSocket.OPEN) {
      // Send via WebSocket — the server echoes it back and we render on receipt
      wsRef.current.send(JSON.stringify({ type: 'message', content }));
      setText('');
    } else {
      // Fallback to REST
      setSending(true);
      try {
        const { data } = await api.post(`/messages/${id}/send/`, { content });
        setMessages((prev) => [...prev, data]);
        setText('');
      } finally {
        setSending(false);
      }
    }
  };

  const locale = i18n.language === 'ar' ? 'ar' : 'en';

  return (
    <div className={s.page}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate('/inbox')}>←</button>
        <h2>{t('conversation.title')}</h2>
        <div className={wsReady ? s.wsOnline : s.wsOffline} title={wsReady ? 'Live' : 'Offline'} />
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
          ref={inputRef}
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
