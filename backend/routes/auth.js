const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper function for error responses
const handleError = (res, error, context) => {
  console.error(`Error in ${context}:`, error);
  res.status(500).json({
    message: 'Server Error',
    error: error.message, // Send actual error message to client
  });
};

// @route   POST api/auth/register
router.post(
  '/register',
  [
    check('username', 'Username is required').not().isEmpty().trim().escape(),
    check('password', 'Password must be 6+ characters').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      console.log(`Attempting to register user: ${username}`);

      const userExists = await User.findOne({ username });
      if (userExists) {
        console.log('Registration failed - user exists:', username);
        return res.status(400).json({ message: 'User already exists' });
      }

      const user = new User({ username, password });
      await user.save();
      console.log('User registered successfully:', username);

      const token = generateToken({
        id: user._id.toString(),
        username: user.username,
      });
      res.status(201).json({
        token,
        user: { id: user._id, username: user.username },
      });
    } catch (err) {
      handleError(res, err, 'user registration');
    }
  }
);

// @route   POST api/auth/login
router.post(
  '/login',
  [
    check('username', 'Username is required').not().isEmpty().trim().escape(),
    check('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      console.log(`Login attempt for user: ${username}`);

      // Find user and explicitly include password field (if password is select:false in schema)
      const user = await User.findOne({ username }).select('+password');

      if (!user) {
        console.log('Login failed - user not found:', username);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      console.log('Comparing password for user:', username);
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        console.log('Login failed - password mismatch:', username);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = generateToken({
        id: user._id.toString(),
        username: user.username,
      });
      console.log('Login successful for:', username);

      res.json({
        token,
        user: { id: user._id, username: user.username },
      });
    } catch (err) {
      handleError(res, err, 'user login');
    }
  }
);

// Centralized token generation
function generateToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

module.exports = router;
