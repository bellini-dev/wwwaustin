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
  body('free_entry').optional().isBoolean(),
  body('event_link').optional().trim(),
  body('when').optional().trim(),
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
      `SELECT e.id, e.what, e."where", e."when", e.datetime, e.free_food, e.free_drinks, e.free_entry, e.event_link, e.created_at, e.updated_at,
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
        when: row.when ?? null,
        datetime: row.datetime,
        free_food: row.free_food ?? false,
        free_drinks: row.free_drinks ?? false,
        free_entry: row.free_entry ?? false,
        event_link: row.event_link ?? null,
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
    const { what, where, when: whenText, datetime, free_food, free_drinks, free_entry, event_link } = req.body;
    const result = await pool.query(
      `INSERT INTO events (what, "where", "when", datetime, free_food, free_drinks, free_entry, event_link) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, what, "where", "when", datetime, free_food, free_drinks, free_entry, event_link, created_at, updated_at`,
      [what, where, (whenText && whenText.trim()) || null, datetime, !!free_food, !!free_drinks, !!free_entry, (event_link && event_link.trim()) || null]
    );
    const row = result.rows[0];
    res.status(201).json({ ...row, when: row.when ?? null, free_food: row.free_food ?? false, free_drinks: row.free_drinks ?? false, free_entry: row.free_entry ?? false, event_link: row.event_link ?? null });
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
    const { what, where, when: whenText, datetime, free_food, free_drinks, free_entry, event_link } = req.body;
    const result = await pool.query(
      `UPDATE events SET what = $1, "where" = $2, "when" = $3, datetime = $4,
       free_food = COALESCE($5::boolean, free_food), free_drinks = COALESCE($6::boolean, free_drinks),
       free_entry = COALESCE($7::boolean, free_entry), event_link = $8, updated_at = NOW() WHERE id = $9
       RETURNING id, what, "where", "when", datetime, free_food, free_drinks, free_entry, event_link, created_at, updated_at`,
      [what, where, whenText != null ? (String(whenText).trim() || null) : undefined, datetime, free_food === undefined ? null : !!free_food, free_drinks === undefined ? null : !!free_drinks, free_entry === undefined ? null : !!free_entry, (event_link != null && String(event_link).trim() !== '' ? String(event_link).trim() : null), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    const row = result.rows[0];
    res.json({ ...row, when: row.when ?? null, free_food: row.free_food ?? false, free_drinks: row.free_drinks ?? false, free_entry: row.free_entry ?? false, event_link: row.event_link ?? null });
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

// --- User management (for testing) ---

// GET /admin/users – list app users (admin only)
router.get('/users', adminAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.created_at,
              EXISTS (SELECT 1 FROM profile_pics p WHERE p.user_id = u.id) AS has_avatar
       FROM users u ORDER BY u.created_at DESC`
    );
    res.json(
      result.rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name ?? '',
        created_at: r.created_at,
        has_avatar: !!r.has_avatar,
      }))
    );
  } catch (err) {
    next(err);
  }
});

// GET /admin/users/:id – get one user (admin only)
router.get('/users/:id', adminAuth, param('id').isUUID(), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const result = await pool.query(
      `SELECT id, email, name, created_at,
              EXISTS (SELECT 1 FROM profile_pics p WHERE p.user_id = users.id) AS has_avatar
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const r = result.rows[0];
    res.json({
      id: r.id,
      email: r.email,
      name: r.name ?? '',
      created_at: r.created_at,
      has_avatar: !!r.has_avatar,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /admin/users/:id – update user email/name (admin only)
router.put(
  '/users/:id',
  adminAuth,
  param('id').isUUID(),
  body('email').isEmail().normalizeEmail(),
  body('name').optional().trim(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { id } = req.params;
      const { email, name } = req.body;
      const result = await pool.query(
        `UPDATE users SET email = $1, name = COALESCE(NULLIF(TRIM($2), ''), name)
         WHERE id = $3
         RETURNING id, email, name, created_at`,
        [email, name ?? null, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      const r = result.rows[0];
      res.json({ id: r.id, email: r.email, name: r.name ?? '', created_at: r.created_at });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
      next(err);
    }
  }
);

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

// PUT /admin/users/:id/avatar – set user profile picture (admin only, base64, max 2 MB)
router.put(
  '/users/:id/avatar',
  express.json({ limit: '3mb' }),
  adminAuth,
  param('id').isUUID(),
  body('image').notEmpty().withMessage('image (base64) is required'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const userId = req.params.id;
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
      const exists = await pool.query('SELECT 1 FROM users WHERE id = $1', [userId]);
      if (exists.rows.length === 0) return res.status(404).json({ error: 'User not found' });
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

// GET /admin/users/:id/avatar – get user profile picture (admin only)
router.get('/users/:id/avatar', adminAuth, param('id').isUUID(), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const result = await pool.query(
      'SELECT data, content_type FROM profile_pics WHERE user_id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).end();
    const row = result.rows[0];
    res.set('Content-Type', row.content_type || 'image/jpeg');
    res.send(row.data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
