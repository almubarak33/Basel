import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import PostDetail from './pages/PostDetail';
import Explore from './pages/Explore';
import HashtagPage from './pages/HashtagPage';
import SearchPage from './pages/SearchPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading SayHi...</div>;
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading SayHi...</div>;
  return user ? <Navigate to="/" /> : children;
}

function Layout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f14' }}>
      <Navbar />
      <div style={{ maxWidth: 620, margin: '0 auto', paddingTop: 16, paddingBottom: 40 }}>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Layout><Home /></Layout></PrivateRoute>} />
          <Route path="/explore" element={<PrivateRoute><Layout><Explore /></Layout></PrivateRoute>} />
          <Route path="/search" element={<PrivateRoute><Layout><SearchPage /></Layout></PrivateRoute>} />
          <Route path="/hashtag/:tag" element={<PrivateRoute><Layout><HashtagPage /></Layout></PrivateRoute>} />
          <Route path="/profile/:username" element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
          <Route path="/post/:id" element={<PrivateRoute><Layout><PostDetail /></Layout></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
