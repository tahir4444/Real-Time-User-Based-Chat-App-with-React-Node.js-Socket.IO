const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Message = require('../models/Message');

// Get all messages involving the current user (by username)
router.get('/', verifyToken, async (req, res) => {
  try {
    const currentUsername = req.user.username;

    const messages = await Message.find({
      $or: [{ sender: currentUsername }, { receiver: currentUsername }],
    }).sort({ createdAt: 1 }); // Sort in ascending order (oldest to newest)

    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
