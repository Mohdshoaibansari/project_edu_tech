'use client';

/**
 * Centralized API client — Axios instance with JWT interceptor,
 * global error handling, and tenant context.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useToastStore } from '@/shared/components/Toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // cookies for refresh token
});

// ============================================================================
// Request interceptor — attach JWT + tenant ID
// ============================================================================
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ============================================================================
// Response interceptor — global error handling
// ============================================================================
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: { code?: string; message?: string } }>) => {
    if (typeof window === 'undefined') return Promise.reject(error);

    const code = error.response?.data?.error?.code;
    const message = error.response?.data?.error?.message ?? 'An unexpected error occurred';

    switch (error.response?.status) {
      case 401: {
        // Try token refresh once
        try {
          const { data } = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {},
            { withCredentials: true },
          );
          if (data?.data?.access_token) {
            localStorage.setItem('access_token', data.data.access_token);
            // Retry original request
            if (error.config) {
              error.config.headers.Authorization = `Bearer ${data.data.access_token}`;
              return apiClient(error.config);
            }
          }
        } catch {
          localStorage.removeItem('access_token');
          // AuthProvider already handles redirect to /login via router.replace.
          // Avoid window.location.href to prevent an infinite reload loop.
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
        break;
      }
      case 403: {
        if (code === 'TENANT_ACCESS_DENIED') {
          useToastStore.getState().addToast({
            title: 'Access Denied',
            description: 'You do not have access to this tenant.',
            variant: 'error',
          });
        }
        break;
      }
      case 404:
        // Silently handle — callers should handle this
        break;
      case 429: {
        useToastStore.getState().addToast({
          title: 'Too Many Requests',
          description: message,
          variant: 'warning',
        });
        break;
      }
      case 500: {
        useToastStore.getState().addToast({
          title: 'Server Error',
          description: message,
          variant: 'error',
        });
        break;
      }
    }

    return Promise.reject(error);
  },
);

// ============================================================================
// Helper to set tenant context for subsequent requests
// ============================================================================
export function setAccessToken(token: string) {
  localStorage.setItem('access_token', token);
}

export function clearAccessToken() {
  localStorage.removeItem('access_token');
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}
