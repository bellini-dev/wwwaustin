import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAdminEvent, updateEvent, uploadEventImage } from '../api';

function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  link: {
    fontSize: 14,
    color: '#0066ff',
    fontWeight: 600,
    textDecoration: 'none',
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
  checkboxRow: {
    display: 'flex',
    gap: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: { width: 18, height: 18, cursor: 'pointer' },
  imagePreview: {
    maxWidth: '100%',
    maxHeight: 240,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
    objectFit: 'contain',
    background: '#f3f4f6',
  },
  uploadBtn: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    color: '#0066ff',
    background: '#fff',
    border: '1px solid #0066ff',
    borderRadius: 10,
    cursor: 'pointer',
    marginBottom: 16,
  },
  uploadBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
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
  buttonDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 16 },
  success: { color: '#10b981', fontSize: 14, marginBottom: 16 },
  loading: { padding: 24, textAlign: 'center', color: '#5c6b7a' },
};

export default function EditEventPage() {
  const { token } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [what, setWhat] = useState('');
  const [where, setWhere] = useState('');
  const [whenText, setWhenText] = useState('');
  const [datetime, setDatetime] = useState('');
  const [freeFood, setFreeFood] = useState(false);
  const [freeDrinks, setFreeDrinks] = useState(false);
  const [freeEntry, setFreeEntry] = useState(false);
  const [eventLink, setEventLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');

  const loadEvent = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getAdminEvent(token, id);
      setEvent(data);
      setWhat(data.what ?? '');
      setWhere(data.where ?? '');
      setWhenText(data.when?.trim() ?? '');
      setDatetime(toDatetimeLocal(data.datetime));
      setFreeFood(data.free_food ?? false);
      setFreeDrinks(data.free_drinks ?? false);
      setFreeEntry(data.free_entry ?? false);
      setEventLink(data.event_link?.trim() ?? '');
      setImageUrl(data.image_url?.trim() ?? '');
      setDescription(data.description?.trim() ?? '');
    } catch (err) {
      setError(err.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const handleFileSelect = useCallback(
    (e) => {
      const file = e.target?.files?.[0];
      if (!file || !token) return;
      setUploading(true);
      setError('');
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = typeof dataUrl === 'string' && dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        const contentType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        uploadEventImage(token, base64, contentType)
          .then(({ url }) => {
            setImageUrl(url);
            setSuccess('Image uploaded. Save the event to keep it.');
            setTimeout(() => setSuccess(''), 3000);
          })
          .catch((err) => setError(err.message || 'Upload failed'))
          .finally(() => setUploading(false));
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [token]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!token || !id || !what.trim() || !where.trim() || !datetime) {
      setError('What, Where, and Date & time are required.');
      return;
    }
    setSaving(true);
    try {
      await updateEvent(token, id, {
        what: what.trim(),
        where: where.trim(),
        when: whenText.trim() || undefined,
        datetime: new Date(datetime).toISOString(),
        free_food: freeFood,
        free_drinks: freeDrinks,
        free_entry: freeEntry,
        event_link: eventLink.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        description: description.trim() || undefined,
      });
      setSuccess('Event updated.');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err.message || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>Loading event…</div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div style={styles.page}>
        <div style={styles.error}>{error}</div>
        <Link to="/" style={styles.link}>
          Back to Events
        </Link>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Edit event</h1>
        <Link to="/" style={styles.link}>
          Back to Events
        </Link>
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

          <label style={styles.label}>Where</label>
          <input
            type="text"
            placeholder="Address or venue"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>When (optional)</label>
          <input
            type="text"
            placeholder="e.g. Feb 1–3, or leave blank to use date & time below"
            value={whenText}
            onChange={(e) => setWhenText(e.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>Date & time</label>
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            style={styles.input}
            required
          />

          <label style={styles.label}>Event link (optional)</label>
          <input
            type="url"
            placeholder="https://..."
            value={eventLink}
            onChange={(e) => setEventLink(e.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>Event image</label>
          {imageUrl ? (
            <img src={imageUrl} alt="Event" style={styles.imagePreview} />
          ) : null}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
            style={{ display: 'none', marginBottom: 16 }}
            id="edit-event-image"
          />
          <label htmlFor="edit-event-image" style={{ display: 'inline-block', marginTop: 8 }}>
            <span
              style={{
                ...styles.uploadBtn,
                ...(uploading ? styles.uploadBtnDisabled : {}),
              }}
              role="button"
            >
              {uploading ? 'Uploading…' : imageUrl ? 'Replace image' : 'Upload image'}
            </span>
          </label>
          <div style={{ fontSize: 12, color: '#5c6b7a', marginBottom: 16, marginTop: 16 }}>
            Uploads to Cloudinary and sets the URL on this event when you save.
          </div>

          <label style={styles.label}>Description (optional)</label>
          <textarea
            placeholder="Event description for the feed card"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...styles.input, minHeight: 80 }}
            rows={4}
          />

          <div style={styles.checkboxRow}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={freeFood} onChange={(e) => setFreeFood(e.target.checked)} style={styles.checkbox} />
              Free food
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={freeDrinks} onChange={(e) => setFreeDrinks(e.target.checked)} style={styles.checkbox} />
              Free drinks
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={freeEntry} onChange={(e) => setFreeEntry(e.target.checked)} style={styles.checkbox} />
              Free entry
            </label>
          </div>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}
          <button type="submit" style={{ ...styles.button, ...(saving ? styles.buttonDisabled : {}) }} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
