const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers and underscores',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'], // Fixed from 4 to 6
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Enhanced password hashing with error handling
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// More robust token generation
UserSchema.methods.generateAuthToken = function () {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }

  return jwt.sign(
    {
      id: this._id,
      username: this.username,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    }
  );
};

// Safer password comparison
UserSchema.methods.matchPassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (err) {
    console.error('Password comparison error:', err);
    return false;
  }
};

// Optimized username check
UserSchema.statics.isUsernameTaken = async function (username) {
  try {
    const count = await this.countDocuments({ username });
    return count > 0;
  } catch (err) {
    console.error('Username check error:', err);
    throw err;
  }
};

module.exports = mongoose.model('User', UserSchema);
