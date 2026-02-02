const API_URL = import.meta.env.VITE_API_URL || '';

export async function adminLogin(email, password) {
  const res = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function adminMe(token) {
  const res = await fetch(`${API_URL}/admin/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Invalid token');
  return data;
}

export async function createEvent(token, event) {
  const res = await fetch(`${API_URL}/admin/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(event),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.errors?.[0]?.msg || 'Failed to create event');
  return data;
}

export async function geocodeAddress(address) {
  const q = address.trim() ? `${address.trim()}, Austin, TX` : '';
  if (!q) return null;
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
    { headers: { 'User-Agent': 'WWW-Austin-Admin (contact@example.com)' } }
  );
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const { lat, lon } = data[0];
  return { lat: parseFloat(lat), lng: parseFloat(lon) };
}
