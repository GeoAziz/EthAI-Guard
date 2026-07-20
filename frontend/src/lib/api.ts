import axios, { type AxiosRequestConfig, type AxiosResponse, type CancelTokenSource } from 'axios';
import { auth } from './firebase';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Centralized API client with standardized error handling and auth
 *
 * Response Format (via backend responseWrapper):
 * Success: { status: 'success', data: T, metadata: {...} }
 * Error: { status: 'error', error: { code, message, details? }, metadata: {...} }
 */
const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/**
 * Request interceptor: Attach Firebase ID token to all requests
 * This is the PRIMARY auth mechanism. Backend validates Firebase token
 * and issues JWT if needed for specific endpoints.
 */
api.interceptors.request.use(async (config) => {
  try {
    if (typeof window !== 'undefined' && auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken && config.headers) {
        config.headers.Authorization = `Bearer ${idToken}`;
      }
    }
  } catch (err) {
    // If token fetch fails, continue without auth header
    // (request will fail at backend with 401)
    console.warn('Failed to attach auth token', err);
  }

  return config;
});

/**
 * Response interceptor: Handle 401s and standardized error format
 */
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (val?: AxiosRequestConfig | undefined) => void;
  reject: (err: any) => void;
  originalConfig: AxiosRequestConfig | any;
}> = [];

function processQueue(error: any, config?: AxiosRequestConfig) {
  refreshQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      p.resolve(config);
    }
  });
  refreshQueue = [];
}

api.interceptors.response.use(
  (response: AxiosResponse<any>) => {
    // Response wrapper ensures format: { status: 'success', data: T }
    // Extract data so consumers get the actual payload
    if (response.data?.status === 'success' && response.data?.data !== undefined) {
      return {
        ...response,
        data: response.data.data,
      };
    }
    return response;
  },
  async (err) => {
    const originalConfig = err.config;
    const response = err.response;

    // Retry on transient failures (500, 502, 503) with exponential backoff
    if ([500, 502, 503].includes(response?.status) && !originalConfig?._retryCount) {
      originalConfig._retryCount = (originalConfig._retryCount || 0) + 1;
      if (originalConfig._retryCount <= 3) {
        await sleep(Math.pow(2, originalConfig._retryCount) * 1000);
        return api.request(originalConfig);
      }
    }

    // Handle 401 Unauthorized - Firebase token likely expired
    if (response?.status === 401 && !originalConfig?._retry) {
      originalConfig._retry = true;

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise<AxiosRequestConfig | undefined>((resolve, reject) => {
          refreshQueue.push({ resolve, reject, originalConfig });
        }).then((cfg) => api.request(cfg as AxiosRequestConfig));
      }

      isRefreshing = true;

      try {
        // Attempt to refresh Firebase ID token by getting a fresh one
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true); // Force refresh
          const newToken = await auth.currentUser.getIdToken();

          if (newToken && originalConfig.headers) {
            originalConfig.headers.Authorization = `Bearer ${newToken}`;
          }

          processQueue(null, originalConfig);
          isRefreshing = false;

          // Retry original request with new token
          return api.request(originalConfig);
        }
      } catch (refreshErr) {
        // Token refresh failed - sign out user and redirect to login
        processQueue(refreshErr, undefined);
        isRefreshing = false;

        try {
          await auth.signOut();
        } catch (e) {
          // ignore signout errors
        }

        // Redirect to login with reason if in browser
        if (typeof window !== 'undefined') {
          window.location.href = '/login?reason=session_expired';
        }

        return Promise.reject(refreshErr);
      }
    }

    // Handle standardized error format from response wrapper
    if (response?.data?.status === 'error' && response?.data?.error) {
      const stdError = response.data.error;
      const apiError = new Error(stdError.message || 'An error occurred') as any;
      apiError.code = stdError.code;
      apiError.statusCode = response.status;
      apiError.details = stdError.details;
      apiError.originalError = err;

      return Promise.reject(apiError);
    }

    // Fallback error handling for responses without wrapper
    const statusCode = response?.status || err.code;
    const fallbackError = new Error(
      response?.data?.message ||
      err.message ||
      'An error occurred',
    ) as any;
    fallbackError.statusCode = statusCode;
    fallbackError.originalError = err;

    return Promise.reject(fallbackError);
  },
);

export default api;

export function createCancelToken() {
  return axios.CancelToken.source();
}

export function isCancel(err: unknown): boolean {
  return axios.isCancel(err);
}
