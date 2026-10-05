import express from 'express';
import verifyToken from '../middleware/auth.js';
import Message from '../models/Message.js';

const router = express.Router();

// Get messages for a specific conversation with contactId
router.get('/conversation/:contactId', verifyToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const contactId = parseInt(req.params.contactId, 10);

    if (isNaN(contactId)) {
      return res.status(400).json({ message: 'Invalid contact ID' });
    }

    const messages = await Message.getConversation(currentUserId, contactId);
    res.json(messages);
  } catch (err) {
    console.error('Error fetching conversation messages:', err.message);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
});

// Mark messages from contactId as read
router.put('/read/:contactId', verifyToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const contactId = parseInt(req.params.contactId, 10);

    if (isNaN(contactId)) {
      return res.status(400).json({ message: 'Invalid contact ID' });
    }

    const updatedCount = await Message.markAsRead(contactId, currentUserId);
    res.json({ success: true, updatedCount });
  } catch (err) {
    console.error('Error marking messages as read:', err.message);
    res.status(500).json({ message: 'Server error marking messages as read' });
  }
});

// Get unread counts
router.get('/unread', verifyToken, async (req, res) => {
  try {
    const unreadCounts = await Message.getUnreadCounts(req.user.id);
    res.json(unreadCounts);
  } catch (err) {
    console.error('Error fetching unread counts:', err.message);
    res.status(500).json({ message: 'Server error fetching unread counts' });
  }
});

// Delete a message (soft delete)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const messageId = parseInt(req.params.id, 10);
    if (isNaN(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    const deleted = await Message.deleteMessage(messageId, req.user.id);
    if (!deleted) {
      return res.status(403).json({ message: 'Message not found or you are not authorized to delete it' });
    }

    res.json({ success: true, messageId });
  } catch (err) {
    console.error('Error deleting message:', err.message);
    res.status(500).json({ message: 'Server error deleting message' });
  }
});

export default router;
