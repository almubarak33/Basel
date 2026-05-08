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

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  return user ? <Navigate to="/" /> : children;
}

function Layout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Navbar />
      <div style={{ maxWidth: 600, margin: '0 auto', paddingTop: 20 }}>
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
          <Route path="/profile/:username" element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
          <Route path="/post/:id" element={<PrivateRoute><Layout><PostDetail /></Layout></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
