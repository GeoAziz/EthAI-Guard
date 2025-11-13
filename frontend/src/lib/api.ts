import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
});

// Attach JWT from localStorage automatically
api.interceptors.request.use((config) => {
  try {
    const token = (typeof window !== 'undefined') ? localStorage.getItem('ethixai_token') : null;
    if (token && config?.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore in non-browser contexts
  }
  return config;
});

export default api;
