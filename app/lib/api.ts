import { Buffer } from 'buffer';
import { API_BASE_URL } from '@/constants/api';

export type Event = {
  id: string;
  category?: string | null;
  what: string;
  where: string;
  when?: string | null;
  datetime: string;
  free_food?: boolean;
  free_drinks?: boolean;
  free_entry?: boolean;
  event_link?: string | null;
  image_url?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
  rsvps?: { user_id: string; name: string | null; status: 'interested' }[];
};

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...init } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed: ${res.status}`);
  }
  return data as T;
}

export async function getEvents(
  token?: string,
  options?: { limit?: number; offset?: number }
): Promise<Event[]> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return api<Event[]>(`/events?${q}`, { token });
}

/** Events the current user is interested in (requires auth). */
export async function getInterestedEvents(token: string): Promise<Event[]> {
  return api<Event[]>('/events?interested=me&limit=200', { token });
}

export async function getEvent(id: string, token?: string): Promise<Event> {
  return api<Event>(`/events/${id}`, { token });
}

export async function rsvpEvent(eventId: string, token: string): Promise<unknown> {
  return api(`/events/${eventId}/rsvp`, {
    method: 'POST',
    body: JSON.stringify({ status: 'interested' }),
    token,
  });
}

export async function removeRsvp(eventId: string, token: string): Promise<void> {
  await api(`/events/${eventId}/rsvp`, { method: 'DELETE', token });
}

/** Fetch a user's avatar and return as data URI, or null if none / error. */
export async function getAvatarDataUri(userId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/users/${userId}/avatar`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get('Content-Type') || 'image/jpeg';
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}
