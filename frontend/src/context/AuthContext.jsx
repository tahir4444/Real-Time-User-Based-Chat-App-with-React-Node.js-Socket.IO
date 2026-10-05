// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { getToken, saveToken, logout as clearToken } from '../utils/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getToken());
  const [currentUser, setCurrentUser] = useState(() => {
    const savedToken = getToken();
    if (savedToken) {
      try {
        const decoded = jwtDecode(savedToken);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          clearToken();
          return null;
        }
        return { id: decoded.id, username: decoded.username };
      } catch (err) {
        clearToken();
        return null;
      }
    }
    return null;
  });

  const navigate = useNavigate();

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setCurrentUser(null);
    navigate('/login');
  }, [navigate]);

  // Validate token expiration on interval or mount
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          setCurrentUser({ id: decoded.id, username: decoded.username });
        }
      } catch (err) {
        logout();
      }
    } else {
      setCurrentUser(null);
    }
  }, [token, logout]);

  const login = (newToken, rememberMe = false) => {
    saveToken(newToken, rememberMe);
    setToken(newToken);
    try {
      const decoded = jwtDecode(newToken);
      setCurrentUser({ id: decoded.id, username: decoded.username });
    } catch (err) {
      console.error('Error decoding token on login:', err);
    }
  };

  const isLoggedIn = Boolean(token && currentUser);

  return (
    <AuthContext.Provider
      value={{
        token,
        currentUser,
        userId: currentUser?.id,
        username: currentUser?.username,
        login,
        logout,
        isLoggedIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
