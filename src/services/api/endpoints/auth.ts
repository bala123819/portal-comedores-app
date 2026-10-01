import { api, request } from '../client';
import type { BodyOf } from '../types';

export type LoginBody = BodyOf<'/api/auth/login', 'post'>;
export type ProfileBody = BodyOf<'/api/auth/profile', 'put'>;
/** El OpenAPI no lista `new_password_confirmation`, pero el servidor la exige (docs/bda 2/6). */
export type PasswordBody = BodyOf<'/api/auth/password', 'put'> & { new_password_confirmation: string };

export const authApi = {
  /** Rate limit 10/min. Sin Authorization. */
  login: async (body: LoginBody) =>
    (await request<unknown>('POST', '/auth/login', { body, auth: false })).data,
  logout: async () => (await request<unknown>('POST', '/auth/logout')).data,
  refresh: async () => (await request<unknown>('POST', '/auth/refresh')).data,
  me: () => api.get<unknown>('/auth/me'),
  updateProfile: (body: ProfileBody, key: string) => api.put<unknown>('/auth/profile', body, key),
  changePassword: (body: PasswordBody, key: string) =>
    api.put<unknown>('/auth/password', body, key),
};
