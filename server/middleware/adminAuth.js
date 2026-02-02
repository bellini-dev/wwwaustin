const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

async function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.adminId) {
      return res.status(401).json({ error: 'Invalid admin token' });
    }
    const result = await pool.query(
      'SELECT id, email FROM admin_users WHERE id = $1',
      [decoded.adminId]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Admin not found' });
    }
    req.admin = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(err);
  }
}

module.exports = { adminAuth };
