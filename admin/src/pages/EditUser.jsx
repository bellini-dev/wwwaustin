import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getAdminUser,
  getAdminUserAvatarBlob,
  updateAdminUser,
  updateAdminUserAvatar,
} from '../api';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const styles = {
  page: {
    minHeight: '100vh',
    padding: 24,
    maxWidth: 560,
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
  label: { display: 'block', fontSize: 14, fontWeight: 600, color: '#0d1b2a', marginBottom: 8 },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    fontSize: 16,
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    marginBottom: 16,
  },
  avatarSection: { marginTop: 24, marginBottom: 16 },
  avatarPreview: {
    width: 96,
    height: 96,
    borderRadius: '50%',
    objectFit: 'cover',
    background: '#e2e8f0',
    marginBottom: 12,
  },
  fileInput: { marginBottom: 8, fontSize: 14 },
  hint: { fontSize: 12, color: '#5c6b7a', marginTop: 4 },
  saveBtn: {
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
  saveBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 16 },
  loading: { padding: 24, textAlign: 'center', color: '#5c6b7a' },
};

function dataUrlToBase64(dataUrl) {
  const i = dataUrl.indexOf(',');
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

function resizeImage(file, maxBytes) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      const scale = Math.min(1, Math.sqrt(maxBytes / (w * h * 0.5)) || 1);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      let quality = 0.9;
      const tryExport = () => {
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size <= maxBytes) {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            } else if (quality > 0.3) {
              quality -= 0.1;
              tryExport();
            } else {
              reject(new Error('Image too large'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      tryExport();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export default function EditUserPage() {
  const { token } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadUser = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError('');
    try {
      const u = await getAdminUser(token, id);
      setUser(u);
      setEmail(u.email);
      setName(u.name || '');
      const blob = await getAdminUserAvatarBlob(token, id);
      if (blob) setAvatarUrl(URL.createObjectURL(blob));
      else setAvatarUrl(null);
      setAvatarFile(null);
    } catch (err) {
      setError(err.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    return () => {
      if (avatarUrl) URL.revokeObjectURL(avatarUrl);
    };
  }, [avatarUrl]);

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token || !id || saving) return;
    setSaving(true);
    setError('');
    try {
      await updateAdminUser(token, id, { email, name });
      if (avatarFile) {
        const dataUrl = await resizeImage(avatarFile, MAX_AVATAR_BYTES);
        const base64 = dataUrlToBase64(dataUrl);
        await updateAdminUserAvatar(token, id, {
          image: base64,
          content_type: avatarFile.type === 'image/png' ? 'image/png' : 'image/jpeg',
        });
      }
      navigate('/users');
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>Loading user…</div>
      </div>
    );
  }
  if (!user) {
    return (
      <div style={styles.page}>
        <div style={styles.error}>User not found.</div>
        <Link to="/users" style={styles.link}>
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Edit user</h1>
        <Link to="/users" style={styles.link}>
          Back to Users
        </Link>
      </header>

      <form onSubmit={handleSubmit} style={styles.card}>
        {error && <div style={styles.error}>{error}</div>}

        <label style={styles.label}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />

        <label style={styles.label}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Optional"
          style={styles.input}
        />

        <div style={styles.avatarSection}>
          <label style={styles.label}>Profile picture</label>
          {avatarUrl && (
            <img src={avatarUrl} alt="Avatar" style={styles.avatarPreview} />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileChange}
            style={styles.fileInput}
          />
          <div style={styles.hint}>Max 2 MB. Will be resized if needed.</div>
        </div>

        <button
          type="submit"
          style={{
            ...styles.saveBtn,
            ...(saving ? styles.saveBtnDisabled : {}),
          }}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}
