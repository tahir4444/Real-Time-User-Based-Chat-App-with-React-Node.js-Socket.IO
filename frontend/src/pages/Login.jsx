import React, { useState } from 'react';
import axios from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/Login.css';

function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim() || !formData.password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/auth/login', {
        username: formData.username.trim(),
        password: formData.password,
      });

      // Pass rememberMe to the login function
      login(res.data.token, formData.rememberMe);
      navigate('/chat');
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Login failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <input
          className="login-input"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          autoComplete="username"
          disabled={loading}
        />

        <input
          className="login-input"
          name="password"
          placeholder="Password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          autoComplete="current-password"
          disabled={loading}
        />

        <label className="remember-me">
          <input
            type="checkbox"
            name="rememberMe"
            checked={formData.rememberMe}
            onChange={handleChange}
            disabled={loading}
          />
          Remember me
        </label>

        <button
          className="login-button"
          type="submit"
          disabled={loading || !formData.username || !formData.password}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Logging in...
            </>
          ) : (
            'Login'
          )}
        </button>
      </form>
    </div>
  );
}

export default Login;
