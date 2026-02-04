require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const eventsRoutes = require('./routes/events');
const adminRoutes = require('./routes/admin');
const geocodeRoutes = require('./routes/geocode');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`${ts} [${req.method}] ${req.originalUrl || req.path}`);
  next();
});

app.use('/auth', authRoutes);
app.use('/events', eventsRoutes);
app.use('/admin', adminRoutes);
app.use('/geocode', geocodeRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('(Requests will log above. If you see no logs when using the app, the app may be using a different API URL—check EXPO_PUBLIC_API_URL.)');
});
