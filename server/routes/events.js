const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

const eventValidation = [
  body('what').trim().notEmpty().withMessage('what is required'),
  body('where').trim().notEmpty().withMessage('where is required'),
  body('datetime').isISO8601().withMessage('datetime must be a valid ISO 8601 date'),
  body('free_food').optional().isBoolean(),
  body('free_drinks').optional().isBoolean(),
];

const rsvpValidation = [
  body('status').isIn(['yes', 'maybe']).withMessage('status must be "yes" or "maybe"'),
];

// GET /events – list all events (optional: ?from= & ?to= for date range)
router.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    let query = `
      SELECT e.id, e.what, e."where", e.datetime, e.free_food, e.free_drinks, e.created_at, e.updated_at,
             (SELECT json_agg(json_build_object('user_id', u.id, 'name', u.name, 'status', r.status))
              FROM rsvps r JOIN users u ON r.user_id = u.id WHERE r.event_id = e.id) AS rsvps
      FROM events e
      ORDER BY e.datetime ASC
    `;
    const params = [];
    if (from || to) {
      const conditions = [];
      if (from) {
        params.push(from);
        conditions.push(`e.datetime >= $${params.length}`);
      }
      if (to) {
        params.push(to);
        conditions.push(`e.datetime <= $${params.length}`);
      }
      query = query.replace('ORDER BY', `WHERE ${conditions.join(' AND ')} ORDER BY`);
    }
    const result = await pool.query(query, params);
    const events = result.rows.map((row) => ({
      id: row.id,
      what: row.what,
      where: row.where,
      datetime: row.datetime,
      free_food: row.free_food ?? false,
      free_drinks: row.free_drinks ?? false,
      created_at: row.created_at,
      updated_at: row.updated_at,
      rsvps: row.rsvps?.filter(Boolean) || [],
    }));
    res.json(events);
  } catch (err) {
    next(err);
  }
});

// GET /events/:id – get one event
router.get('/:id', param('id').isUUID(), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id } = req.params;
    const result = await pool.query(
      `SELECT e.id, e.what, e."where", e.datetime, e.free_food, e.free_drinks, e.created_at, e.updated_at,
              (SELECT json_agg(json_build_object('user_id', u.id, 'name', u.name, 'status', r.status))
               FROM rsvps r JOIN users u ON r.user_id = u.id WHERE r.event_id = e.id) AS rsvps
       FROM events e WHERE e.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      what: row.what,
      where: row.where,
      datetime: row.datetime,
      free_food: row.free_food ?? false,
      free_drinks: row.free_drinks ?? false,
      created_at: row.created_at,
      updated_at: row.updated_at,
      rsvps: row.rsvps?.filter(Boolean) || [],
    });
  } catch (err) {
    next(err);
  }
});

// POST /events – create event (auth required)
router.post('/', auth, eventValidation, async (req, res, next) => {
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

// PUT /events/:id – update event (auth required)
router.put('/:id', auth, param('id').isUUID(), eventValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id } = req.params;
    const { what, where, datetime, free_food, free_drinks } = req.body;
    const result = await pool.query(
      `UPDATE events SET what = $1, "where" = $2, datetime = $3,
       free_food = COALESCE($4::boolean, free_food), free_drinks = COALESCE($5::boolean, free_drinks),
       updated_at = NOW()
       WHERE id = $6 RETURNING id, what, "where", datetime, free_food, free_drinks, created_at, updated_at`,
      [what, where, datetime, free_food === undefined ? null : !!free_food, free_drinks === undefined ? null : !!free_drinks, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const row = result.rows[0];
    res.json({ ...row, free_food: row.free_food ?? false, free_drinks: row.free_drinks ?? false });
  } catch (err) {
    next(err);
  }
});

// DELETE /events/:id – delete event (auth required)
router.delete('/:id', auth, param('id').isUUID(), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id } = req.params;
    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /events/:id/rsvp – RSVP yes or maybe (auth required)
router.post('/:id/rsvp', auth, param('id').isUUID(), rsvpValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id: eventId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    await pool.query(
      `INSERT INTO rsvps (user_id, event_id, status) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, event_id) DO UPDATE SET status = $3, created_at = NOW()`,
      [userId, eventId, status]
    );
    const event = await pool.query(
      'SELECT id, what, "where", datetime FROM events WHERE id = $1',
      [eventId]
    );
    if (event.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(201).json({
      event_id: eventId,
      user_id: userId,
      status,
      message: `RSVP ${status} recorded`,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /events/:id/rsvp – remove RSVP (auth required)
router.delete('/:id/rsvp', auth, param('id').isUUID(), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id: eventId } = req.params;
    const userId = req.user.id;
    const result = await pool.query(
      'DELETE FROM rsvps WHERE event_id = $1 AND user_id = $2 RETURNING id',
      [eventId, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'RSVP not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
