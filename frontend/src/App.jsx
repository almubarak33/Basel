import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';
import FeedPage from './pages/FeedPage';
import SearchPage from './pages/SearchPage';
import UploadPage from './pages/UploadPage';
import InboxPage from './pages/InboxPage';
import FriendsPage from './pages/FriendsPage';
import ProfilePage from './pages/ProfilePage';
import VideoPage from './pages/VideoPage';
import HashtagPage from './pages/HashtagPage';
import LivePage from './pages/LivePage';
import ConversationPage from './pages/ConversationPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChooseUsernamePage from './pages/ChooseUsernamePage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading…</div>;
  if (!user) return <Navigate to="/login" />;
  // Redirect new users to choose their username
  if (!user.username_is_set && window.location.pathname !== '/choose-username') {
    return <Navigate to="/choose-username" />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading…</div>;
  return user ? <Navigate to="/" /> : children;
}

function AppLayout({ children, hideNav }) {
  return (
    <div style={{ height: '100vh', background: '#000', position: 'relative' }}>
      {children}
      {!hideNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><AppLayout><FeedPage /></AppLayout></PrivateRoute>} />
          <Route path="/search" element={<PrivateRoute><AppLayout><SearchPage /></AppLayout></PrivateRoute>} />
          <Route path="/upload" element={<PrivateRoute><AppLayout hideNav><UploadPage /></AppLayout></PrivateRoute>} />
          <Route path="/inbox" element={<PrivateRoute><AppLayout><InboxPage /></AppLayout></PrivateRoute>} />
          <Route path="/friends" element={<PrivateRoute><AppLayout><FriendsPage /></AppLayout></PrivateRoute>} />
          <Route path="/messages/:id" element={<PrivateRoute><AppLayout hideNav><ConversationPage /></AppLayout></PrivateRoute>} />
          <Route path="/profile/:username" element={<PrivateRoute><AppLayout hideNav><ProfilePage /></AppLayout></PrivateRoute>} />
          <Route path="/me" element={<PrivateRoute><AppLayout><ProfilePage /></AppLayout></PrivateRoute>} />
          <Route path="/video/:id" element={<PrivateRoute><AppLayout hideNav><VideoPage /></AppLayout></PrivateRoute>} />
          <Route path="/hashtag/:tag" element={<PrivateRoute><AppLayout hideNav><HashtagPage /></AppLayout></PrivateRoute>} />
          <Route path="/live/:id" element={<PrivateRoute><AppLayout hideNav><LivePage /></AppLayout></PrivateRoute>} />
          <Route path="/choose-username" element={<PrivateRoute><ChooseUsernamePage /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
