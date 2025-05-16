// utils/auth.js
export const saveToken = (token, rememberMe = false) => {
  if (rememberMe) {
    // Store in localStorage for persistent sessions
    localStorage.setItem('token', token);
  } else {
    // Store in sessionStorage for session-only
    sessionStorage.setItem('token', token);
  }
};

export const getToken = () => {
  // Check both storage locations
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

export const logout = () => {
  // Clear from both storage locations
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
};
/* export const isLoggedIn = () => {
  return !!getToken();
}; */
