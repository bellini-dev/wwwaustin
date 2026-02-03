/**
 * Geocode an address/place to lat/lng using OpenStreetMap Nominatim (free, no API key).
 * Appends ", Austin, TX" so business names and partial addresses pin correctly in Austin.
 * q param is always encoded; User-Agent "postman" is required for Nominatim to accept the request.
 */
export type GeocodeResult = { latitude: number; longitude: number } | null;

const DEFAULT_REGION = ', Austin, TX';

function buildSearchQuery(address: string): string {
  const q = address.trim();
  if (!q) return '';
  const lower = q.toLowerCase();
  if (lower.includes('austin') || lower.includes(', tx') || lower.endsWith('texas')) {
    return q;
  }
  return `${q}${DEFAULT_REGION}`;
}

const GEOCODE_TIMEOUT_MS = 5000;
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

const DEBUG_GEOCODE = __DEV__;

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const query = buildSearchQuery(address);
  if (DEBUG_GEOCODE) {
    console.log('[Geocode] input:', address?.trim() || '(empty)');
    console.log('[Geocode] query:', query || '(empty, returning null)');
  }
  if (!query) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
  const qEncoded = encodeURIComponent(query);
  const url = `${NOMINATIM_BASE}?q=${qEncoded}&format=jsonv2&limit=5`;
  console.log('[Geocode] lookup URL:', url);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'postman' },
      redirect: 'follow',
      signal: controller.signal,
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
    const first = data[0];
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      if (DEBUG_GEOCODE) console.log('[Geocode] invalid lat/lon:', first);
      return null;
    }
    if (DEBUG_GEOCODE) console.log('[Geocode] result:', { lat, lon, display_name: first.display_name });
    return { latitude: lat, longitude: lon };
  } catch (err) {
    if (DEBUG_GEOCODE) console.log('[Geocode] error:', err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
