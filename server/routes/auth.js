const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').optional().trim().escape(),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

// POST /auth/register
router.post('/register', registerValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password, name } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
      [email, passwordHash, name || null]
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    next(err);
  }
});

// POST /auth/login
router.post('/login', loginValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    const result = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me (optional, for checking token)
router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});

const updateProfileValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required to update profile'),
  body('email').optional().isEmail().normalizeEmail(),
  body('name').optional().trim().escape(),
  body('newPassword').optional().isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

// PUT /auth/me – update profile (email, name, password)
router.put('/me', auth, updateProfileValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { currentPassword, email, name, newPassword } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    let newEmail = user.email;
    let newName = user.name;
    let newPasswordHash = user.password_hash;

    if (email !== undefined) newEmail = email;
    if (name !== undefined) newName = name || null;
    if (newPassword !== undefined && newPassword !== '') {
      newPasswordHash = await bcrypt.hash(newPassword, 10);
    }

    const updateResult = await pool.query(
      'UPDATE users SET email = $1, name = $2, password_hash = $3 WHERE id = $4 RETURNING id, email, name, created_at',
      [newEmail, newName, newPasswordHash, userId]
    );
    const updated = updateResult.rows[0];
    res.json({
      user: { id: updated.id, email: updated.email, name: updated.name },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    next(err);
  }
});

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

// PUT /auth/me/avatar – upload profile picture (base64, max 2 MB)
router.put(
  '/me/avatar',
  express.json({ limit: '3mb' }),
  auth,
  body('image').notEmpty().withMessage('image (base64) is required'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const userId = req.user.id;
      let buf;
      try {
        buf = Buffer.from(req.body.image, 'base64');
      } catch {
        return res.status(400).json({ error: 'Invalid base64 image' });
      }
      if (buf.length > MAX_AVATAR_BYTES) {
        return res.status(400).json({ error: 'Image must be 2 MB or smaller' });
      }
      const contentType = req.body.content_type === 'image/png' ? 'image/png' : 'image/jpeg';
      await pool.query(
        `INSERT INTO profile_pics (user_id, data, content_type, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE SET data = $2, content_type = $3, updated_at = NOW()`,
        [userId, buf, contentType]
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// GET /auth/me/avatar – get current user's profile picture
router.get('/me/avatar', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT data, content_type FROM profile_pics WHERE user_id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).end();
    }
    const row = result.rows[0];
    res.set('Content-Type', row.content_type || 'image/jpeg');
    res.send(row.data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
