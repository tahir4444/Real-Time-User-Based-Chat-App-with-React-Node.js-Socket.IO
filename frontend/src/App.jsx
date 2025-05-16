import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute'; // Add this import

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Default route redirects to /chat if logged in */}
        <Route path="/" element={<Navigate to="/chat" replace />} />

        {/* Protected chat route */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />

        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
