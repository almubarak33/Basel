import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import BottomNav from './components/BottomNav';
import LoginModal from './components/LoginModal';
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
import CameraPage from './pages/CameraPage';
import EditPostPage from './pages/EditPostPage';
import SettingsPage from './pages/SettingsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminPage from './pages/AdminPage';

/* Only for the login/register pages — redirect logged-in users away */
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading…</div>;
  return user ? <Navigate to="/" replace /> : children;
}

/* Requires login — shows login modal prompt for guests instead of hard redirect */
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading…</div>;
  if (!user) {
    // Fire the global login prompt instead of hard-redirecting
    window.dispatchEvent(new CustomEvent('app:prompt-login'));
    return <Navigate to="/" replace />;
  }
  if (!user.username_is_set && window.location.pathname !== '/choose-username') {
    return <Navigate to="/choose-username" replace />;
  }
  return children;
}

function AppLayout({ children, hideNav }) {
  return (
    <div style={{ height: '100vh', background: 'var(--bg)', position: 'relative' }}>
      {children}
      {!hideNav && <BottomNav />}
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Any component can trigger the login modal via a CustomEvent
  useEffect(() => {
    const handler = () => setShowLoginModal(true);
    window.addEventListener('app:prompt-login', handler);
    return () => window.removeEventListener('app:prompt-login', handler);
  }, []);

  return (
    <NotificationProvider user={user}>
      <BrowserRouter>
        <Routes>
          {/* ── Auth-only pages ── */}
          <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password"  element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

          {/* ── Fully public — no login needed ── */}
          <Route path="/"                  element={<AppLayout><FeedPage /></AppLayout>} />
          <Route path="/search"            element={<AppLayout><SearchPage /></AppLayout>} />
          <Route path="/hashtag/:tag"      element={<AppLayout hideNav><HashtagPage /></AppLayout>} />
          <Route path="/video/:id"         element={<AppLayout hideNav><VideoPage /></AppLayout>} />
          <Route path="/profile/:username" element={<AppLayout hideNav><ProfilePage /></AppLayout>} />

          {/* ── Login-required ── */}
          <Route path="/upload"       element={<PrivateRoute><AppLayout hideNav><UploadPage /></AppLayout></PrivateRoute>} />
          <Route path="/inbox"        element={<PrivateRoute><AppLayout><InboxPage /></AppLayout></PrivateRoute>} />
          <Route path="/friends"      element={<PrivateRoute><AppLayout><FriendsPage /></AppLayout></PrivateRoute>} />
          <Route path="/me"           element={<PrivateRoute><AppLayout><ProfilePage /></AppLayout></PrivateRoute>} />
          <Route path="/messages/:id" element={<PrivateRoute><AppLayout hideNav><ConversationPage /></AppLayout></PrivateRoute>} />
          <Route path="/live/:id"     element={<PrivateRoute><AppLayout hideNav><LivePage /></AppLayout></PrivateRoute>} />
          <Route path="/settings"     element={<PrivateRoute><AppLayout hideNav><SettingsPage /></AppLayout></PrivateRoute>} />
          <Route path="/camera"       element={<PrivateRoute><CameraPage /></PrivateRoute>} />
          <Route path="/edit-post"    element={<PrivateRoute><EditPostPage /></PrivateRoute>} />
          <Route path="/choose-username" element={<PrivateRoute><ChooseUsernamePage /></PrivateRoute>} />
          <Route path="/admin-panel"  element={<PrivateRoute><AdminPage /></PrivateRoute>} />
        </Routes>

        {/* Global login-prompt modal — shown by promptLogin() from any component */}
        {showLoginModal && (
          <LoginModal onClose={() => setShowLoginModal(false)} />
        )}
      </BrowserRouter>
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
