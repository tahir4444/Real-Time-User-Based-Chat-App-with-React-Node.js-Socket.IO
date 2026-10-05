import express from 'express';
import verifyToken from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Get all users except current user
router.get('/', verifyToken, async (req, res) => {
  try {
    const users = await User.getAllExcept(req.user.id);
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ message: 'Server error fetching user list' });
  }
});

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching profile:', err.message);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Get specific user by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err.message);
    res.status(500).json({ message: 'Server error fetching user' });
  }
});

// Update current user status
router.put('/status', verifyToken, async (req, res) => {
  try {
    const { statusText } = req.body;
    if (!statusText || typeof statusText !== 'string') {
      return res.status(400).json({ message: 'Valid status text is required' });
    }
    const updated = await User.updateStatus(req.user.id, statusText);
    res.json({ success: true, statusText: updated });
  } catch (err) {
    console.error('Error updating status:', err.message);
    res.status(500).json({ message: 'Server error updating status' });
  }
});

export default router;
