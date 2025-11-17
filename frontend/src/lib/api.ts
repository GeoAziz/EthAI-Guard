import axios from 'axios';
import { auth } from './firebase';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
});

// Attach Firebase ID token automatically
api.interceptors.request.use((config) => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && auth.currentUser) {
      // Get fresh Firebase ID token
      auth.currentUser.getIdToken()
        .then((token) => {
          if (config?.headers && token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          resolve(config);
        })
        .catch((error) => {
          console.error('Error getting ID token:', error);
          resolve(config);
        });
    } else {
      resolve(config);
    }
  });
});

export default api;
