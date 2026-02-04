import Constants from 'expo-constants';

const PROD_API_URL = 'https://wwwaustin-production.up.railway.app';

function getApiBaseUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.apiUrl;
  if (fromExtra) return fromExtra;
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  return PROD_API_URL;
}

export const API_BASE_URL = getApiBaseUrl();
