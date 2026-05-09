import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import s from './LivePage.module.css';

export default function LivePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stream, setStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [viewers, setViewers] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  useEffect(() => {
    api.get(`/live/${id}/`).then(({ data }) => {
      setStream(data);
      setMessages(data.recent_messages || []);
      setViewers(data.viewers_count);
      setIsHost(data.host.username === user?.username);
    });

    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.REACT_APP_WS_HOST || 'localhost:8000';
    const ws = new WebSocket(`${wsProto}//${wsHost}/ws/live/${id}/`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'chat') {
        setMessages((prev) => [...prev, { id: Date.now(), user: { username: data.username, avatar: data.avatar }, content: data.content }]);
      } else if (data.type === 'viewers') {
        setViewers(data.count);
      } else if (data.type === 'stream_ended') {
        alert('Stream has ended.');
        navigate('/');
      }
    };

    return () => { ws.close(); stopCamera(); };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Host: start camera
  useEffect(() => {
    if (isHost) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: true }).then((stream) => {
        mediaStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      }).catch(() => {});
    }
  }, [isHost]);

  const stopCamera = () => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'chat', content: text }));
    setText('');
  };

  const endStream = async () => {
    wsRef.current?.send(JSON.stringify({ type: 'end_stream' }));
    await api.post(`/live/${id}/end/`);
    stopCamera();
    navigate('/');
  };

  if (!stream) return <div className={s.loading}><div className={s.spinner} /></div>;

  return (
    <div className={s.page}>
      {/* Video area */}
      <div className={s.videoArea}>
        {isHost ? (
          <video ref={videoRef} autoPlay muted className={s.video} />
        ) : (
          <div className={s.watcherScreen}>
            <div className={s.liveIcon}>🔴 LIVE</div>
            <p className={s.hostName}>@{stream.host.username}</p>
            <p className={s.streamTitle}>{stream.title}</p>
          </div>
        )}

        {/* Top bar */}
        <div className={s.topBar}>
          <button className={s.backBtn} onClick={() => navigate(-1)}>✕</button>
          <div className={s.streamInfo}>
            <span className={s.livePill}>🔴 LIVE</span>
            <span className={s.viewerCount}>👁 {viewers}</span>
          </div>
          {isHost && (
            <button className={s.endBtn} onClick={endStream}>End</button>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className={s.chatArea}>
        <div className={s.messages}>
          {messages.map((m) => (
            <div key={m.id} className={s.msg}>
              <span className={s.msgName}>@{m.user.username}</span>
              <span className={s.msgText}>{m.content}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form className={s.chatForm} onSubmit={sendMessage}>
          <input
            className={s.chatInput}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="أضف تعليقاً…"
            maxLength={200}
          />
          <button className={s.sendBtn} type="submit">↑</button>
        </form>
      </div>
    </div>
  );
}
