// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, saveToken, logout as clearToken } from '../utils/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(getToken());
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setUsername(decoded.username);
        // Navigate only after username is set
        navigate('/chat');
      } catch (err) {
        console.error('Invalid token format');
        setUsername('');
      }
    } else {
      setUsername('');
    }
  }, [token, navigate]);

  const login = (newToken) => {
    saveToken(newToken);
    setToken(newToken);
    // no navigate here, handled in useEffect
  };

  const logout = () => {
    clearToken();
    setToken(null);
    setUsername('');
    navigate('/login');
  };

  const isLoggedIn = !!token;

  return (
    <AuthContext.Provider
      value={{ token, username, login, logout, isLoggedIn }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use AuthContext easily
export const useAuth = () => useContext(AuthContext);
