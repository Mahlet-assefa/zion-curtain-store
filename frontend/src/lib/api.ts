const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function autoLogin(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@zioncurtains.com', password: 'zion-demo-password' })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token && typeof window !== 'undefined') {
        localStorage.setItem('token', data.token);
        return data.token;
      }
    }
  } catch {
    // Ignore auto login errors
  }
  return null;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {})
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    // Attempt automatic re-authentication if token missing or expired
    const newToken = await autoLogin();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${API_URL}${path}`, { ...options, headers });
    }
  }

  if (!response.ok) {
    let msg = 'Request failed';
    try {
      const err = await response.json();
      msg = err.message || msg;
    } catch {
      // fallback
    }
    throw new Error(msg);
  }
  return response.json();
}

export async function downloadFile(path: string, defaultFilename: string): Promise<void> {
  let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_URL}${path}`, { headers });
  if (response.status === 401) {
    const newToken = await autoLogin();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${API_URL}${path}`, { headers });
    }
  }

  if (!response.ok) {
    throw new Error('Failed to download file');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export { API_URL };
