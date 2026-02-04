import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAdminEvents, deleteEvent } from '../api';

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
  logout: {
    fontSize: 14,
    color: '#0066ff',
    fontWeight: 600,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    marginLeft: 16,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 8px',
    fontSize: 12,
    fontWeight: 600,
    color: '#5c6b7a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottom: '2px solid #e2e8f0',
  },
  td: {
    padding: '12px 8px',
    fontSize: 14,
    color: '#0d1b2a',
    borderBottom: '1px solid #e2e8f0',
  },
  deleteBtn: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    background: '#dc2626',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  deleteBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  createBtn: {
    display: 'inline-block',
    padding: '12px 24px',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    background: '#0066ff',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    textDecoration: 'none',
    marginBottom: 24,
  },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 16 },
  loading: { padding: 24, textAlign: 'center', color: '#5c6b7a' },
  empty: { padding: 24, textAlign: 'center', color: '#5c6b7a' },
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function EventListPage() {
  const { token, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchEvents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await getAdminEvents(token);
      setEvents(data);
    } catch (err) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDelete = async (eventId) => {
    if (!token || deletingId) return;
    setDeletingId(eventId);
    setError('');
    try {
      await deleteEvent(token, eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      setError(err.message || 'Failed to delete event');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Events</h1>
        <div>
          <Link to="/users" style={styles.link}>
            Users
          </Link>
          <Link to="/create" style={{ ...styles.link, marginLeft: 16 }}>
            Create event
          </Link>
          <button type="button" style={styles.logout} onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.loading}>Loading events…</div>
      ) : events.length === 0 ? (
        <div style={styles.empty}>No events yet. Create one to get started.</div>
      ) : (
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>What</th>
                <th style={styles.th}>Where</th>
                <th style={styles.th}>When</th>
                <th style={styles.th}>Interested</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td style={styles.td}>{event.what}</td>
                  <td style={styles.td}>{event.where}</td>
                  <td style={styles.td}>{formatDate(event.datetime)}</td>
                  <td style={styles.td}>{event.interestedCount ?? 0}</td>
                  <td style={styles.td}>
                    <Link to={`/events/${event.id}/edit`} style={{ ...styles.link, marginRight: 12 }}>
                      Edit
                    </Link>
                    <button
                      type="button"
                      style={{
                        ...styles.deleteBtn,
                        ...(deletingId === event.id ? styles.deleteBtnDisabled : {}),
                      }}
                      onClick={() => handleDelete(event.id)}
                      disabled={deletingId === event.id}
                    >
                      {deletingId === event.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
