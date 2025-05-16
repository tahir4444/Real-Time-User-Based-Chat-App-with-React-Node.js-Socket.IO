const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Make sure to import your User model

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  // Check if Authorization header is present and properly formatted
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(403)
      .json({ message: 'No token provided or malformed token.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the token using your JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID extracted from the token, exclude password field
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach necessary user info to request for downstream usage
    req.user = { id: user._id.toString(), username: user.username };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }

    console.error('JWT verification error:', err);
    return res.status(500).json({ message: 'Failed to authenticate token' });
  }
};

module.exports = verifyToken;
