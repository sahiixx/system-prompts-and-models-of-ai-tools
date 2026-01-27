import api from './api';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  ForgotPasswordData,
  ResetPasswordData,
  ChangePasswordData,
  User,
} from '@/types/auth';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', credentials);
    return response.data;
  },

  async getMe(): Promise<{ success: boolean; user: User }> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async updateProfile(data: Partial<User>): Promise<{ success: boolean; user: User }> {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const response = await api.get(`/auth/verify/${token}`);
    return response.data;
  },

  async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  async forgotPassword(data: ForgotPasswordData): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },

  async resetPassword(
    token: string,
    data: ResetPasswordData
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/auth/reset-password/${token}`, {
      password: data.password,
    });
    return response.data;
  },

  async changePassword(data: ChangePasswordData): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },
};
