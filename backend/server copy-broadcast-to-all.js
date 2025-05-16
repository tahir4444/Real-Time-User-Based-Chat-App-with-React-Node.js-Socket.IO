require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const Message = require('./models/Message');

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

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('send_message', async (data) => {
    const { sender, receiver, message } = data;
    const newMsg = await Message.create({ sender, receiver, message });
    io.emit('receive_message', newMsg); // broadcast to all clients
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
