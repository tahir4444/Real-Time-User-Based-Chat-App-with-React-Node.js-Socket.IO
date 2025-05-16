require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const Message = require('./models/Message');

const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);

mongoose.connect(process.env.MONGO_URI);

app.use(cors());
app.use(express.json());

app.get('/api/ping', (req, res) => {
  res.send('pong');
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/messages', require('./routes/messages'));

//const username = JSON.parse(atob(getToken().split('.')[1])).username;

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const users = {}; // userId -> socketId

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  // console.log('User ID:', userId);
  // Register the user with their userId when they connect
  socket.on('register_user', (userId) => {
    users[userId] = socket.id;
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  // Handle message sending
  socket.on('send_message', async (data) => {
    const { sender, receiver, message } = data;

    const newMsg = await Message.create({ sender, receiver, message });

    // Send message to the receiver only (if they are connected)
    const receiverSocket = users[receiver];
    if (receiverSocket) {
      io.to(receiverSocket).emit('receive_message', newMsg);
    }

    // Optionally send to the sender as well
    const senderSocket = users[sender];
    if (senderSocket) {
      io.to(senderSocket).emit('receive_message', newMsg);
    }
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    for (let userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        break;
      }
    }
    console.log(`Client disconnected: ${socket.id}`);
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
