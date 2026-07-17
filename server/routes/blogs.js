const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpg, jpeg, png, gif, webp) are allowed'));
  }
});

// Helper to optionally resolve user from JWT (for anonymous but personalized views)
function getOptionalUser(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// Get all blogs (optionally filter by stream)
router.get('/', async (req, res) => {
  const { stream } = req.query;
  try {
    const db = getDB();
    let blogs;
    if (stream && stream !== 'All') {
      blogs = await db.all(
        `SELECT b.*, u.username as author_name, 
          (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as likes_count
         FROM blogs b
         JOIN users u ON b.author_id = u.id
         WHERE b.stream = ?
         ORDER BY b.created_at DESC`,
        [stream]
      );
    } else {
      blogs = await db.all(
        `SELECT b.*, u.username as author_name, 
          (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as likes_count
         FROM blogs b
         JOIN users u ON b.author_id = u.id
         ORDER BY b.created_at DESC`
      );
    }
    res.json({ blogs });
  } catch (err) {
    console.error('Fetch blogs error:', err);
    res.status(500).json({ error: 'Server error fetching blogs' });
  }
});

// Get single blog
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const user = getOptionalUser(req);
  try {
    const db = getDB();
    const blog = await db.get(
      `SELECT b.*, u.username as author_name, u.email as author_email,
        (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as likes_count
       FROM blogs b
       JOIN users u ON b.author_id = u.id
       WHERE b.id = ?`,
      [id]
    );

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    let isLiked = false;
    if (user) {
      const likeRecord = await db.get(
        'SELECT 1 FROM likes WHERE user_id = ? AND blog_id = ?',
        [user.id, id]
      );
      isLiked = !!likeRecord;
    }

    res.json({ blog, isLiked });
  } catch (err) {
    console.error('Fetch blog error:', err);
    res.status(500).json({ error: 'Server error fetching blog details' });
  }
});

// Create new blog (Requires Auth and File Upload)
router.post('/', authenticateToken, upload.single('cover_image'), async (req, res) => {
  const { title, content, stream } = req.body;
  if (!title || !content || !stream) {
    return res.status(400).json({ error: 'Title, content, and stream are required' });
  }

  const allowedStreams = ['Technology', 'Medical', 'Science', 'Entertainment', 'Trending', 'Business'];
  if (!allowedStreams.includes(stream)) {
    return res.status(400).json({ error: `Invalid stream. Must be one of: ${allowedStreams.join(', ')}` });
  }

  const coverImagePath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const db = getDB();
    const result = await db.run(
      'INSERT INTO blogs (title, content, cover_image_path, stream, author_id) VALUES (?, ?, ?, ?, ?)',
      [title, content, coverImagePath, stream, req.user.id]
    );

    const blogId = result.lastID;
    res.status(201).json({
      message: 'Blog created successfully',
      blogId
    });
  } catch (err) {
    console.error('Create blog error:', err);
    res.status(500).json({ error: 'Server error creating blog' });
  }
});

// Toggle Like
router.post('/:id/like', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const db = getDB();
    
    // Check if blog exists
    const blog = await db.get('SELECT id FROM blogs WHERE id = ?', [id]);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Check if already liked
    const existingLike = await db.get(
      'SELECT id FROM likes WHERE user_id = ? AND blog_id = ?',
      [userId, id]
    );

    let liked = false;
    if (existingLike) {
      await db.run('DELETE FROM likes WHERE id = ?', [existingLike.id]);
    } else {
      await db.run(
        'INSERT INTO likes (user_id, blog_id) VALUES (?, ?)',
        [userId, id]
      );
      liked = true;
    }

    // Get updated like count
    const { count } = await db.get(
      'SELECT COUNT(*) as count FROM likes WHERE blog_id = ?',
      [id]
    );

    res.json({ liked, likesCount: count });
  } catch (err) {
    console.error('Toggle like error:', err);
    res.status(500).json({ error: 'Server error toggling like' });
  }
});

// Get 3 related blogs from same stream (excluding current one)
router.get('/:id/related', async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDB();
    const currentBlog = await db.get('SELECT stream FROM blogs WHERE id = ?', [id]);
    if (!currentBlog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    const related = await db.all(
      `SELECT b.*, u.username as author_name,
        (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as likes_count
       FROM blogs b
       JOIN users u ON b.author_id = u.id
       WHERE b.stream = ? AND b.id != ?
       ORDER BY RANDOM() LIMIT 3`,
      [currentBlog.stream, id]
    );

    res.json({ related });
  } catch (err) {
    console.error('Fetch related error:', err);
    res.status(500).json({ error: 'Server error fetching related blogs' });
  }
});

module.exports = router;
