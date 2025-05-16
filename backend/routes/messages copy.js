const express = require('express');
const Message = require('../models/Message');
const verifyToken = require('../middleware/auth');
const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  const messages = await Message.find({
    $or: [{ sender: req.user.username }, { receiver: req.user.username }],
  });
  res.json(messages);
});

module.exports = router;
// Compare this snippet from backend/server.js:
