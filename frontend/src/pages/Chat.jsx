// src/pages/Chat.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from '../utils/api';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/Chat.css';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const POPULAR_EMOJIS = [
  '😊', '😂', '🔥', '👍', '❤️', '🎉',
  '🚀', '👏', '💡', '🙌', '✨', '🤝',
  '👀', '😎', '💯', '☕', '💻', '⭐',
  '💪', '🥳', '👋', '🙏', '⚡', '🎯'
];

function Chat() {
  const { currentUser, userId, username, logout, isLoggedIn, token } = useAuth();
  const navigate = useNavigate();

  // State
  const [socket, setSocket] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isContactTyping, setIsContactTyping] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});

  // Advanced feature states
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [inChatSearchOpen, setInChatSearchOpen] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [myStatus, setMyStatus] = useState('Hey there! I am using ChatApp');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusInput, setStatusInput] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Refs
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const activeContactRef = useRef(selectedContact);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    activeContactRef.current = selectedContact;
  }, [selectedContact]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Clean Web Audio Notification Chime
  const playNotificationSound = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }, []);

  // Scroll to bottom
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages, isContactTyping]);

  // Fetch all registered contacts
  const fetchContacts = useCallback(async () => {
    try {
      const res = await axios.get('/users');
      setContacts(res.data);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    }
  }, []);

  // Fetch current user profile to read custom status
  const fetchProfile = useCallback(async () => {
    try {
      const res = await axios.get('/users/me');
      if (res.data?.status_text) {
        setMyStatus(res.data.status_text);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  }, []);

  // Fetch unread counts
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const res = await axios.get('/messages/unread');
      const counts = {};
      res.data.forEach((item) => {
        counts[item.sender_id] = item.unread_count;
      });
      setUnreadCounts(counts);
    } catch (err) {
      console.error('Failed to fetch unread counts:', err);
    }
  }, []);

  // Fetch conversation messages with selected contact
  const fetchConversation = useCallback(async (contactId) => {
    try {
      const res = await axios.get(`/messages/conversation/${contactId}`);
      setMessages(res.data);

      await axios.put(`/messages/read/${contactId}`);
      setUnreadCounts((prev) => ({ ...prev, [contactId]: 0 }));
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  }, []);

  // Handle contact selection
  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
    setIsContactTyping(false);
    setShowEmojiPicker(false);
    setInChatSearchOpen(false);
    setInChatSearchQuery('');
    fetchConversation(contact.id);

    if (socket) {
      socket.emit('mark_read', { contactId: contact.id });
    }
  };

  // Socket connection setup
  useEffect(() => {
    if (!isLoggedIn || !token) {
      navigate('/login');
      return;
    }

    const newSocket = io(socketUrl, {
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      fetchContacts();
      fetchProfile();
      fetchUnreadCounts();
    });

    newSocket.on('update_users', (userList) => {
      const onlineIds = new Set(userList.map((u) => u.id));
      setOnlineUserIds(onlineIds);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [isLoggedIn, token, navigate, fetchContacts, fetchProfile, fetchUnreadCounts]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg) => {
      const active = activeContactRef.current;

      // Play audio chime for incoming messages from others
      if (msg.sender_id !== userId) {
        playNotificationSound();
      }

      if (
        active &&
        (msg.sender_id === active.id || msg.receiver_id === active.id)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id || (m.tempId && m.tempId === msg.tempId))) {
            return prev.map((m) => (m.tempId && m.tempId === msg.tempId ? msg : m));
          }
          return [...prev, msg];
        });

        if (msg.sender_id === active.id) {
          socket.emit('mark_read', { contactId: active.id });
          axios.put(`/messages/read/${active.id}`).catch(() => {});
        }
      } else {
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.sender_id]: (prev[msg.sender_id] || 0) + 1,
        }));
      }
    };

    const handleMessageDeleted = (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, is_deleted: true, message: 'This message was deleted' }
            : m
        )
      );
    };

    const handleUserStatusChanged = (data) => {
      setContacts((prev) =>
        prev.map((c) =>
          c.id === data.userId ? { ...c, status_text: data.statusText } : c
        )
      );
      if (data.userId === userId) {
        setMyStatus(data.statusText);
      }
    };

    const handleUserTyping = (data) => {
      const active = activeContactRef.current;
      if (active && data.senderId === active.id) {
        setIsContactTyping(true);
      }
    };

    const handleUserStopTyping = (data) => {
      const active = activeContactRef.current;
      if (active && data.senderId === active.id) {
        setIsContactTyping(false);
      }
    };

    const handleMessagesRead = (data) => {
      const active = activeContactRef.current;
      if (active && data.readerId === active.id) {
        setMessages((prev) =>
          prev.map((m) => (m.receiver_id === active.id ? { ...m, is_read: true } : m))
        );
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('user_status_changed', handleUserStatusChanged);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('user_status_changed', handleUserStatusChanged);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, userId, playNotificationSound]);

  // Typing debounce
  const handleInputChange = (e) => {
    setMessageInput(e.target.value);

    if (!socket || !selectedContact) return;

    socket.emit('typing', { receiverId: selectedContact.id });

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      socket.emit('stop_typing', { receiverId: selectedContact.id });
    }, 1500);
  };

  // Send message
  const handleSendMessage = (e) => {
    if (e) e.preventDefault();

    const text = messageInput.trim();
    if (!text || !selectedContact || !socket) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      tempId,
      sender_id: userId,
      receiver_id: selectedContact.id,
      sender: username,
      receiver: selectedContact.username,
      message: text,
      created_at: new Date().toISOString(),
      is_read: false,
      is_deleted: false,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageInput('');
    setShowEmojiPicker(false);

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    socket.emit('stop_typing', { receiverId: selectedContact.id });

    socket.emit(
      'send_message',
      { receiverId: selectedContact.id, message: text },
      (res) => {
        if (res && res.success && res.message) {
          setMessages((prev) =>
            prev.map((m) => (m.tempId === tempId ? res.message : m))
          );
        }
      }
    );
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    if (!socket || !selectedContact) return;

    try {
      await axios.delete(`/messages/${messageId}`);
      socket.emit('delete_message', {
        messageId,
        receiverId: selectedContact.id,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, is_deleted: true, message: 'This message was deleted' }
            : m
        )
      );
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  // Copy message text
  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Insert emoji
  const handleInsertEmoji = (emoji) => {
    setMessageInput((prev) => prev + emoji);
  };

  // Save custom status
  const handleSaveStatus = async () => {
    if (!statusInput.trim()) return;
    try {
      await axios.put('/users/status', { statusText: statusInput.trim() });
      if (socket) {
        socket.emit('update_status', { statusText: statusInput.trim() });
      }
      setMyStatus(statusInput.trim());
      setStatusModalOpen(false);
    } catch (err) {
      console.error('Failed to save status:', err);
    }
  };

  // Filter contacts by search query
  const filteredContacts = contacts.filter((c) =>
    c.username.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // In-conversation messages filter
  const displayedMessages = inChatSearchQuery.trim()
    ? messages.map((m) => ({
        ...m,
        isSearchMatch: m.message
          .toLowerCase()
          .includes(inChatSearchQuery.toLowerCase().trim()),
      }))
    : messages;

  if (!isLoggedIn) return null;

  return (
    <div className="chat-app-layout">
      {/* LEFT SIDEBAR */}
      <aside className={`chat-sidebar ${selectedContact ? 'hidden-mobile' : ''}`}>
        {/* Current User Header */}
        <div className="sidebar-header">
          <div className="current-user-info">
            <div
              className="avatar-badge"
              style={{ cursor: 'pointer' }}
              title="Click to update status"
              onClick={() => {
                setStatusInput(myStatus);
                setStatusModalOpen(true);
              }}
            >
              {username ? username.charAt(0) : '?'}
              <span className="status-dot-indicator online" />
            </div>
            <div className="user-text-details">
              <span className="user-display-name">{username}</span>
              <span
                className="user-status-capsule"
                title="Click to edit status"
                onClick={() => {
                  setStatusInput(myStatus);
                  setStatusModalOpen(true);
                }}
              >
                ✎ {myStatus}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="header-action-btn"
              onClick={() => setSoundEnabled((prev) => !prev)}
              title={soundEnabled ? 'Mute chime' : 'Enable chime'}
            >
              {soundEnabled ? '🔔' : '🔕'}
            </button>
            <button className="logout-icon-btn" onClick={logout} title="Sign Out">
              <span>🚪</span>
            </button>
          </div>
        </div>

        {/* Contact Search Bar */}
        <div className="sidebar-search">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="contacts-section-title">Direct Messages</div>
        <div className="contacts-scroll-area">
          {filteredContacts.length === 0 ? (
            <div className="empty-contacts-notice">
              {contacts.length === 0
                ? 'No other users registered yet.'
                : 'No contacts match your search.'}
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isOnline = onlineUserIds.has(contact.id);
              const isSelected = selectedContact?.id === contact.id;
              const unread = unreadCounts[contact.id] || 0;

              return (
                <div
                  key={`contact-${contact.id}`}
                  className={`contact-card-item ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectContact(contact)}
                >
                  <div className="contact-card-main">
                    <div className="contact-card-avatar">
                      {contact.username.charAt(0).toUpperCase()}
                      <span
                        className={`status-dot-indicator ${
                          isOnline ? 'online' : 'offline'
                        }`}
                      />
                    </div>
                    <div className="contact-card-meta">
                      <span className="contact-card-name">{contact.username}</span>
                      <span
                        className={`contact-card-status ${
                          isOnline ? 'online' : ''
                        }`}
                      >
                        {isOnline ? 'Active now' : contact.status_text || 'Offline'}
                      </span>
                    </div>
                  </div>

                  {unread > 0 && <span className="unread-badge">{unread}</span>}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* RIGHT CHAT PANEL */}
      <main className={`chat-main-panel ${!selectedContact ? 'hidden-mobile' : ''}`}>
        {selectedContact ? (
          <>
            {/* Active Contact Header */}
            <div className="chat-panel-header">
              <div className="active-contact-profile">
                <button
                  className="mobile-back-button"
                  onClick={() => setSelectedContact(null)}
                  title="Back to contacts"
                >
                  ←
                </button>
                <div className="active-header-avatar">
                  {selectedContact.username.charAt(0).toUpperCase()}
                  <span
                    className={`status-dot-indicator ${
                      onlineUserIds.has(selectedContact.id) ? 'online' : 'offline'
                    }`}
                  />
                </div>
                <div className="active-header-title">
                  <span className="active-header-username">
                    {selectedContact.username}
                  </span>
                  <span
                    className={`active-header-presence ${
                      isContactTyping
                        ? 'typing'
                        : onlineUserIds.has(selectedContact.id)
                        ? 'online'
                        : 'offline'
                    }`}
                  >
                    {isContactTyping
                      ? 'typing...'
                      : onlineUserIds.has(selectedContact.id)
                      ? 'Active now'
                      : selectedContact.status_text || 'Offline'}
                  </span>
                </div>
              </div>

              {/* Header Action Tools */}
              <div className="header-actions-group">
                <button
                  className={`header-action-btn ${inChatSearchOpen ? 'active' : ''}`}
                  onClick={() => {
                    setInChatSearchOpen((prev) => !prev);
                    setInChatSearchQuery('');
                  }}
                  title="Search inside conversation"
                >
                  🔍
                </button>
              </div>
            </div>

            {/* In-Conversation Search Toolbar */}
            {inChatSearchOpen && (
              <div className="conversation-search-bar">
                <input
                  type="text"
                  className="conv-search-input"
                  placeholder="Search in this conversation..."
                  value={inChatSearchQuery}
                  onChange={(e) => setInChatSearchQuery(e.target.value)}
                  autoFocus
                />
                <button
                  className="conv-search-close"
                  onClick={() => {
                    setInChatSearchOpen(false);
                    setInChatSearchQuery('');
                  }}
                  title="Close search"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Messages Stream Container */}
            <div className="messages-stream-container">
              <div className="date-separator">
                <span className="date-separator-label">Conversation started</span>
              </div>

              {displayedMessages.map((msg, idx) => {
                const isSentByMe =
                  msg.sender_id === userId || msg.sender === username;
                const timeString = new Date(msg.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={msg.id || msg.tempId || idx}
                    className={`message-bubble-row ${
                      isSentByMe ? 'sent' : 'received'
                    }`}
                  >
                    <div className="message-bubble-wrapper">
                      <div
                        className={`message-bubble ${
                          isSentByMe ? 'sent' : 'received'
                        } ${msg.is_deleted ? 'deleted' : ''} ${
                          msg.isSearchMatch ? 'highlighted' : ''
                        }`}
                      >
                        <p className="message-bubble-text">{msg.message}</p>
                        <div className="message-bubble-footer">
                          <span className="message-timestamp">{timeString}</span>
                          {isSentByMe && !msg.is_deleted && (
                            <span className="read-status-check">
                              {msg.is_read ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Message Hover Actions */}
                      {!msg.is_deleted && (
                        <div className="message-actions-hover">
                          <button
                            className="msg-action-btn"
                            title={copiedId === msg.id ? 'Copied!' : 'Copy'}
                            onClick={() => handleCopyText(msg.message, msg.id)}
                          >
                            {copiedId === msg.id ? '✓' : '📋'}
                          </button>
                          {isSentByMe && msg.id && (
                            <button
                              className="msg-action-btn delete"
                              title="Delete for everyone"
                              onClick={() => handleDeleteMessage(msg.id)}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Animated Typing Indicator Bubble */}
              {isContactTyping && (
                <div className="message-bubble-row received">
                  <div className="typing-bubble-container">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <div className="emoji-popover">
                <div className="emoji-grid">
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      className="emoji-cell"
                      onClick={() => handleInsertEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Input Bar */}
            <div className="chat-input-toolbar">
              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <button
                  type="button"
                  className="emoji-trigger-btn"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  title="Insert Emoji"
                >
                  😊
                </button>

                <input
                  type="text"
                  className="message-text-input"
                  placeholder={`Message ${selectedContact.username}...`}
                  value={messageInput}
                  onChange={handleInputChange}
                  autoFocus
                />

                <button
                  type="submit"
                  className="send-action-btn"
                  disabled={!messageInput.trim()}
                  title="Send message"
                >
                  <svg className="send-icon-svg" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty Chat Placeholder */
          <div className="empty-chat-state">
            <div className="empty-state-badge">💬</div>
            <h2 className="empty-state-title">Select a Conversation</h2>
            <p className="empty-state-sub">
              Choose a contact from the sidebar to view chat history and start
              messaging in real time.
            </p>
          </div>
        )}
      </main>

      {/* User Custom Status Modal */}
      {statusModalOpen && (
        <div
          className="status-edit-modal-backdrop"
          onClick={() => setStatusModalOpen(false)}
        >
          <div
            className="status-edit-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="status-edit-title">Set Your Custom Status</h3>
            <input
              type="text"
              className="status-edit-input"
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value)}
              placeholder="e.g. ⚡ In deep work | ☕ In meeting"
              maxLength={100}
              autoFocus
            />
            <div className="status-edit-buttons">
              <button
                className="status-cancel-btn"
                onClick={() => setStatusModalOpen(false)}
              >
                Cancel
              </button>
              <button className="status-save-btn" onClick={handleSaveStatus}>
                Save Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;
