import axios, { type AxiosRequestConfig } from 'axios';
import { auth } from './firebase';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const COOKIE_MODE = process.env.NEXT_PUBLIC_USE_COOKIE_REFRESH === '1';

// When using HttpOnly cookie-based sessions, ensure axios sends credentials
// and avoid persisting backend tokens in localStorage. In non-cookie mode
// we preserve the previous behavior for backwards compatibility.
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: COOKIE_MODE,
});

// Helper to set backend access token (used after exchange)
export function setBackendAccessToken(token: string | null) {
  if (COOKIE_MODE) {
    // In cookie mode we do not persist access tokens client-side. Still
    // allow temporarily setting an Authorization header for immediate
    // retries (e.g. after a refresh) by updating defaults, but do not
    // write to localStorage.
    if (token) {api.defaults.headers.common['Authorization'] = `Bearer ${token}`;}
    else {delete api.defaults.headers.common['Authorization'];}
    return;
  }

  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

// Helper to set backend refresh token in localStorage (and remove on null)
export function setBackendRefreshToken(token: string | null) {
  if (COOKIE_MODE) {
    // refresh token is stored as an HttpOnly cookie in cookie mode
    return;
  }
  try {
    if (token) {localStorage.setItem('backend_refresh_token', token);}
    else {localStorage.removeItem('backend_refresh_token');}
  } catch (e) {
    // ignore storage errors
  }
}

// Attach backend JWT if present, otherwise attach Firebase ID token
api.interceptors.request.use((config) => {
  // If not using cookie mode, prefer stored backend token then fallback to
  // Firebase ID token. When using cookie-based sessions we do not attach
  // a backend Authorization header (cookies are sent automatically). We
  // still attach a Firebase ID token when available to endpoints that may
  // require it (for initial exchange flows) but avoid doing so for every
  // request since cookies should be authoritative.
  if (!COOKIE_MODE) {
    try {
      if (typeof window !== 'undefined') {
        const backend = localStorage.getItem('backend_access_token');
        if (backend) {
          if (config?.headers) {config.headers.Authorization = `Bearer ${backend}`;}
          return config;
        }
      }
    } catch (e) {
      // ignore localStorage errors
    }
  }

  // fallback to Firebase ID token for authenticated users
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && auth.currentUser) {
      auth.currentUser.getIdToken()
        .then((token) => {
          if (config?.headers && token) {
            // Only set ID token if there's not already an Authorization header
            if (!config.headers.Authorization) {config.headers.Authorization = `Bearer ${token}`;}
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

// Response interceptor: on 401, try to refresh the access token using stored backend_refresh_token
let isRefreshing = false;
let refreshQueue: Array<{ resolve: (val?: AxiosRequestConfig | undefined) => void; reject: (err: any) => void; originalConfig: AxiosRequestConfig | any }> = [];

function processQueue(error: any, token: string | null = null) {
  refreshQueue.forEach(p => {
    if (error) {p.reject(error);}
    else {
      if (token && p.originalConfig && p.originalConfig.headers) {p.originalConfig.headers['Authorization'] = `Bearer ${token}`;}
      p.resolve(p.originalConfig);
    }
  });
  refreshQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalConfig = err.config;
    if (!originalConfig) {return Promise.reject(err);}

    // If the request already attempted a refresh, fail
    if (err.response && err.response.status === 401 && !originalConfig._retry) {
      originalConfig._retry = true;

      try {
        // In cookie mode, rely on HttpOnly refresh cookie; otherwise use
        // stored refresh token in localStorage.
        const refreshToken = COOKIE_MODE ? null : (typeof window !== 'undefined' ? localStorage.getItem('backend_refresh_token') : null);
        if (!COOKIE_MODE && !refreshToken) {
          // Nothing to do, clear tokens and sign out of Firebase to force a full re-login
          try { localStorage.removeItem('backend_access_token'); } catch (e) {}
          try { localStorage.removeItem('backend_refresh_token'); } catch (e) {}
          setBackendAccessToken(null);
          if (auth && auth.signOut) {auth.signOut().catch(() => {});}
          return Promise.reject(err);
        }

        if (isRefreshing) {
          // Queue this request until refresh completes
          return new Promise<AxiosRequestConfig | undefined>((resolve, reject) => {
            refreshQueue.push({ resolve, reject, originalConfig });
          }).then((cfg) => api.request(cfg as AxiosRequestConfig));
        }

        isRefreshing = true;

        // Call backend refresh endpoint. If COOKIE_MODE is active the refresh
        // cookie will be sent automatically (withCredentials) and no body is needed.
        const resp = COOKIE_MODE ? await api.post('/auth/refresh') : await api.post('/auth/refresh', { refreshToken });
        const newAccess = resp.data?.accessToken || resp.data?.access_token;
        const newRefresh = resp.data?.refreshToken || resp.data?.refresh_token;

        if (!COOKIE_MODE) {
          if (newAccess) {
            try { localStorage.setItem('backend_access_token', newAccess); } catch (e) {}
            setBackendAccessToken(newAccess);
          }
          if (newRefresh) {
            try { localStorage.setItem('backend_refresh_token', newRefresh); } catch (e) {}
          }
        } else {
          // In cookie mode, backend manages refresh cookie. For the current
          // in-flight request, attach received access token as an Authorization
          // header so the retry succeeds (backend may not always set accessToken cookie).
          if (newAccess && originalConfig.headers) {originalConfig.headers['Authorization'] = `Bearer ${newAccess}`;}
          // Also set default Authorization briefly to help other retry attempts
          if (newAccess) {setBackendAccessToken(newAccess);}
        }

        processQueue(null, newAccess || null);
        isRefreshing = false;

        // Retry original request with new token
        if (newAccess && originalConfig.headers) {originalConfig.headers['Authorization'] = `Bearer ${newAccess}`;}
        return api.request(originalConfig);
      } catch (refreshErr) {
        isRefreshing = false;
        processQueue(refreshErr, null);
        // On refresh failure, clear tokens and sign out
        try { localStorage.removeItem('backend_access_token'); } catch (e) {}
        try { localStorage.removeItem('backend_refresh_token'); } catch (e) {}
        setBackendAccessToken(null);
        if (auth && auth.signOut) {auth.signOut().catch(() => {});}
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  },
);

export default api;
