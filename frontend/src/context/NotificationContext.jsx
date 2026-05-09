import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import api from '../api/axios';

const NotificationContext = createContext({ unread: 0, clearUnread: () => {} });

export function useNotifications() {
  return useContext(NotificationContext);
}

const WS_HOST = process.env.REACT_APP_WS_HOST || 'localhost:8000';

export function NotificationProvider({ children, user }) {
  const [unread, setUnread] = useState(0);
  const wsRef = useRef(null);

  // Fetch initial unread count
  useEffect(() => {
    if (!user) return;
    api.get('/notifications/unread/').then(({ data }) => {
      setUnread(data.unread || 0);
    }).catch(() => {});
  }, [user]);

  // WebSocket for real-time push
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('access') || '';
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${WS_HOST}/ws/notifications/?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        JSON.parse(e.data); // just a new notification arrived
        setUnread((n) => n + 1);
      } catch {}
    };

    return () => ws.close();
  }, [user]);

  const clearUnread = () => setUnread(0);

  return (
    <NotificationContext.Provider value={{ unread, clearUnread }}>
      {children}
    </NotificationContext.Provider>
  );
}
