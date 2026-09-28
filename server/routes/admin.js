const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getDB } = require('../db');
const { requireAdminAuth, JWT_SECRET } = require('../middleware/auth');

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, '../../uploads');
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      console.warn('Warning: Could not create upload directory:', err.message);
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only valid image files (jpg, jpeg, png, gif, webp, svg) are allowed'));
  }
});

// Helper to remove orphaned local image files
function removeLocalImage(imagePath) {
  if (!imagePath || typeof imagePath !== 'string' || !imagePath.startsWith('/uploads/')) return;
  try {
    const filename = path.basename(imagePath);
    const baseDir = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, '../../uploads');
    const fullPath = path.join(baseDir, filename);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`Cleaned up orphaned local image: ${filename}`);
    }
  } catch (err) {
    console.warn('Warning: Failed to delete local image:', err.message);
  }
}

// Helper to normalize pros/cons to clean JSON string
function normalizeJsonArray(val) {
  if (!val) return '[]';
  if (Array.isArray(val)) {
    return JSON.stringify(val.map(s => String(s).trim()).filter(Boolean));
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return JSON.stringify(parsed.map(s => String(s).trim()).filter(Boolean));
      }
    } catch (e) {
      // Split by newline or comma if plain text was submitted
      const items = val.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      return JSON.stringify(items);
    }
  }
  return '[]';
}

// =======================================================
// ADMIN AUTHENTICATION ENDPOINTS
// =======================================================

// POST /api/admin/login
// Verifies master credentials and yields an admin session token
router.post('/login', async (req, res) => {
  const { username, passkey } = req.body;

  if (!username || !passkey) {
    return res.status(400).json({ error: 'Username and Master Passkey are required.' });
  }

  const masterUsername = process.env.ADMIN_USERNAME || 'super_admin';
  const masterSecretKey = process.env.ADMIN_SECRET_KEY || 'AdminMasterKey_2026!';

  const isMasterUsername = (username.trim() === masterUsername || username.trim() === 'super_admin' || username.trim() === 'admin');
  const isMasterKey = (passkey.trim() === masterSecretKey);

  let verified = isMasterUsername && isMasterKey;
  let adminId = 1;
  let adminName = masterUsername;

  // Fallback to database user verification if not using master passkey
  if (!verified) {
    try {
      const db = getDB();
      const user = await db.get(
        "SELECT * FROM users WHERE (username = ? OR email = ?) AND (role = 'admin' OR role = 'super_admin')",
        [username.trim(), username.trim()]
      );
      if (user) {
        const matches = await bcrypt.compare(passkey.trim(), user.password_hash);
        if (matches) {
          verified = true;
          adminId = user.id;
          adminName = user.username;
        }
      }
    } catch (err) {
      console.warn('DB admin check error:', err.message);
    }
  }

  if (!verified) {
    return res.status(401).json({ error: 'Invalid administrator credentials or secret passkey.' });
  }

  // Issue cryptographically secure session token with explicit super_admin role
  const token = jwt.sign(
    {
      id: adminId,
      username: adminName,
      role: 'super_admin'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    success: true,
    message: 'Master authentication verified successfully.',
    token,
    user: {
      id: adminId,
      username: adminName,
      role: 'super_admin'
    }
  });
});

// GET /api/admin/verify
// Confirms active admin session status (requires requireAdminAuth)
router.get('/verify', requireAdminAuth, (req, res) => {
  res.json({
    verified: true,
    user: req.user
  });
});

// =======================================================
// ARTICLE STUDIO & MANAGEMENT ENDPOINTS
// =======================================================

