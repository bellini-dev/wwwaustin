/**
 * Geocode an address/place to lat/lng using OpenStreetMap Nominatim (free, no API key).
 * Appends ", Austin, TX" so business names and partial addresses pin correctly in Austin.
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

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const query = buildSearchQuery(address);
  if (!query) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=5&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'WWW-Austin-Events-App (contact@example.com)' },
    });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0];
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return { latitude: lat, longitude: lon };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
