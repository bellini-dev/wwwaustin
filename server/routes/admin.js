const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { adminAuth } = require('../middleware/adminAuth');

const router = express.Router();

const eventValidation = [
  body('what').trim().notEmpty().withMessage('what is required'),
  body('where').trim().notEmpty().withMessage('where is required'),
  body('datetime').isISO8601().withMessage('datetime must be a valid ISO 8601 date'),
  body('free_food').optional().isBoolean(),
  body('free_drinks').optional().isBoolean(),
];

// POST /admin/login – admin only, no signup
router.post('/login', body('email').isEmail().normalizeEmail(), body('password').notEmpty(), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;
    const result = await pool.query(
      'SELECT id, email, password_hash FROM admin_users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { adminId: admin.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ admin: { id: admin.id, email: admin.email }, token });
  } catch (err) {
    next(err);
  }
});

// GET /admin/me – require admin auth
router.get('/me', adminAuth, (req, res) => {
  res.json({ admin: req.admin });
});

// POST /admin/events – create event (admin only)
router.post('/events', adminAuth, eventValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { what, where, datetime, free_food, free_drinks } = req.body;
    const result = await pool.query(
      `INSERT INTO events (what, "where", datetime, free_food, free_drinks) VALUES ($1, $2, $3, $4, $5)
       RETURNING id, what, "where", datetime, free_food, free_drinks, created_at, updated_at`,
      [what, where, datetime, !!free_food, !!free_drinks]
    );
    const row = result.rows[0];
    res.status(201).json({ ...row, free_food: row.free_food ?? false, free_drinks: row.free_drinks ?? false });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
