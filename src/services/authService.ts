import { request } from './http';
import type { TokenResponse, User } from '../types/api';

export const authService = {
  /** POST /auth/login expects OAuth2 form fields; "username" carries the email address. */
  login: (email: string, password: string) =>
    request<TokenResponse>('/auth/login', { method: 'POST', form: { username: email.trim(), password }, auth: false }),

  /** POST /auth/register always creates a buyer. Sellers are promoted after an admin approves their store. */
  register: (input: { full_name: string; email: string; phone?: string; password: string }) =>
    request<TokenResponse>('/auth/register', {
      method: 'POST',
      json: { ...input, email: input.email.trim(), phone: input.phone?.trim() || undefined },
      auth: false,
    }),

  /** Always succeeds with a generic message so account existence is never revealed. The reset link opens the website. */
  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', { method: 'POST', json: { email: email.trim() }, auth: false }),

  /** The server verifies the Google ID token itself and signs the person in, or creates the account. */
  google: (idToken: string) => request<TokenResponse>('/auth/google', { method: 'POST', json: { id_token: idToken }, auth: false }),
  me: () => request<User>('/auth/me'),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
};
