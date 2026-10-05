import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

class User {
  static async findByUsername(username) {
    const [rows] = await pool.query(
      'SELECT id, username, password, avatar, created_at FROM users WHERE username = ?',
      [username]
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, username, avatar, status_text, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async updateStatus(userId, statusText) {
    await pool.query(
      'UPDATE users SET status_text = ? WHERE id = ?',
      [statusText.trim().substring(0, 100), userId]
    );
    return statusText;
  }

  static async create({ username, password }) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );

    return {
      id: result.insertId,
      username,
      status_text: 'Hey there! I am using ChatApp',
    };
  }

  static async comparePassword(enteredPassword, hashedPassword) {
    return bcrypt.compare(enteredPassword, hashedPassword);
  }

  static async getAllExcept(userId) {
    const [rows] = await pool.query(
      'SELECT id, username, avatar, status_text, created_at FROM users WHERE id != ? ORDER BY username ASC',
      [userId]
    );
    return rows;
  }

  static generateAuthToken(user) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    return jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '30d' }
    );
  }
}

export default User;
