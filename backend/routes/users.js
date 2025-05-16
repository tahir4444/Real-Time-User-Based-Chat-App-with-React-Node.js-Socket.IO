const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const User = require('../models/User');

// Get all users (except current user)
router.get('/', verifyToken, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select('-password -__v')
      .lean();
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -__v');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get specific user by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -__v');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
