import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAdminUsers, getAdminUserAvatarBlob } from '../api';

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
  table: { width: '100%', borderCollapse: 'collapse' },
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
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    objectFit: 'cover',
    background: '#e2e8f0',
  },
  rowLink: {
    color: '#0066ff',
    fontWeight: 600,
    textDecoration: 'none',
  },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 16 },
  loading: { padding: 24, textAlign: 'center', color: '#5c6b7a' },
  empty: { padding: 24, textAlign: 'center', color: '#5c6b7a' },
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function UserAvatar({ token, userId, hasAvatar, style }) {
  const [src, setSrc] = useState(null);
  const urlRef = useRef(null);
  useEffect(() => {
    if (!token || !userId || !hasAvatar) {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      setSrc(null);
      return;
    }
    let cancelled = false;
    getAdminUserAvatarBlob(token, userId).then((blob) => {
      if (cancelled || !blob) return;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(blob);
      setSrc(urlRef.current);
    });
    return () => {
      cancelled = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      setSrc(null);
    };
  }, [token, userId, hasAvatar]);
  if (!hasAvatar) return <div style={{ ...styles.avatar, ...style }} />;
  if (!src) return <div style={{ ...styles.avatar, ...style }} />;
  return <img src={src} alt="" style={{ ...styles.avatar, ...style }} />;
}

export default function UsersPage() {
  const { token, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await getAdminUsers(token);
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Users</h1>
        <div>
          <Link to="/" style={styles.link}>
            Events
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
        <div style={styles.loading}>Loading users…</div>
      ) : users.length === 0 ? (
        <div style={styles.empty}>No users yet.</div>
      ) : (
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}></th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Joined</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={styles.td}>
                    <UserAvatar token={token} userId={user.id} hasAvatar={user.has_avatar} />
                  </td>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}>{user.name || '—'}</td>
                  <td style={styles.td}>{formatDate(user.created_at)}</td>
                  <td style={styles.td}>
                    <Link to={`/users/${user.id}/edit`} style={styles.rowLink}>
                      Edit
                    </Link>
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
