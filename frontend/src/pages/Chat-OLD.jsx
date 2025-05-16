import React, { useEffect, useState } from 'react';
import { logout, getToken } from '../utils/auth';
import axios from '../utils/api';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom'; // ✅ import useNavigate

const socket = io('http://localhost:5000');

function Chat() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [receiver, setReceiver] = useState('');

  const navigate = useNavigate(); // ✅ hook to redirect

  const token = getToken();
  const username = token ? JSON.parse(atob(token.split('.')[1])).username : '';

  // Redirect to login if no token
  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  if (!token) {
    return null; // Don't render until redirect happens
  }

  useEffect(() => {
    socket.emit('register_user', username);
  }, [username]);

  useEffect(() => {
    fetchMessages();
    socket.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => socket.off('receive_message');
  }, []);

  const fetchMessages = async () => {
    const res = await axios.get('/messages');
    setMessages(res.data);
  };

  const sendMessage = () => {
    const msg = { sender: username, receiver, message };
    socket.emit('send_message', msg);
    setMessage('');
  };

  const handleLogout = () => {
    logout(); // clear the token
    navigate('/login'); // ✅ redirect
  };

  return (
    <div>
      <h2>Welcome {username}</h2>
      <button onClick={handleLogout}>Logout</button>
      <div
        style={{
          border: '1px solid gray',
          padding: '10px',
          height: '300px',
          overflowY: 'scroll',
        }}
      >
        {messages.map((msg, i) => (
          <div key={i}>
            <b>{msg.sender}</b>: {msg.message}
          </div>
        ))}
      </div>
      <select
        name="receiver"
        id="receiver"
        onChange={(e) => setReceiver(e.target.value)}
      >
        <option value="">Select User to send Message</option>
        <option value="tahir4444">tahir4444</option>
        <option value="admin">Admin</option>
        <option value="moosa">Moosa</option>
      </select>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type message"
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default Chat;
// This code is a React component for a chat application. It uses socket.io for real-time messaging and axios for API calls. The component fetches messages from the server, allows users to send messages, and handles user authentication with JWT tokens stored in local storage. The useNavigate hook from react-router-dom is used to redirect users to the login page if they are not authenticated.
