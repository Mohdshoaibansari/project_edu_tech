import { apiClient } from '@/shared/api/client';

export interface LoginRequest {
  email: string;
  password?: string;
  supertokens_token?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  tenant_id: string;
  permissions: string[];
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: UserProfile;
}

export const AuthApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<{ data: AuthResponse }>('/auth/login', data);
    return res.data.data;
  },

  refresh: async (): Promise<AuthResponse> => {
    const res = await apiClient.post<{ data: AuthResponse }>('/auth/refresh');
    return res.data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  me: async (): Promise<UserProfile> => {
    const res = await apiClient.get<{ data: UserProfile }>('/auth/me');
    return res.data.data;
  },
};
