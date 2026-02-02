import { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { createEvent, geocodeAddress } from '../api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng], 15);
  }, [center, map]);
  return null;
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: 24,
    maxWidth: 900,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: 700, color: '#0d1b2a' },
  logout: {
    fontSize: 14,
    color: '#0066ff',
    fontWeight: 600,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#5c6b7a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 16,
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    marginBottom: 16,
  },
  row: { display: 'flex', gap: 16, marginBottom: 16 },
  half: { flex: 1 },
  checkboxRow: {
    display: 'flex',
    gap: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: { width: 18, height: 18, cursor: 'pointer' },
  mapWrap: {
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    marginTop: 16,
  },
  button: {
    padding: '12px 24px',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    background: '#0066ff',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    marginTop: 8,
  },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 16 },
  success: { color: '#10b981', fontSize: 14, marginBottom: 16 },
};

const AUSTIN_CENTER = { lat: 30.2672, lng: -97.7431 };

export default function CreateEventPage() {
  const { token, logout } = useAuth();
  const [what, setWhat] = useState('');
  const [where, setWhere] = useState('');
  const [datetime, setDatetime] = useState('');
  const [freeFood, setFreeFood] = useState(false);
  const [freeDrinks, setFreeDrinks] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const [marker, setMarker] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);

  const previewOnMap = useCallback(async () => {
    if (!where.trim()) return;
    setMapLoading(true);
    setError('');
    try {
      const coords = await geocodeAddress(where);
      if (coords) {
        setMapCenter(coords);
        setMarker(coords);
      } else {
        setError('Address not found. Try including "Austin, TX".');
      }
    } catch {
      setError('Could not find address on map.');
    } finally {
      setMapLoading(false);
    }
  }, [where]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!what.trim() || !where.trim() || !datetime) {
      setError('What, Where, and Date/time are required.');
      return;
    }
    setLoading(true);
    try {
      await createEvent(token, {
        what: what.trim(),
        where: where.trim(),
        datetime: new Date(datetime).toISOString(),
        free_food: freeFood,
        free_drinks: freeDrinks,
      });
      setSuccess('Event created.');
      setWhat('');
      setWhere('');
      setDatetime('');
      setFreeFood(false);
      setFreeDrinks(false);
      setMapCenter(null);
      setMarker(null);
    } catch (err) {
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Create Event</h1>
        <button type="button" style={styles.logout} onClick={logout}>
          Log out
        </button>
      </header>

      <div style={styles.card}>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>What</label>
          <input
            type="text"
            placeholder="Event name / description"
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>Where (address)</label>
          <div style={styles.row}>
            <input
              type="text"
              placeholder="e.g. Jo's Coffee, 1300 South Congress"
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              style={{ ...styles.input, marginBottom: 0 }}
            />
            <button type="button" onClick={previewOnMap} disabled={mapLoading} style={styles.button}>
              {mapLoading ? 'Looking up…' : 'Preview on map'}
            </button>
          </div>

          <label style={styles.label}>Map — confirm address</label>
          <div style={styles.mapWrap}>
            <MapContainer
              center={mapCenter || AUSTIN_CENTER}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom
            >
              <MapUpdater center={mapCenter} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {marker && <Marker position={[marker.lat, marker.lng]}><Popup>{where}</Popup></Marker>}
            </MapContainer>
          </div>

          <label style={styles.label}>Date & time</label>
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            style={styles.input}
            required
          />

          <div style={styles.checkboxRow}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={freeFood} onChange={(e) => setFreeFood(e.target.checked)} style={styles.checkbox} />
              🍕 Free food
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={freeDrinks} onChange={(e) => setFreeDrinks(e.target.checked)} style={styles.checkbox} />
              🍺 Free drinks
            </label>
          </div>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Creating…' : 'Create event'}
          </button>
        </form>
      </div>
    </div>
  );
}
