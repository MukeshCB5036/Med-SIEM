const API_BASE_URL = 'http://10.0.2.2:8000/api/v1';

function formatErrorMessage(error: any, defaultMsg: string): string {
  if (!error) return defaultMsg;
  const msg = typeof error === 'string' ? error : error.message || '';
  if (msg.includes('Abort') || msg.includes('timeout') || msg.includes('Network request failed')) {
    return 'Unable to reach MedSIEM server. Please check network connection.';
  }
  return msg || defaultMsg;
}

export const apiService = {
  async post(endpoint: string, payload: any) {
    console.log(`[API POST] ${endpoint}`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || `Server error (${response.status})` };
      }
      return data;
    } catch (e: any) {
      console.log(`[API GET FAIL] ${endpoint}: ${e.message}`);
      return { success: false, error: formatErrorMessage(e, 'Network Error') };
    }
  }
};

export const tokenStorage = {
  token: null as string | null,
  setToken(t: string) { this.token = t; },
  getToken() { return this.token; }
};
