const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDB } = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../utils/email');

// Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  try {
    const db = getDB();
    
    // Check if user already exists
    const existingUser = await db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already in use' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Default user role
    const role = 'user';
    const defaultPreferences = JSON.stringify({ savedStreams: [] });

    // Insert user
    const result = await db.run(
      'INSERT INTO users (username, email, password_hash, role, preferences_json) VALUES (?, ?, ?, ?, ?)',
      [username, email, passwordHash, role, defaultPreferences]
    );

    const userId = result.lastID;
    
    // Generate JWT
    const token = jwt.sign(
      { id: userId, username, email, role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: userId, username, email, role }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const db = getDB();
    
    // Find user
    const user = await db.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const userRole = user.role || 'user';

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: userRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: userRole }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const user = await db.get(
      'SELECT id, username, email, role, preferences_json FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.preferences = JSON.parse(user.preferences_json || '{}');
    delete user.preferences_json;
    
    res.json({ user });
  } catch (err) {
    console.error('Fetch me error:', err);
    res.status(500).json({ error: 'Server error fetching user info' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  try {
    const db = getDB();
    const user = await db.get('SELECT id, email, username FROM users WHERE email = ?', [email]);
    
    if (!user) {
      // Security best practice: don't leak user existence, but inform user
      return res.json({ message: 'If an account exists with that email, a password reset link has been generated.' });
    }

    // Generate secure 32-byte hex token
    const token = crypto.randomBytes(32).toString('hex');
    const expiryISO = new Date(Date.now() + 3600000).toISOString(); // 1 hour expiration

    await db.run(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [token, expiryISO, user.id]
    );

    const host = req.get('host');
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
    const resetUrl = `${baseUrl}/reset-password.html?token=${token}`;

    console.log(`🔑 PASSWORD RESET LINK for ${user.email}: ${resetUrl}`);
    await sendPasswordResetEmail(user.email, resetUrl);

    res.json({
      message: 'If an account exists with that email address, a password reset link has been sent.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error processing forgot password request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const db = getDB();
    const user = await db.get('SELECT id, email, reset_token_expiry FROM users WHERE reset_token = ?', [token]);
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    // Check expiration
    if (user.reset_token_expiry && new Date(user.reset_token_expiry).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password and clear reset token
    await db.run(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [passwordHash, user.id]
    );

    res.json({ message: 'Password reset successful! You may now sign in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error resetting password' });
  }
});

module.exports = router;
