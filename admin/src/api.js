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

const DEBUG_GEOCODE = import.meta.env.DEV;

export async function geocodeAddress(address) {
  const q = address.trim() ? `${address.trim()}, Austin, TX` : '';
  if (DEBUG_GEOCODE) {
    console.log('[Geocode] input:', address?.trim() || '(empty)');
    console.log('[Geocode] query:', q || '(empty, returning null)');
  }
  if (!q) return null;
  const qEncoded = encodeURIComponent(q);
  const url = `https://nominatim.openstreetmap.org/search?q=${qEncoded}&format=jsonv2&limit=1`;
  if (DEBUG_GEOCODE) console.log('[Geocode] url:', url);
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': 'postman' },
    redirect: 'follow',
  });
  if (DEBUG_GEOCODE) console.log('[Geocode] status:', res.status);
  if (!res.ok) {
    if (DEBUG_GEOCODE) console.log('[Geocode] HTTP error', res.status);
    return null;
  }
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    if (DEBUG_GEOCODE) console.log('[Geocode] no results');
    return null;
  }
  const { lat, lon, display_name } = data[0];
  const result = { lat: parseFloat(lat), lng: parseFloat(lon) };
  if (DEBUG_GEOCODE) console.log('[Geocode] result:', result, 'display_name:', display_name);
  return result;
}