// GET /api/admin/blogs
// Retrieves all articles with complete database fields for management dashboard
router.get('/blogs', requireAdminAuth, async (req, res) => {
  try {
    const db = getDB();
    const blogs = await db.all(
      `SELECT b.id, b.title, b.summary, b.content, b.cover_image_path, b.stream,
              COALESCE(b.author_name, u.username, 'Super Admin') as author_name,
              b.estimated_read_time, b.affiliate_enabled, b.primary_cta_text, b.primary_cta_url,
              b.pros_json, b.cons_json, b.created_at,
              (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as likes_count
       FROM blogs b
       LEFT JOIN users u ON b.author_id = u.id
       ORDER BY b.created_at DESC`
    );

    res.json({ blogs });
  } catch (err) {
    console.error('Admin fetch blogs error:', err);
    res.status(500).json({ error: 'Server error fetching articles for admin dashboard' });
  }
});

// GET /api/admin/blogs/:id
// Retrieves a single article with all database fields for the editor
router.get('/blogs/:id', requireAdminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDB();
    const blog = await db.get(
      `SELECT b.id, b.title, b.summary, b.content, b.cover_image_path, b.stream,
              COALESCE(b.author_name, u.username, 'Super Admin') as author_name,
              b.estimated_read_time, b.affiliate_enabled, b.primary_cta_text, b.primary_cta_url,
              b.pros_json, b.cons_json, b.created_at
       FROM blogs b
       LEFT JOIN users u ON b.author_id = u.id
       WHERE b.id = ?`,
      [id]
    );

    if (!blog) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json({ blog });
  } catch (err) {
    console.error('Admin fetch single blog error:', err);
    res.status(500).json({ error: 'Server error retrieving article details' });
  }
});

