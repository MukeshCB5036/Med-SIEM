const PRIMARY_URL = 'http://172.25.91.185:8000/api/v1';
const EMULATOR_URL = 'http://10.0.2.2:8000/api/v1';
const LOCALHOST_URL = 'http://localhost:8000/api/v1';

function formatErrorMessage(error: any, defaultMsg: string): string {
  if (!error) return defaultMsg;
  const msg = typeof error === 'string' ? error : error.message || '';
  if (msg.includes('Abort') || msg.includes('timeout') || msg.includes('Network request failed')) {
    return 'Unable to reach MedSIEM server. Please check network connection.';
  }
  return msg || defaultMsg;
}

async function fetchWithFallback(endpoint: string, options: RequestInit): Promise<Response> {
  const urls = [PRIMARY_URL, EMULATOR_URL, LOCALHOST_URL];
  let lastError: any = null;

  for (const baseUrl of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return res;
    } catch (err: any) {
      console.log(`[API FAIL ${baseUrl}${endpoint}]: ${err.message}`);
      lastError = err;
    }
  }
  throw lastError || new Error('All candidate API endpoints failed');
}

export const apiService = {
  async post(endpoint: string, payload: any) {
    console.log(`[API POST] ${endpoint}`);
    try {
      const token = tokenStorage.getToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetchWithFallback(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || `Server error (${response.status})` };
      }
      return data;
    } catch (e: any) {
      console.log(`[API POST FAIL] ${endpoint}: ${e.message}`);
      return { success: false, error: formatErrorMessage(e, 'Authentication Error') };
    }
  },

  async get(endpoint: string) {
    console.log(`[API GET] ${endpoint}`);
    try {
      const token = tokenStorage.getToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetchWithFallback(endpoint, {
        method: 'GET',
        headers
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || data.detail || `Server error (${response.status})` };
      }
      return data;
    } catch (e: any) {
      console.log(`[API GET FAIL] ${endpoint}: ${e.message}`);
      return { success: false, error: formatErrorMessage(e, 'Network Error') };
    }
  },

  async patch(endpoint: string, payload: any = {}) {
    console.log(`[API PATCH] ${endpoint}`);
    try {
      const token = tokenStorage.getToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetchWithFallback(endpoint, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || data.detail || `Server error (${response.status})` };
      }
      return data;
    } catch (e: any) {
      console.log(`[API PATCH FAIL] ${endpoint}: ${e.message}`);
      return { success: false, error: formatErrorMessage(e, 'Update Error') };
    }
  },

  async delete(endpoint: string) {
    console.log(`[API DELETE] ${endpoint}`);
    try {
      const token = tokenStorage.getToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetchWithFallback(endpoint, {
        method: 'DELETE',
        headers
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || data.detail || `Server error (${response.status})` };
      }
      return data;
    } catch (e: any) {
      console.log(`[API DELETE FAIL] ${endpoint}: ${e.message}`);
      return { success: false, error: formatErrorMessage(e, 'Delete Error') };
    }
  }
};

export const tokenStorage = {
  token: null as string | null,
  setToken(t: string) { this.token = t; },
  getToken() { return this.token; }
};
