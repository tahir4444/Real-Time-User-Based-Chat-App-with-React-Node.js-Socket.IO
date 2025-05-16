import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from '../utils/api';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/Chat.css';

const socketUrl = 'http://localhost:5000';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [receiver, setReceiver] = useState('');
  const [socket, setSocket] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);

  const { username, logout, isLoggedIn, token } = useAuth();
  const navigate = useNavigate();

  const fetchMessages = useCallback(async () => {
    try {
      const res = await axios.get('/messages');
      setMessages(
        res.data.map((msg) => ({
          ...msg,
          tempId: msg._id || `${Date.now()}-${Math.random()}`,
        }))
      );
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, []);

  const fetchAvailableUsers = useCallback(async () => {
    try {
      const res = await axios.get('/users');

      // Handle both cases: list of strings OR objects
      const users = res.data.map((u) =>
        typeof u === 'string' ? u : u.username
      );

      const uniqueUsers = [...new Set(users)].filter((u) => u !== username);

      setAvailableUsers(uniqueUsers);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, [username]);

  useEffect(() => {
    if (!isLoggedIn || !username) {
      navigate('/login');
      return;
    }

    const newSocket = io(socketUrl, {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('register_user', username);
      fetchMessages();
      fetchAvailableUsers();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [
    isLoggedIn,
    username,
    navigate,
    token,
    fetchMessages,
    fetchAvailableUsers,
  ]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg) => {
      setMessages((prev) => [
        ...prev,
        { ...msg, tempId: `${Date.now()}-${Math.random()}` },
      ]);
    };

    const handleUpdateUsers = (users) => {
      const userList = users.map((u) =>
        typeof u === 'string' ? u : u.username
      );
      const unique = [...new Set(userList)].filter((u) => u !== username);
      setAvailableUsers(unique);
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('update_users', handleUpdateUsers);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('update_users', handleUpdateUsers);
    };
  }, [socket, username]);

  const sendMessage = () => {
    if (!message.trim() || !receiver || !socket) return;

    const msg = {
      sender: username,
      receiver,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    socket.emit('send_message', msg);
    setMessages((prev) => [
      ...prev,
      { ...msg, tempId: `${Date.now()}-${Math.random()}` },
    ]);
    setMessage('');
  };

  if (!isLoggedIn) return null;

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Welcome {username}</h2>
        <button className="logout-button" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="messages-box">
        {messages.map((msg) => (
          <div
            className={`message ${
              msg.sender === username ? 'sent' : 'received'
            }`}
            key={msg._id || msg.tempId}
          >
            <div className="message-header">
              <b>{msg.sender}</b>
              <small>{new Date(msg.timestamp).toLocaleTimeString()}</small>
            </div>
            <div className="message-content">{msg.message}</div>
          </div>
        ))}
      </div>

      <div className="chat-controls">
        <select
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
          required
        >
          <option value="">Select User</option>
          {availableUsers.map((user) => (
            <option key={`user-${user}`} value={user}>
              {user}
            </option>
          ))}
        </select>

        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type message"
        />

        <button onClick={sendMessage} disabled={!message.trim() || !receiver}>
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;