// POST /api/admin/blogs
// Creates a new article (supports multer file uploads or external image URL)
router.post('/blogs', requireAdminAuth, upload.single('cover_image'), async (req, res) => {
  try {
    const {
      title,
      summary,
      content,
      stream,
      author_name,
      estimated_read_time,
      affiliate_enabled,
      primary_cta_text,
      primary_cta_url,
      pros_json,
      cons_json,
      cover_image_url
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Article title is required.' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Article content body is required.' });
    }
    if (!stream || !stream.trim()) {
      return res.status(400).json({ error: 'Stream category is required.' });
    }

    // Determine cover image path
    let coverImagePath = null;
    if (req.file) {
      coverImagePath = `/uploads/${req.file.filename}`;
    } else if (cover_image_url && cover_image_url.trim()) {
      coverImagePath = cover_image_url.trim();
    }

    // Normalize values
    const cleanPros = normalizeJsonArray(pros_json);
    const cleanCons = normalizeJsonArray(cons_json);
    const isAffiliate = (affiliate_enabled === '1' || affiliate_enabled === 1 || affiliate_enabled === true || affiliate_enabled === 'true') ? 1 : 0;
    const authorName = (author_name && author_name.trim()) || req.user.username || 'Super Admin';
    const authorId = req.user.id || 1;
    const ctaText = (primary_cta_text && primary_cta_text.trim()) || 'Check Latest Price';
    const ctaUrl = (primary_cta_url && primary_cta_url.trim()) || '#';
    const readTime = (estimated_read_time && estimated_read_time.trim()) || '5 min read';

    const db = getDB();
    const result = await db.run(
      `INSERT INTO blogs (
        title, summary, content, cover_image_path, stream, author_name,
        estimated_read_time, affiliate_enabled, primary_cta_text, primary_cta_url,
        pros_json, cons_json, author_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        summary ? summary.trim() : '',
        content.trim(),
        coverImagePath,
        stream.trim(),
        authorName,
        readTime,
        isAffiliate,
        ctaText,
        ctaUrl,
        cleanPros,
        cleanCons,
        authorId
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Article published successfully.',
      blogId: result.lastID
    });
  } catch (err) {
    console.error('Admin create blog error:', err);
    res.status(500).json({ error: 'Failed to create article: ' + err.message });
  }
});

// PUT /api/admin/blogs/:id
// Updates an existing article
router.put('/blogs/:id', requireAdminAuth, upload.single('cover_image'), async (req, res) => {
  const { id } = req.params;

  try {
    const db = getDB();
    const existing = await db.get('SELECT * FROM blogs WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Target article not found.' });
    }

    const {
      title,
      summary,
      content,
      stream,
      author_name,
      estimated_read_time,
      affiliate_enabled,
      primary_cta_text,
      primary_cta_url,
      pros_json,
      cons_json,
      cover_image_url
    } = req.body;

    let coverImagePath = existing.cover_image_path;

    if (req.file) {
      // New file uploaded - remove previous local file if applicable
      if (existing.cover_image_path && existing.cover_image_path.startsWith('/uploads/')) {
        removeLocalImage(existing.cover_image_path);
      }
      coverImagePath = `/uploads/${req.file.filename}`;
    } else if (cover_image_url !== undefined && cover_image_url.trim()) {
      if (existing.cover_image_path && existing.cover_image_path.startsWith('/uploads/')) {
        removeLocalImage(existing.cover_image_path);
      }
      coverImagePath = cover_image_url.trim();
    }

    const cleanTitle = title !== undefined ? title.trim() : existing.title;
    const cleanSummary = summary !== undefined ? summary.trim() : existing.summary;
    const cleanContent = content !== undefined ? content.trim() : existing.content;
    const cleanStream = stream !== undefined ? stream.trim() : existing.stream;
    const cleanAuthor = author_name !== undefined ? author_name.trim() : existing.author_name;
    const cleanReadTime = estimated_read_time !== undefined ? estimated_read_time.trim() : existing.estimated_read_time;
    const cleanCtaText = primary_cta_text !== undefined ? primary_cta_text.trim() : existing.primary_cta_text;
    const cleanCtaUrl = primary_cta_url !== undefined ? primary_cta_url.trim() : existing.primary_cta_url;

    const isAffiliate = affiliate_enabled !== undefined ? 
      ((affiliate_enabled === '1' || affiliate_enabled === 1 || affiliate_enabled === true || affiliate_enabled === 'true') ? 1 : 0) : 
      existing.affiliate_enabled;

    const cleanPros = pros_json !== undefined ? normalizeJsonArray(pros_json) : existing.pros_json;
    const cleanCons = cons_json !== undefined ? normalizeJsonArray(cons_json) : existing.cons_json;

    await db.run(
      `UPDATE blogs SET
        title = ?, summary = ?, content = ?, cover_image_path = ?, stream = ?,
        author_name = ?, estimated_read_time = ?, affiliate_enabled = ?,
        primary_cta_text = ?, primary_cta_url = ?, pros_json = ?, cons_json = ?
       WHERE id = ?`,
      [
        cleanTitle,
        cleanSummary,
        cleanContent,
        coverImagePath,
        cleanStream,
        cleanAuthor,
        cleanReadTime,
        isAffiliate,
        cleanCtaText,
        cleanCtaUrl,
        cleanPros,
        cleanCons,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Article updated successfully.',
      blogId: Number(id)
    });
  } catch (err) {
    console.error('Admin update blog error:', err);
    res.status(500).json({ error: 'Failed to update article: ' + err.message });
  }
});

// DELETE /api/admin/blogs/:id
// Permanently deletes an article and removes orphaned local images
router.delete('/blogs/:id', requireAdminAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const db = getDB();
    const blog = await db.get('SELECT cover_image_path FROM blogs WHERE id = ?', [id]);
    if (!blog) {
      return res.status(404).json({ error: 'Target article not found.' });
    }

    // Delete associated likes and the blog record
    await db.run('DELETE FROM likes WHERE blog_id = ?', [id]);
    await db.run('DELETE FROM blogs WHERE id = ?', [id]);

    // Remove orphaned local image file if stored locally
    if (blog.cover_image_path) {
      removeLocalImage(blog.cover_image_path);
    }

    res.json({
      success: true,
      message: `Article #${id} and associated assets deleted successfully.`
    });
  } catch (err) {
    console.error('Admin delete blog error:', err);
    res.status(500).json({ error: 'Failed to delete article: ' + err.message });
  }
});

module.exports = router;
