import { API_BASE_URL } from '@/constants/api';

export type Event = {
  id: string;
  what: string;
  where: string;
  datetime: string;
  free_food?: boolean;
  free_drinks?: boolean;
  created_at: string;
  updated_at: string;
  rsvps?: { user_id: string; name: string | null; status: 'yes' | 'maybe' }[];
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

export async function getEvents(token?: string): Promise<Event[]> {
  return api<Event[]>('/events', { token });
}

export async function getEvent(id: string, token?: string): Promise<Event> {
  return api<Event>(`/events/${id}`, { token });
}

export async function rsvpEvent(
  eventId: string,
  status: 'yes' | 'maybe',
  token: string
): Promise<unknown> {
  return api(`/events/${eventId}/rsvp`, {
    method: 'POST',
    body: JSON.stringify({ status }),
    token,
  });
}

export async function removeRsvp(eventId: string, token: string): Promise<void> {
  await api(`/events/${eventId}/rsvp`, { method: 'DELETE', token });
}
