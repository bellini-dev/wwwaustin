export const API_URL = process.env.API_URL;

function getApiBaseUrl(): string {
  return API_URL;
}

export const API_BASE_URL = getApiBaseUrl();
