import React, { useState } from 'react';
import axios from '../utils/api';
import { saveToken } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post('/auth/login', { username, password });
      saveToken(res.data.token);
      //socket.emit('register_user', username); // This tells the server who the socket belongs to
      /* socket.on('register_user', (username) => {
        users[userId] = socket.id;
        //console.log(`User ${userId} registered with socket ${socket.id}`);
      }); */
      navigate('/');
    } catch (err) {
      alert('Login failed');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <input
        placeholder="Username"
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        placeholder="Password"
        type="password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default Login;
