const PROD_API_URL = 'https://wwwaustin-production.up.railway.app';
const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === 'production' ? PROD_API_URL : 'http://localhost:3001');

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

export async function getAdminEvents(token) {
  const res = await fetch(`${API_URL}/admin/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load events');
  return data;
}

export async function getAdminEvent(token, eventId) {
  const res = await fetch(`${API_URL}/admin/events/${eventId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load event');
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

export async function updateEvent(token, eventId, event) {
  const res = await fetch(`${API_URL}/admin/events/${eventId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(event),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.errors?.[0]?.msg || 'Failed to update event');
  return data;
}

export async function deleteEvent(token, eventId) {
  const res = await fetch(`${API_URL}/admin/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) return;
  const data = await res.json().catch(() => ({}));
  throw new Error(data.error || 'Failed to delete event');
}

/** Upload event image to Cloudinary; returns { url }. */
export async function uploadEventImage(token, imageBase64, contentType = 'image/jpeg') {
  const res = await fetch(`${API_URL}/admin/upload/event-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ image: imageBase64, content_type: contentType }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to upload image');
  return data;
}

// User management (for testing)
export async function getAdminUsers(token) {
  const res = await fetch(`${API_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load users');
  return data;
}

export async function getAdminUser(token, userId) {
  const res = await fetch(`${API_URL}/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load user');
  return data;
}

export async function updateAdminUser(token, userId, { email, name }) {
  const res = await fetch(`${API_URL}/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email, name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.errors?.[0]?.msg || 'Failed to update user');
  return data;
}

export async function updateAdminUserAvatar(token, userId, { image, content_type }) {
  const res = await fetch(`${API_URL}/admin/users/${userId}/avatar`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ image, content_type: content_type || 'image/jpeg' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update avatar');
  return data;
}

/** Returns blob for the user's avatar, or null if 404. Caller should revoke object URL when done. */
export async function getAdminUserAvatarBlob(token, userId) {
  const res = await fetch(`${API_URL}/admin/users/${userId}/avatar`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load avatar');
  return res.blob();
}

const DEBUG_GEOCODE = import.meta.env.DEV;

export async function geocodeAddress(address) {
  const q = (address && address.trim()) || '';
  if (DEBUG_GEOCODE) {
    console.log('[Geocode] input:', address?.trim() || '(empty)');
    console.log('[Geocode] query:', q || '(empty, returning null)');
  }
  if (!q) return null;
  const qEncoded = encodeURIComponent(q);
  const url = `https://nominatim.openstreetmap.org/search?q=${qEncoded}&format=jsonv2&limit=1`;
  console.log('[Geocode] lookup URL:', url);
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
