import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 8,
    color: '#0d1b2a',
  },
  subtitle: {
    fontSize: 14,
    color: '#5c6b7a',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 16,
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    marginBottom: 16,
  },
  button: {
    width: '100%',
    padding: 14,
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    background: '#0066ff',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 16,
  },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>WWW Austin Admin</h1>
        <p style={styles.subtitle}>Sign in to create events</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
            autoComplete="current-password"
          />
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
