import { useAuthStore } from '../store/useAuthStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * Custom application error containing status code and response payload.
 */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Centralized fetch wrapper that:
 * 1. Resolves relative endpoints against API_BASE.
 * 2. Injects the Bearer token from useAuthStore if present.
 * 3. Automatically handles 401 Unauthorized responses by logging the user out.
 * 4. Parses JSON error messages and returns parsed data or throws ApiError.
 *
 * @param {string} endpoint - API path (e.g. '/players_history' or full URL)
 * @param {RequestInit} [options={}] - Standard fetch options
 * @returns {Promise<any>}
 */
export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});

  // Default to application/json for non-FormData payloads
  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject Bearer token if available
  const token = useAuthStore.getState().token;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(url, config);

  if (response.status === 401) {
    // If we received 401 Unauthorized and were logged in, trigger logout
    if (useAuthStore.getState().isAuthenticated) {
      useAuthStore.getState().logout();
    }
  }

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    let errorData = null;

    try {
      errorData = await response.json();
      if (errorData?.detail) {
        errorDetail = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      } else if (errorData?.message) {
        errorDetail = errorData.message;
      }
    } catch {
      // Response was not JSON
    }

    throw new ApiError(errorDetail, response.status, errorData);
  }

  // For 204 No Content
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}
