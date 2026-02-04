import Constants from 'expo-constants';

const API_PORT = '3001';

/** Production API host (override with EXPO_PUBLIC_API_URL if needed). */
export const PROD_API_BASE_URL = 'https://wwwaustin-production.up.railway.app';

function getApiBaseUrl(): string {
  const envUrl =
    typeof process !== 'undefined' &&
    (process as { env?: { EXPO_PUBLIC_API_URL?: string } }).env?.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  // Production / release build: use Railway host unless EXPO_PUBLIC_API_URL is set
  if (typeof __DEV__ === 'boolean' && !__DEV__) {
    return PROD_API_BASE_URL;
  }

  // Use same host as Metro bundler (local network IP when running on device)
  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost ?? '';
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${API_PORT}`;
    }
  }

  return `http://192.168.1.4:${API_PORT}`;
}

export const API_BASE_URL = getApiBaseUrl();
