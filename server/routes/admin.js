const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, param, validationResult } = require('express-validator');
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

// GET /admin/events – list events with interested count (admin only)
router.get('/events', adminAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT e.id, e.what, e."where", e.datetime, e.free_food, e.free_drinks, e.created_at, e.updated_at,
              (SELECT json_agg(json_build_object('user_id', u.id, 'name', u.name, 'status', r.status))
               FROM rsvps r JOIN users u ON r.user_id = u.id WHERE r.event_id = e.id) AS rsvps
       FROM events e ORDER BY e.datetime ASC`
    );
    const events = result.rows.map((row) => {
      const rsvps = row.rsvps?.filter(Boolean) || [];
      const interestedCount = rsvps.filter((r) => r.status === 'interested').length;
      return {
        id: row.id,
        what: row.what,
        where: row.where,
        datetime: row.datetime,
        free_food: row.free_food ?? false,
        free_drinks: row.free_drinks ?? false,
        created_at: row.created_at,
        updated_at: row.updated_at,
        rsvps,
        interestedCount,
      };
    });
    res.json(events);
  } catch (err) {
    next(err);
  }
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

// PUT /admin/events/:id – update event (admin only)
router.put('/events/:id', adminAuth, param('id').isUUID(), eventValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id } = req.params;
    const { what, where, datetime, free_food, free_drinks } = req.body;
    const result = await pool.query(
      `UPDATE events SET what = $1, "where" = $2, datetime = $3,
       free_food = COALESCE($4::boolean, free_food), free_drinks = COALESCE($5::boolean, free_drinks),
       updated_at = NOW() WHERE id = $6
       RETURNING id, what, "where", datetime, free_food, free_drinks, created_at, updated_at`,
      [what, where, datetime, free_food === undefined ? null : !!free_food, free_drinks === undefined ? null : !!free_drinks, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    const row = result.rows[0];
    res.json({ ...row, free_food: row.free_food ?? false, free_drinks: row.free_drinks ?? false });
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/events/:id – delete event (admin only)
router.delete('/events/:id', adminAuth, param('id').isUUID(), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id } = req.params;
    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
