const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'AdminMasterJwtSecret_2026_Key_Production_Secure!';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(403).json({ error: 'Forbidden: Super Admin authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden: Invalid or expired admin session token' });
    }
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Forbidden: Exclusive Super Admin privileges required' });
    }
    req.user = user;
    next();
  });
}

module.exports = {
  authenticateToken,
  requireAdminAuth,
  authorizeAdmin: requireAdminAuth,
  JWT_SECRET
};
