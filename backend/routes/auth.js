import express from 'express';
import { check, validationResult } from 'express-validator';
import User from '../models/User.js';

const router = express.Router();

// @route   POST /api/auth/register
router.post(
  '/register',
  [
    check('username', 'Username is required and must be between 3 and 20 characters')
      .trim()
      .isLength({ min: 3, max: 20 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array(), message: errors.array()[0].msg });
    }

    const { username, password } = req.body;

    try {
      const existingUser = await User.findByUsername(username.trim());
      if (existingUser) {
        return res.status(400).json({ message: 'Username is already taken' });
      }

      const newUser = await User.create({
        username: username.trim(),
        password,
      });

      const token = User.generateAuthToken(newUser);

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: { id: newUser.id, username: newUser.username },
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ message: 'Server error during registration', error: err.message });
    }
  }
);

// @route   POST /api/auth/login
router.post(
  '/login',
  [
    check('username', 'Username is required').not().isEmpty().trim(),
    check('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array(), message: errors.array()[0].msg });
    }

    const { username, password } = req.body;

    try {
      const user = await User.findByUsername(username.trim());
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      const isMatch = await User.comparePassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      const token = User.generateAuthToken(user);

      res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, username: user.username },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Server error during login', error: err.message });
    }
  }
);

export default router;
