// src/utils/auth.js

export const saveToken = (token, rememberMe = false) => {
  if (rememberMe) {
    localStorage.setItem('token', token);
    sessionStorage.removeItem('token');
  } else {
    sessionStorage.setItem('token', token);
    localStorage.removeItem('token');
  }
};

export const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

export const logout = () => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
};

export const getStoredUser = () => {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check if token expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      logout();
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
};
