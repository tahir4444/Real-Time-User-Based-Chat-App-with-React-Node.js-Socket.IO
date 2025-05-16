require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const Message = require('./models/Message');
const User = require('./models/User'); // Added User model import

const app = express();
const server = http.createServer(app);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

app.get('/api/ping', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

// Authenticate socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    console.log('Connection rejected: No token provided');
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // attach decoded user to socket
    next();
  } catch (err) {
    console.log('Connection rejected: Invalid token');
    next(new Error('Authentication error'));
  }
});

// Track online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
  const { id, username } = socket.user;
  console.log(`Socket connected: ${socket.id}, User: ${username}`);

  // Save the user to online list
  onlineUsers.set(id, {
    socketId: socket.id,
    username,
    connectedAt: new Date(),
  });

  // Notify all users
  io.emit(
    'update_users',
    Array.from(onlineUsers.values()).map((u) => u.username)
  );

  // Handle incoming message
  socket.on('send_message', async ({ receiver, message }) => {
    try {
      const newMsg = await Message.create({
        sender: username,
        receiver,
        message,
        timestamp: new Date(),
      });

      const msgData = newMsg.toObject();

      // Send to receiver if online
      const receiverData = [...onlineUsers.values()].find(
        (u) => u.username === receiver
      );
      if (receiverData) {
        io.to(receiverData.socketId).emit('receive_message', msgData);
      }

      // Send back to sender
      io.to(socket.id).emit('receive_message', msgData);
    } catch (err) {
      console.error('Message error:', err.message);
      socket.emit('message_error', {
        error: 'Failed to send message',
        details: err.message,
      });
    }
  });

  // Typing indicator
  socket.on('typing', ({ sender, receiver }) => {
    const receiverData = [...onlineUsers.values()].find(
      (u) => u.username === receiver
    );
    if (receiverData) {
      io.to(receiverData.socketId).emit('typing', { sender });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    for (const [userId, info] of onlineUsers.entries()) {
      if (info.socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`User disconnected: ${info.username}`);
        io.emit('user_offline', userId);
        break;
      }
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Something went wrong',
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const httpServer = server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  httpServer.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});
