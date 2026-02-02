const express = require('express');
const router = express.Router();

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'WWW-Austin-Server/1.0 (events@example.com)';

/**
 * GET /geocode?q=...
 * Proxies to Nominatim so requests come from the server (avoids 403 from mobile User-Agent).
 * Returns { latitude, longitude } or null.
 */
router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'Missing query parameter q' });
    }
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Referer: 'https://www.openstreetmap.org/',
      },
    });
    if (!response.ok) {
      return res.status(502).json({ error: 'Geocoding service unavailable', status: response.status });
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return res.json(null);
    }
    const first = data[0];
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return res.json(null);
    }
    res.json({ latitude: lat, longitude: lon });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
