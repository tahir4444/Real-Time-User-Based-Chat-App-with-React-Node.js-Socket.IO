import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import { initDatabase, pool } from './config/db.js';
import Message from './models/Message.js';
import User from './models/User.js';

import authRoutes from './routes/auth.js';
import messageRoutes from './routes/messages.js';
import userRoutes from './routes/users.js';

const app = express();
const server = http.createServer(app);

// CORS configuration
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || origin === allowedOrigin || origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

app.get('/api/ping', (req, res) => {
  res.json({
    status: 'healthy',
    database: 'MySQL 9.1',
    modules: 'ES6 Modules (type: module)',
    timestamp: new Date().toISOString(),
  });
});

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
  },
});

// Authenticate socket connections with JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // { id, username }
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid or expired token'));
  }
});

// Track online users with support for multiple tabs/devices
// Map: userId (number) => { id, username, socketIds: Set<string> }
const onlineUsers = new Map();

function broadcastOnlineUsers() {
  const userList = Array.from(onlineUsers.values()).map((u) => ({
    id: u.id,
    username: u.username,
  }));
  io.emit('update_users', userList);
}

io.on('connection', (socket) => {
  const { id: userId, username } = socket.user;
  const userRoom = `user:${userId}`;

  // Join personal user room for targeted routing across all tabs
  socket.join(userRoom);
  socket.join(`username:${username}`);

  // Track presence
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, {
      id: userId,
      username,
      socketIds: new Set([socket.id]),
    });
  } else {
    onlineUsers.get(userId).socketIds.add(socket.id);
  }

  console.log(`⚡ Connected: ${username} (ID: ${userId}) on socket ${socket.id}`);
  broadcastOnlineUsers();

  // Send initial online list directly to connecting socket
  socket.emit(
    'update_users',
    Array.from(onlineUsers.values()).map((u) => ({
      id: u.id,
      username: u.username,
    }))
  );

  // Handle incoming message
  socket.on('send_message', async (data, ack) => {
    try {
      const { receiverId, message } = data;
      if (!receiverId || !message || !message.trim()) {
        if (typeof ack === 'function') {
          ack({ error: 'Receiver ID and message content are required' });
        }
        return;
      }

      // Persist to MySQL
      const savedMessage = await Message.create({
        senderId: userId,
        receiverId: parseInt(receiverId, 10),
        message: message.trim(),
      });

      // Deliver to receiver's room (all their open tabs)
      io.to(`user:${receiverId}`).emit('receive_message', savedMessage);

      // Deliver to sender's other tabs (if any), excluding current socket
      socket.to(userRoom).emit('receive_message', savedMessage);

      // Acknowledge back to sender with confirmed saved message
      if (typeof ack === 'function') {
        ack({ success: true, message: savedMessage });
      } else {
        socket.emit('message_sent_ack', savedMessage);
      }
    } catch (err) {
      console.error('❌ Error sending message:', err.message);
      if (typeof ack === 'function') {
        ack({ error: 'Failed to deliver message' });
      }
      socket.emit('message_error', {
        error: 'Failed to send message',
        details: err.message,
      });
    }
  });

  // Typing indicators
  socket.on('typing', ({ receiverId }) => {
    if (receiverId) {
      io.to(`user:${receiverId}`).emit('user_typing', {
        senderId: userId,
        senderUsername: username,
      });
    }
  });

  socket.on('stop_typing', ({ receiverId }) => {
    if (receiverId) {
      io.to(`user:${receiverId}`).emit('user_stop_typing', {
        senderId: userId,
      });
    }
  });

  // Mark as read event
  socket.on('mark_read', async ({ contactId }) => {
    if (contactId) {
      try {
        await Message.markAsRead(contactId, userId);
        io.to(`user:${contactId}`).emit('messages_read', { readerId: userId });
      } catch (err) {
        console.error('Error marking messages read:', err.message);
      }
    }
  });

  // Delete message event
  socket.on('delete_message', async ({ messageId, receiverId }) => {
    try {
      const deleted = await Message.deleteMessage(messageId, userId);
      if (deleted) {
        io.to(`user:${receiverId}`).emit('message_deleted', { messageId });
        io.to(userRoom).emit('message_deleted', { messageId });
      }
    } catch (err) {
      console.error('Error handling socket delete_message:', err.message);
    }
  });

  // Update custom user status event
  socket.on('update_status', async ({ statusText }) => {
    try {
      await User.updateStatus(userId, statusText);
      io.emit('user_status_changed', { userId, statusText });
    } catch (err) {
      console.error('Error handling socket update_status:', err.message);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const userRecord = onlineUsers.get(userId);
    if (userRecord) {
      userRecord.socketIds.delete(socket.id);
      if (userRecord.socketIds.size === 0) {
        onlineUsers.delete(userId);
        console.log(`🔌 Disconnected completely: ${username} (ID: ${userId})`);
      } else {
        console.log(`🔌 Disconnected tab: ${username} (remaining tabs: ${userRecord.socketIds.size})`);
      }
      broadcastOnlineUsers();
    }
  });
});

// Global Error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// Start Server after MySQL initialization
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await initDatabase();
    const httpServer = server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} with ES6 Modules & MySQL`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down server gracefully...');
      httpServer.close(async () => {
        try {
          await pool.end();
          console.log('MySQL pool closed.');
          process.exit(0);
        } catch (err) {
          console.error('Error closing MySQL pool:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
