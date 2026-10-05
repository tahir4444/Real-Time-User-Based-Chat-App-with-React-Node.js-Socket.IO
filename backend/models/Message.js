import { pool } from '../config/db.js';

class Message {
  static async create({ senderId, receiverId, message }) {
    const [result] = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
      [senderId, receiverId, message]
    );

    const [rows] = await pool.query(
      `SELECT m.id, m.sender_id, m.receiver_id, m.message, m.is_read, m.is_deleted, m.created_at,
              u1.username AS sender, u2.username AS receiver
       FROM messages m
       JOIN users u1 ON m.sender_id = u1.id
       JOIN users u2 ON m.receiver_id = u2.id
       WHERE m.id = ?`,
      [result.insertId]
    );

    return rows[0];
  }

  static async getConversation(user1Id, user2Id, limit = 100) {
    const [rows] = await pool.query(
      `SELECT m.id, m.sender_id, m.receiver_id,
              CASE WHEN m.is_deleted = TRUE THEN 'This message was deleted' ELSE m.message END AS message,
              m.is_read, m.is_deleted, m.created_at,
              u1.username AS sender, u2.username AS receiver
       FROM messages m
       JOIN users u1 ON m.sender_id = u1.id
       JOIN users u2 ON m.receiver_id = u2.id
       WHERE (m.sender_id = ? AND m.receiver_id = ?)
          OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC
       LIMIT ?`,
      [user1Id, user2Id, user2Id, user1Id, parseInt(limit, 10)]
    );
    return rows;
  }

  static async deleteMessage(messageId, userId) {
    const [result] = await pool.query(
      'UPDATE messages SET is_deleted = TRUE WHERE id = ? AND sender_id = ?',
      [messageId, userId]
    );
    return result.affectedRows > 0;
  }

  static async markAsRead(senderId, receiverId) {
    const [result] = await pool.query(
      `UPDATE messages
       SET is_read = TRUE
       WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE`,
      [senderId, receiverId]
    );
    return result.affectedRows;
  }

  static async getUnreadCounts(userId) {
    const [rows] = await pool.query(
      `SELECT sender_id, COUNT(*) AS unread_count
       FROM messages
       WHERE receiver_id = ? AND is_read = FALSE
       GROUP BY sender_id`,
      [userId]
    );
    return rows;
  }
}

export default Message;
