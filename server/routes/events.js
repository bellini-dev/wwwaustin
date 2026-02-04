const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const rsvpValidation = [
  body('status').isIn(['interested']).withMessage('status must be "interested"'),
];

// GET /events – list events (optional: ?from= & ?to= date range; ?limit= & ?offset= for pagination; ?interested=me with auth = only events user is interested in)
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { from, to, limit: limitParam, offset: offsetParam, interested } = req.query;
    // Support array from some clients: ?interested=me or interested as array
    const interestedVal = Array.isArray(interested) ? interested[0] : interested;
    const interestedMe = String(interestedVal || '').toLowerCase() === 'me';

    const limit = Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(offsetParam, 10) || 0, 0);

    // Debug: what did we receive (remove or reduce in production)
    console.log('[GET /events] query:', JSON.stringify(req.query), '| interestedMe:', interestedMe, '| hasUser:', !!req.user);

    if (interestedMe) {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      console.log('[GET /events] filtering by RSVPs for user', req.user.id);
    }
    let query = `
      SELECT e.id, e.what, e."where", e."when", e.datetime, e.free_food, e.free_drinks, e.free_entry, e.event_link, e.image_url, e.description, e.created_at, e.updated_at,
             (SELECT json_agg(json_build_object('user_id', u.id, 'name', u.name, 'status', r.status))
              FROM rsvps r JOIN users u ON r.user_id = u.id WHERE r.event_id = e.id) AS rsvps
      FROM events e
    `;
    const params = [];
    const conditions = [];
    if (interestedMe) {
      params.push(req.user.id);
      conditions.push(`EXISTS (SELECT 1 FROM rsvps r WHERE r.event_id = e.id AND r.user_id = $${params.length})`);
    }
    if (from || to) {
      if (from) {
        params.push(from);
        conditions.push(`e.datetime >= $${params.length}`);
      }
      if (to) {
        params.push(to);
        conditions.push(`e.datetime <= $${params.length}`);
      }
    }
    if (conditions.length) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ` ORDER BY e.datetime ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
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
      image_url: row.image_url ?? null,
      description: row.description ?? null,
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
      `SELECT e.id, e.what, e."where", e."when", e.datetime, e.free_food, e.free_drinks, e.free_entry, e.event_link, e.image_url, e.description, e.created_at, e.updated_at,
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
      image_url: row.image_url ?? null,
      description: row.description ?? null,
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
