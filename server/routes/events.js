const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

const rsvpValidation = [
  body('status').isIn(['interested']).withMessage('status must be "interested"'),
];

// GET /events – list all events (optional: ?from= & ?to= for date range)
router.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    let query = `
      SELECT e.id, e.what, e."where", e."when", e.datetime, e.free_food, e.free_drinks, e.free_entry, e.event_link, e.created_at, e.updated_at,
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
      when: row.when ?? null,
      datetime: row.datetime,
      free_food: row.free_food ?? false,
      free_drinks: row.free_drinks ?? false,
      free_entry: row.free_entry ?? false,
      event_link: row.event_link ?? null,
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
      `SELECT e.id, e.what, e."where", e."when", e.datetime, e.free_food, e.free_drinks, e.free_entry, e.event_link, e.created_at, e.updated_at,
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
      when: row.when ?? null,
      datetime: row.datetime,
      free_food: row.free_food ?? false,
      free_drinks: row.free_drinks ?? false,
      free_entry: row.free_entry ?? false,
      event_link: row.event_link ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      rsvps: row.rsvps?.filter(Boolean) || [],
    });
  } catch (err) {
    next(err);
  }
});

// POST /events/:id/rsvp – RSVP interested (auth required)
router.post('/:id/rsvp', auth, param('id').isUUID(), rsvpValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id: eventId } = req.params;
    const userId = req.user.id;
    await pool.query(
      `INSERT INTO rsvps (user_id, event_id, status) VALUES ($1, $2, 'interested')
       ON CONFLICT (user_id, event_id) DO UPDATE SET status = 'interested', created_at = NOW()`,
      [userId, eventId]
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
      status: 'interested',
      message: 'RSVP interested recorded',
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
