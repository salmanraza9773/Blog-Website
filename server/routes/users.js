const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDB } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get user profile dashboard data
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    
    // Fetch user details
    const user = await db.get(
      'SELECT id, username, email, preferences_json FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.preferences = JSON.parse(user.preferences_json || '{}');
    delete user.preferences_json;

    // Fetch liked posts
    const likedBlogs = await db.all(
      `SELECT b.*, u.username as author_name,
        (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as likes_count
       FROM likes l
       JOIN blogs b ON l.blog_id = b.id
       JOIN users u ON b.author_id = u.id
       WHERE l.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    // Fetch user's own published blogs
    const ownBlogs = await db.all(
      `SELECT b.*, u.username as author_name,
        (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as likes_count
       FROM blogs b
       JOIN users u ON b.author_id = u.id
       WHERE b.author_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    res.json({
      user,
      likedBlogs,
      ownBlogs
    });
  } catch (err) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ error: 'Server error fetching profile details' });
  }
});

// Update user preferences (e.g. saved streams)
router.put('/preferences', authenticateToken, async (req, res) => {
  const { savedStreams } = req.body;
  if (!Array.isArray(savedStreams)) {
    return res.status(400).json({ error: 'savedStreams must be an array' });
  }

  try {
    const db = getDB();
    const user = await db.get('SELECT preferences_json FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentPreferences = JSON.parse(user.preferences_json || '{}');
    currentPreferences.savedStreams = savedStreams;

    await db.run(
      'UPDATE users SET preferences_json = ? WHERE id = ?',
      [JSON.stringify(currentPreferences), req.user.id]
    );

    res.json({ message: 'Preferences updated successfully', preferences: currentPreferences });
  } catch (err) {
    console.error('Update preferences error:', err);
    res.status(500).json({ error: 'Server error updating preferences' });
  }
});

// Update profile settings (username, email, password)
router.put('/settings', authenticateToken, async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email) {
    return res.status(400).json({ error: 'Username and email are required' });
  }

  try {
    const db = getDB();
    
    // Check uniqueness if username or email is changed
    const existing = await db.get(
      'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
      [username, email, req.user.id]
    );
    if (existing) {
      return res.status(400).json({ error: 'Username or email already in use' });
    }

    if (password) {
      // Hashing new password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      await db.run(
        'UPDATE users SET username = ?, email = ?, password_hash = ? WHERE id = ?',
        [username, email, passwordHash, req.user.id]
      );
    } else {
      await db.run(
        'UPDATE users SET username = ?, email = ? WHERE id = ?',
        [username, email, req.user.id]
      );
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Server error updating settings' });
  }
});

module.exports = router;
